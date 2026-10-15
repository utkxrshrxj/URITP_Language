// Tests cutting a single line into tokens: names, keywords, numbers, units, percents, symbols.
// Also checks the E1xx errors for bad units, spaces before units, tabs and stray characters.
import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../../src/diagnostics/diagnostic.js";
import { tokenizeLine } from "../../src/lexer/line.js";
import type { Token } from "../../src/lexer/tokens.js";

function lexLine(line: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const tokens = tokenizeLine(line, 1, 0, diagnostics);
  return { tokens, diagnostics };
}

/** Short form of the tokens, like "keyword:move name:rover symbol:.". */
function kinds(line: string): string[] {
  return lexLine(line).tokens.map((t) => `${t.kind}:${t.text}`);
}

function codes(line: string): string[] {
  return lexLine(line).diagnostics.map((d) => d.code);
}

describe("names, keywords and symbols", () => {
  it("reads a move statement", () => {
    expect(kinds("move rover.base to places.dock")).toEqual([
      "keyword:move", "name:rover", "symbol:.", "name:base", "keyword:to",
      "name:places", "symbol:.", "name:dock",
    ]);
  });

  it("reads names with digits and underscores", () => {
    expect(kinds("box_231 _tmp desk_14")).toEqual(["name:box_231", "name:_tmp", "name:desk_14"]);
  });

  it("reads return_home as one keyword", () => {
    expect(kinds("return_home")).toEqual(["keyword:return_home"]);
  });

  it("treats Move as a name, because keywords are lower case", () => {
    expect(kinds("Move")).toEqual(["name:Move"]);
  });

  it("reads two-character operators before one-character ones", () => {
    expect(kinds("a >= b != c == d <= e < f > g = h")).toEqual([
      "name:a", "symbol:>=", "name:b", "symbol:!=", "name:c", "symbol:==", "name:d",
      "symbol:<=", "name:e", "symbol:<", "name:f", "symbol:>", "name:g", "symbol:=", "name:h",
    ]);
  });

  it("ignores comments", () => {
    expect(kinds("move rover.base to places.dock   # a trailing comment")).toHaveLength(8);
    expect(kinds("# a line comment")).toEqual([]);
  });

  it("starts at the given index and gives 1-based columns", () => {
    const diagnostics: Diagnostic[] = [];
    const tokens = tokenizeLine("    grip arm.gripper open", 3, 4, diagnostics);
    expect(tokens[0]).toMatchObject({ text: "grip", line: 3, column: 5 });
  });
});

describe("numbers, quantities and percents", () => {
  it("reads plain numbers", () => {
    const { tokens } = lexLine("3 0.5 120");
    expect(tokens.map((t) => (t.kind === "number" ? t.value : null))).toEqual([3, 0.5, 120]);
  });

  it("reads -2 as a minus sign and a number", () => {
    expect(kinds("-2")).toEqual(["symbol:-", "number:2"]);
  });

  it.each([
    ["10cm", 10, "cm"],
    ["0.2m/s", 0.2, "m/s"],
    ["90deg", 90, "deg"],
    ["2min", 2, "min"],
    ["80deg_c", 80, "deg_c"],
    ["180A", 180, "A"],
    ["140N", 140, "N"],
    ["5mm/s", 5, "mm/s"],
    ["250ml", 250, "ml"],
  ])("reads %s as a quantity", (source, value, unit) => {
    const { tokens, diagnostics } = lexLine(source);
    expect(diagnostics).toEqual([]);
    expect(tokens).toEqual([{ kind: "quantity", text: source, value, unit, line: 1, column: 1 }]);
  });

  it("reads 25% as a percent", () => {
    expect(lexLine("25%").tokens).toEqual([{ kind: "percent", text: "25%", value: 25, line: 1, column: 1 }]);
  });

  it("reads a quantity inside a call", () => {
    expect(kinds("obj.above(10cm)")).toEqual([
      "name:obj", "symbol:.", "name:above", "symbol:(", "quantity:10cm", "symbol:)",
    ]);
  });

  it("reads a dotted call after a number in brackets", () => {
    expect(kinds("field.row(4).plants")).toEqual([
      "name:field", "symbol:.", "name:row", "symbol:(", "number:4", "symbol:)", "symbol:.", "name:plants",
    ]);
  });
});

describe("unit errors", () => {
  it.each([
    ["5mms", "mms", "mm/s"],
    ["80cdeg", "cdeg", "deg_c"],
    ["90Deg", "Deg", "deg"],
    ["3L", "L", "l"],
    ["2mins", "mins", "min"],
    ["5mm/sec", "mm/sec", "mm/s"],
  ])("rejects %s and suggests the right unit", (source, unit, suggestion) => {
    const { diagnostics } = lexLine(source);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ code: "E110", args: { unit, suggestion } });
  });

  it("gives no suggestion when nothing is close", () => {
    expect(lexLine("5banana").diagnostics[0]?.args["suggestion"]).toBe("");
  });

  it("asks for a space when a keyword is glued to a number", () => {
    const { tokens, diagnostics } = lexLine("repeat 3times:");
    expect(diagnostics[0]).toMatchObject({ code: "E110", args: { keyword: "times" } });
    expect(tokens.map((t) => t.text)).toEqual(["repeat", "3", "times", ":"]);
  });

  it.each([
    ["10 cm", "cm"],
    ["wait 2 min", "min"],
    ["0.2 m/s", "m/s"],
    ["25 %", "%"],
  ])("rejects a space between number and unit in %s", (source, unit) => {
    const { diagnostics } = lexLine(source);
    expect(diagnostics).toEqual([expect.objectContaining({ code: "E111", args: expect.objectContaining({ unit }) })]);
  });

  it("does not mistake a name after a number for a unit when it is used as a name", () => {
    expect(codes("repeat 3 times")).toEqual([]);
    expect(codes("f(1, m=2)")).toEqual([]);
  });
});

describe("other errors", () => {
  it("rejects a tab between words", () => {
    const { diagnostics } = lexLine("move\trover.base");
    expect(diagnostics).toEqual([expect.objectContaining({ code: "E102", column: 5 })]);
  });

  it.each([
    ["5.", "5."],
    [".5", ".5"],
  ])("rejects the number %s", (source, number) => {
    expect(lexLine(source).diagnostics).toEqual([
      expect.objectContaining({ code: "E116", args: { number } }),
    ]);
  });

  it.each([";", "*", "/", "&", "'", "@"])("rejects the character %s", (c) => {
    expect(codes(`a ${c} b`)).toEqual(["E115"]);
  });

  it("explains that names use ASCII letters", () => {
    const { diagnostics } = lexLine("let कप = 5");
    expect(diagnostics[0]).toMatchObject({ code: "E115", args: { char: "कप" } });
  });
});
