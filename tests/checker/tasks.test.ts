// Tests tasks (DECISIONS.md D5): each call is checked with its own argument types, tasks must be
// defined above their calls, cannot call themselves, and return one kind of value.
import { describe, expect, it } from "vitest";
import type { CheckOptions } from "../../src/checker/checker.js";
import { checked, codes, firstMessage, lines } from "./helpers.js";
import { WITH_TEST_ROBOTS } from "./models.js";

const OPTIONS: CheckOptions = {
  ...WITH_TEST_ROBOTS,
  siteMaps: [{ name: "site.uritp", source: "define place lab = pose(5m, 2m, 0m)" }],
};
const ARM = 'robot arm = connect("sim:panda")';

describe("tasks", () => {
  it("checks example i: a task called with two objects", () => {
    const source = lines(
      ARM,
      "task pick_and_place(obj, dest):",
      "    move arm.tool to obj.above(10cm)",
      "    grip arm.gripper close",
      "    move arm.tool to dest.above(10cm) speed 0.2m/s",
      "    grip arm.gripper open",
      "    on fail:",
      '        say "I couldn\'t complete that"',
      "pick_and_place(cup, tray)",
    );
    expect(codes(source, OPTIONS)).toEqual([]);
  });

  it("finds mistakes in a task body even if it is never called", () => {
    expect(codes(lines(ARM, "task t():", "    move arm.tool to places.lab speed 3"), OPTIONS)).toEqual(["E304"]);
  });

  it("checks the body again with each call's argument types", () => {
    const source = lines(ARM, "task go(target):", "    move arm.tool to target", "go(places.lab)", "go(5cm)");
    expect(checked(source, OPTIONS)).toEqual([
      expect.objectContaining({ code: "E306", line: 3, args: expect.objectContaining({ got: "Length" }) }),
    ]);
  });

  it("lets a task take a robot and use its parts", () => {
    const source = lines(ARM, "task open_hand(r):", "    grip r.gripper open", "open_hand(arm)");
    expect(codes(source, OPTIONS)).toEqual([]);
  });

  it("lets a parameter share its name with an object passed in", () => {
    expect(codes(lines(ARM, "task grab(cup):", "    move arm.tool to cup", "grab(cup)"), OPTIONS)).toEqual([]);
  });

  it("counts arguments", () => {
    expect(checked(lines("task f(a, b):", "    return", "f(1)"))[0]).toMatchObject({
      code: "E309",
      args: { what: "task f", expected: "2", got: "1" },
    });
  });

  it("rejects parameters with the same name", () => {
    expect(codes(lines("task f(a, a):", "    return"))).toEqual(["E207"]);
  });

  it("rejects a task defined twice", () => {
    expect(codes(lines("task f():", "    return", "task f():", "    return"))).toEqual(["E207"]);
  });
});

describe("where tasks can be called", () => {
  it("needs the task to be defined above the call", () => {
    expect(firstMessage(lines("later()", "task later():", "    return"))).toBe(
      "there is no task or function called 'later' / Task 'later' is defined further down. Move its definition above this line.",
    );
  });

  it("does not let a task call itself", () => {
    expect(firstMessage(lines("task again():", "    again()"))).toContain("A task cannot call itself");
  });

  it("does not let a task see names defined below it", () => {
    expect(codes(lines("task f():", "    return gap", "let gap = 5cm"))).toEqual(["E202"]);
  });
});

describe("return values", () => {
  it("gives a task's return type to its call", () => {
    const source = lines("task half(d):", "    return d - 1cm", "let x = half(10cm) + 2cm");
    expect(codes(source)).toEqual([]);
    expect(checked(lines("task half(d):", "    return d - 1cm", "let x = half(10cm) + 2s"))[0]?.code).toBe("E301");
  });

  it("rejects returning different kinds of value (E314)", () => {
    const source = lines("task f(x):", "    if x:", "        return 5cm", "    return 2s");
    expect(codes(source)).toEqual(["E314"]);
  });

  it("rejects using a task with no return value as a value (E320)", () => {
    expect(codes(lines("task wave():", "    return", "let x = wave()"))).toEqual(["E320"]);
  });

  it("allows calling such a task on its own line", () => {
    expect(codes(lines("task wave():", "    return", "wave()"))).toEqual([]);
  });

  it("rejects calling a value as if it were a task", () => {
    expect(codes(lines("let gap = 5cm", "gap()"))).toEqual(["E306"]);
  });
});

describe("imported tasks", () => {
  it("makes tasks from an imported file available", () => {
    const options: CheckOptions = {
      ...OPTIONS,
      readFile: (path) => (path === "tasks.uritp" ? lines("task reach(r, target):", "    move r.tool to target") : null),
    };
    expect(codes(lines(ARM, 'import "tasks.uritp"', "reach(arm, places.lab)"), options)).toEqual([]);
  });
});
