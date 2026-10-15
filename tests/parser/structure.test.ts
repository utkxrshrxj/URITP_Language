// Tests the program structure statements (robot, let, task, call, return, import),
// blocks, on fail, where statements may appear, and recovery after errors.
import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/parser.js";
import { codes, kinds, lines, parseClean } from "./helpers.js";
import { show } from "./show.js";

describe("robot", () => {
  it("connects a robot", () => {
    const program = parseClean('robot arm = connect("sim:panda")');
    expect(program.statements[0]).toMatchObject({
      kind: "Robot",
      name: "arm",
      address: { parts: [{ kind: "literal", text: "sim:panda" }] },
      line: 1,
      column: 1,
    });
  });

  it("needs a fixed address", () => {
    expect(codes('robot arm = connect("sim:{name}")')).toEqual(["E130"]);
  });

  it("explains a missing part", () => {
    const d = parse('robot arm connect("x")').diagnostics[0];
    expect(d).toMatchObject({ code: "E120", args: { expected: "'='", found: "'connect'" } });
    expect(d?.args["form"]).toBe('robot NAME = connect("ADDRESS")');
  });

  it("refuses a keyword as the robot name", () => {
    expect(codes('robot move = connect("x")')).toEqual(["E123"]);
  });
});

describe("let", () => {
  it("binds a value", () => {
    const program = parseClean("let x = 10cm + 5mm");
    const statement = program.statements[0];
    expect(statement?.kind === "Let" && statement.value.kind !== "Ask" && show(statement.value)).toBe("(+ 10cm 5mm)");
  });

  it("asks a question, with a language", () => {
    const program = parseClean('let room = ask "Which room?" lang hi');
    expect(program.statements[0]).toMatchObject({ kind: "Let", value: { kind: "Ask", lang: "hi" } });
  });

  it("accepts language codes that are also keywords, like or (Odia)", () => {
    expect(parseClean('let a = ask "?" lang or').statements[0]).toMatchObject({ value: { lang: "or" } });
  });

  it("rejects a comma after the value", () => {
    const d = parse("let x = 5, 6").diagnostics[0];
    expect(d).toMatchObject({ code: "E120", args: { expected: "the end of the line" } });
    expect(d?.args["fix"]).toContain("Remove the comma");
  });
});

describe("task, call and return", () => {
  const example = lines(
    'robot arm = connect("sim:panda")',
    "task pick_and_place(obj, dest):",
    "    let above = obj.above(10cm)",
    "    return above",
    "    on fail:",
    "        let failed = true",
    "pick_and_place(cup, tray)",
  );

  it("builds the tree for a task and its call", () => {
    const program = parseClean(example);
    expect(kinds(program)).toEqual(["Robot", "Task", "CallStatement"]);
    const task = program.statements[1];
    if (task?.kind !== "Task") throw new Error("not a task");
    expect(task.params).toEqual(["obj", "dest"]);
    expect(task.body.statements.map((s) => s.kind)).toEqual(["Let", "Return"]);
    expect(task.body.onFail).toMatchObject({ line: 5, column: 5 });
    expect(task.body.onFail?.body.statements.map((s) => s.kind)).toEqual(["Let"]);
  });

  it("allows a task with no parameters and a bare return", () => {
    const program = parseClean(lines("task patrol():", "    return", "patrol()"));
    expect(kinds(program)).toEqual(["Task", "CallStatement"]);
  });

  it("reads a dotted call as a statement", () => {
    expect(kinds(parseClean('rover.sense("distance_front")'))).toEqual(["CallStatement"]);
  });

  it("reports a missing ':' with E101, as in the Guidebook", () => {
    const d = parse(lines("task f()", "    return")).diagnostics;
    expect(d[0]).toMatchObject({ code: "E101", args: { after: "the task name and its parameters" } });
  });

  it("refuses keywords as parameter names", () => {
    expect(codes(lines("task f(to):", "    return"))).toEqual(["E123"]);
  });

  it("rejects return outside a task", () => {
    expect(codes("return 5")).toEqual(["E127"]);
  });
});

describe("import", () => {
  it("imports a file", () => {
    expect(parseClean('import "site.uritp"').statements[0]).toMatchObject({ kind: "Import" });
  });

  it("needs a fixed file name", () => {
    expect(codes('import "{name}.uritp"')).toEqual(["E130"]);
  });
});

describe("unknown statements", () => {
  it("suggests say for disp (DECISIONS.md A1)", () => {
    const d = parse('disp "Parcel for you"').diagnostics[0];
    expect(d).toMatchObject({ code: "E121", args: { word: "disp", suggestion: "say" } });
  });

  it("explains lower-case keywords", () => {
    const d = parse("Move rover.base to places.dock").diagnostics[0];
    expect(d?.args["fix"]).toBe("Did you mean 'move'? Keywords are written in lower case.");
  });

  it("explains how to bind a value", () => {
    const d = parse("x = 5").diagnostics[0];
    expect(d).toMatchObject({ code: "E121", args: { fix: "To give a name to a value, write: let x = ..." } });
  });

  it("explains return_home", () => {
    expect(parse("returnhome").diagnostics[0]?.args["fix"]).toContain("safety:");
    expect(codes("return_home drone")).toEqual(["E127"]);
  });

  it("rejects a value that is not a call", () => {
    expect(codes("rover.base")).toEqual(["E122"]);
    expect(codes("5cm")).toEqual(["E120"]);
  });

  it("rejects else with no if", () => {
    expect(parse("else:").diagnostics[0]?.args["fix"]).toContain("line up with an 'if'");
  });
});

describe("blocks and on fail", () => {
  it("allows on fail at the top level (Guidebook §8)", () => {
    const program = parseClean(lines("f()", "on fail:", "    let reason = error.reason"));
    expect(program.onFail?.body.statements).toHaveLength(1);
  });

  it("rejects statements after on fail", () => {
    const d = parse(lines("f()", "on fail:", "    g()", "h()")).diagnostics;
    expect(d).toEqual([expect.objectContaining({ code: "E128", line: 2 })]);
  });

  it("reports an empty block but keeps reading", () => {
    const { program, diagnostics } = parse(lines("task f():", "let x = 1"));
    expect(diagnostics.map((d) => d.code)).toEqual(["E104"]);
    expect(kinds(program)).toEqual(["Task", "Let"]);
  });

  it("rejects a block on the same line as ':'", () => {
    expect(parse(lines("task f(): return")).diagnostics[0]?.args["fix"]).toContain("next line");
  });

  it("rejects robot and task inside a task", () => {
    const source = lines("task f():", '    robot r = connect("x")', "    task g():", "        return");
    expect(codes(source)).toEqual(["E127", "E127"]);
  });
});

describe("recovery after errors", () => {
  it("reports several errors and still reads the good statements", () => {
    const source = lines("let = 5", "let ok = 1", "disp 3", "let fine = 2");
    const { program, diagnostics } = parse(source);
    expect(diagnostics.map((d) => [d.code, d.line])).toEqual([
      ["E120", 1],
      ["E121", 3],
    ]);
    expect(program.statements.map((s) => (s.kind === "Let" ? s.name : s.kind))).toEqual(["ok", "fine"]);
  });

  it("skips the block of a broken line", () => {
    const source = lines("task f(:", "    let a = 1", "    let b = 2", "let c = 3");
    const { program, diagnostics } = parse(source);
    expect(diagnostics).toHaveLength(1);
    expect(kinds(program)).toEqual(["Let"]);
  });

  it("sorts lexer and parser errors by line", () => {
    expect(parse(lines("disp 1", "let x = 5mms")).diagnostics.map((d) => d.line)).toEqual([1, 2]);
  });
});
