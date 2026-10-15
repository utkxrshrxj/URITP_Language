// Tests the control-flow statements of Guidebook §5: if/elif/else, for, repeat, break,
// wait and parallel, including where break and return are allowed.
import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/parser.js";
import { codes, lines, parseClean } from "./helpers.js";
import { show } from "./show.js";

describe("if", () => {
  it("reads if, elif and else", () => {
    const source = lines(
      "if rover.battery < 20%:",
      '    say "low"',
      "elif rover.battery < 50%:",
      '    say "medium"',
      "else:",
      '    say "fine"',
      "stop rover",
    );
    const program = parseClean(source);
    const statement = program.statements[0];
    if (statement?.kind !== "If") throw new Error("not an if");
    expect(statement.branches.map((b) => show(b.condition))).toEqual([
      "(< rover.battery 20%)",
      "(< rover.battery 50%)",
    ]);
    expect(statement.branches[1]).toMatchObject({ line: 3, column: 1 });
    expect(statement.elseBody?.statements).toHaveLength(1);
    expect(program.statements[1]?.kind).toBe("Stop");
  });

  it("reports E101 for a missing ':' after the condition", () => {
    const d = parse(lines("if x", '    say "a"')).diagnostics;
    expect(d).toEqual([expect.objectContaining({ code: "E101", args: { after: "the 'if' condition" } })]);
  });

  it("explains else if", () => {
    const d = parse(lines("if a:", "    stop r", "else if b:", "    stop r")).diagnostics;
    expect(d[0]?.args["fix"]).toBe("Write 'elif CONDITION:' instead of 'else if'.");
  });

  it("lets an on fail inside the if body belong to that body (DECISIONS.md C8)", () => {
    const source = lines("if a:", "    stop r", "    on fail:", "        stop r", "else:", "    stop r");
    const statement = parseClean(source).statements[0];
    expect(statement?.kind === "If" && statement.branches[0]?.body.onFail).toBeTruthy();
  });
});

describe("loops", () => {
  it("reads a for loop", () => {
    const source = lines("for point in route.roof_inspect:", "    move drone.base to point.at_height(10m)");
    expect(parseClean(source).statements[0]).toMatchObject({ kind: "For", variable: "point" });
  });

  it.each([
    ["repeat 3 times:", { mode: "times", interval: null }],
    ["repeat every 10s:", { mode: "every", count: null }],
    ["repeat forever:", { mode: "forever", count: null, interval: null }],
  ])("reads %s", (header, expected) => {
    expect(parseClean(lines(header, "    stop r")).statements[0]).toMatchObject({ kind: "Repeat", ...expected });
  });

  it("explains repeat for from example iv (DECISIONS.md A11)", () => {
    const d = parse(lines("repeat for 30min:", "    stop r")).diagnostics;
    expect(d[0]?.args["fix"]).toContain("URITP has no 'repeat for'");
  });

  it("needs 'times' after the count", () => {
    expect(parse(lines("repeat 3:", "    stop r")).diagnostics[0]?.args["expected"]).toBe("'times'");
  });

  it("allows break in a loop, also inside an if", () => {
    const source = lines("repeat forever:", "    if now() >= 30min:", "        break");
    expect(codes(source)).toEqual([]);
  });

  it("rejects break outside a loop", () => {
    expect(codes("break")).toEqual(["E127"]);
  });

  it("rejects break that would leave a task", () => {
    expect(codes(lines("repeat forever:", "    stop r", "task f():", "    break"))).toEqual(["E127"]);
  });
});

describe("wait", () => {
  it.each([
    ["wait 2s", { kind: "Wait" }],
    ["wait until rover.tray.loaded timeout 2min", { kind: "WaitUntil", timeout: { raw: "2min" } }],
    ["wait until not rover.tray.loaded", { kind: "WaitUntil", timeout: null, condition: { kind: "Unary" } }],
  ])("reads %s", (source, expected) => {
    expect(parseClean(source).statements[0]).toMatchObject(expected);
  });
});

describe("parallel", () => {
  it("reads a parallel block", () => {
    const source = lines("parallel:", "    move a.base to places.x", "    move b.base to places.y");
    const statement = parseClean(source).statements[0];
    expect(statement?.kind === "Parallel" && statement.body.statements).toHaveLength(2);
  });

  it("rejects break and return inside parallel (DECISIONS.md C6)", () => {
    const source = lines(
      "task f():",
      "    repeat forever:",
      "        parallel:",
      "            break",
      "            return",
    );
    expect(codes(source)).toEqual(["E127", "E127"]);
  });
});
