// Tests whole-program lexing: 4-space blocks, continuation lines, comments and indentation errors.
// Tokens are shown in a short form where NEWLINE, INDENT and DEDENT are written as ; > and <.
import { describe, expect, it } from "vitest";
import { lex } from "../../src/lexer/lexer.js";

/** Joins lines with \n so programs in tests are easy to read. */
const program = (...lines: string[]): string => lines.join("\n");

/** Short form: words as written, NEWLINE as ";", INDENT as ">", DEDENT as "<", EOF dropped. */
function shape(source: string): string {
  return lex(source)
    .tokens.filter((t) => t.kind !== "eof")
    .map((t) => {
      if (t.kind === "newline") return ";";
      if (t.kind === "indent") return ">";
      if (t.kind === "dedent") return "<";
      return t.text;
    })
    .join(" ");
}

function codes(source: string): string[] {
  return lex(source).diagnostics.map((d) => d.code);
}

describe("statements and blocks", () => {
  it("ends each statement with NEWLINE", () => {
    expect(shape(program("stop a", "stop b"))).toBe("stop a ; stop b ;");
  });

  it("opens and closes a block", () => {
    const source = program("if x:", "    stop a", "stop b");
    expect(shape(source)).toBe("if x : ; > stop a ; < stop b ;");
    expect(codes(source)).toEqual([]);
  });

  it("closes several blocks at once", () => {
    const source = program(
      "repeat forever:",
      "    for p in route.r:",
      "        move a.base to p",
      "stop a",
    );
    expect(shape(source)).toBe(
      "repeat forever : ; > for p in route . r : ; > move a . base to p ; < < stop a ;",
    );
  });

  it("closes open blocks at the end of the file", () => {
    expect(shape(program("if x:", "    stop a"))).toBe("if x : ; > stop a ; <");
  });

  it("produces only EOF for an empty file", () => {
    expect(lex("").tokens.map((t) => t.kind)).toEqual(["eof"]);
  });

  it("ignores blank lines and comment lines, whatever their indentation", () => {
    const source = program("if x:", "", "  # a comment at an odd depth", "    stop a", "", "stop b");
    expect(shape(source)).toBe("if x : ; > stop a ; < stop b ;");
    expect(codes(source)).toEqual([]);
  });

  it("accepts Windows line endings and a byte-order mark", () => {
    expect(shape("\uFEFFif x:\r\n    stop a\r\n")).toBe("if x : ; > stop a ; <");
  });

  it("places tokens on the right line", () => {
    const tokens = lex(program("stop a", "", "    ", "stop b")).tokens;
    expect(tokens.find((t) => t.text === "b")).toMatchObject({ line: 4, column: 6 });
  });
});

describe("continuation lines", () => {
  it("joins a line indented one level deeper to the statement above", () => {
    const source = program(
      "move rover.base to places.ward_3 speed 0.5m/s",
      "    avoid zones.icu",
      'say "I have arrived"',
    );
    expect(shape(source)).toBe(
      'move rover . base to places . ward_3 speed 0.5m/s avoid zones . icu ; say "I have arrived" ;',
    );
    expect(codes(source)).toEqual([]);
  });

  it("allows several continuation lines at the same depth", () => {
    const source = program(
      "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m),",
      "    pose(14m, 6m, 0m),",
      "    pose(10m, 6m, 0m))",
    );
    expect(codes(source)).toEqual([]);
    expect(shape(source).split(";")).toHaveLength(2); // one statement
  });

  it("works inside a block", () => {
    const source = program("if x:", "    capture d.camera", '        save as "a.jpg"', "stop d");
    expect(shape(source)).toBe('if x : ; > capture d . camera save as "a.jpg" ; < stop d ;');
  });

  it("rejects a continuation line that opens a block", () => {
    expect(codes(program("if a and", "    b:", "    stop r"))).toEqual(["E107"]);
  });

  it("rejects a continuation that is too deep", () => {
    expect(codes(program("move a.base to p", "        speed 1m/s"))).toEqual(["E105"]);
  });
});

describe("indentation errors", () => {
  it("rejects a tab in the indentation", () => {
    const d = lex(program("if x:", "\tstop a")).diagnostics;
    expect(d).toEqual([expect.objectContaining({ code: "E102", line: 2, column: 1 })]);
  });

  it("rejects indentation that is not a multiple of 4", () => {
    const d = lex(program("if x:", "  stop a")).diagnostics;
    expect(d).toEqual([expect.objectContaining({ code: "E103", line: 2, args: { spaces: "2" } })]);
  });

  it("rejects a block that is indented too far", () => {
    expect(codes(program("if x:", "        stop a"))).toEqual(["E105"]);
  });

  it("rejects an indented first line", () => {
    expect(codes("    stop a")).toEqual(["E105"]);
  });

  it("rejects a line that does not line up with any block", () => {
    const source = program("if x:", "        stop a", "    stop b");
    expect(codes(source)).toEqual(["E105", "E106"]);
  });

  it("leaves a missing block for the parser to report", () => {
    const source = program("if x:", "stop a");
    expect(codes(source)).toEqual([]);
    expect(shape(source)).toBe("if x : ; stop a ;");
  });

  it("reports errors from inside lines too", () => {
    expect(codes(program("wait 5 s", "move a to b speed 5mms"))).toEqual(["E111", "E110"]);
  });
});
