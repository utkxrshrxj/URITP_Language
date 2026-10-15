// Tests turning run-time values into SI instruction fields, and the pose helpers
// (.above, .offset, .in_front, ...) on poses, places and objects.
import { describe, expect, it } from "vitest";
import { applyHelper, toField } from "../../src/codegen/fields.js";
import { formatValue } from "../../src/codegen/instruction.js";
import { ORIGIN, quantityOf, show, type Value } from "../../src/runtime/values.js";

const written = (value: Value): string => formatValue(toField(value));
const place: Value = { kind: "place", name: "lab", pose: { ...ORIGIN, x: 5, y: 2 } };

describe("toField", () => {
  it.each([
    [quantityOf(10, "cm"), "0.1"],
    [quantityOf(2, "min"), "120"],
    [quantityOf(90, "deg"), "1.57079632679"],
    [quantityOf(3.6, "km/h"), "1"],
    [quantityOf(250, "ml"), "0.25"],
    [quantityOf(80, "deg_c"), "80"],
    [{ kind: "percent", value: 80 } as Value, "0.8"],
    [{ kind: "text", value: "hi" } as Value, '"hi"'],
    [{ kind: "part", robot: "arm", part: "tool" } as Value, "tool"],
  ])("writes %j in SI as %s", (value, text) => {
    expect(written(value)).toBe(text);
  });

  it("writes a place as its pose", () => {
    expect(written(place)).toBe("pose(5,2,0,0,0,0)");
  });
});

describe("show", () => {
  it("shows values the way the program wrote them", () => {
    expect(show({ kind: "quantity", si: 0.105, dimension: "Length", unit: "cm" })).toBe("10.5cm");
    expect(show({ kind: "percent", value: 25 })).toBe("25%");
    expect(show(place)).toBe("lab");
  });
});

describe("applyHelper", () => {
  it("keeps helpers on objects for the robot, in SI units", () => {
    const cup: Value = { kind: "object", name: "cup", helpers: [] };
    expect(written(applyHelper(cup, "above", [0.1]) as Value)).toBe("cup.above(0.1)");
  });

  it.each([
    ["above", [0.1], { x: 5, y: 2, z: 0.1, roll: Math.PI, pitch: 0, yaw: 0 }],
    ["below", [0.5], { x: 5, y: 2, z: -0.5, roll: 0, pitch: 0, yaw: 0 }],
    ["at_height", [10], { x: 5, y: 2, z: 10, roll: 0, pitch: 0, yaw: 0 }],
    ["offset", [1, -1, 0.5], { x: 6, y: 1, z: 0.5, roll: 0, pitch: 0, yaw: 0 }],
    ["in_front", [1], { x: 6, y: 2, z: 0, roll: 0, pitch: 0, yaw: Math.PI }],
    ["beside", [1], { x: 5, y: 3, z: 0, roll: 0, pitch: 0, yaw: -Math.PI / 2 }],
  ] as const)("works out %s on a place", (helper, args, pose) => {
    const result = applyHelper(place, helper, args);
    expect(result?.kind).toBe("pose");
    if (result?.kind !== "pose") return;
    for (const key of ["x", "y", "z", "roll", "pitch", "yaw"] as const) expect(result.pose[key]).toBeCloseTo(pose[key], 9);
  });

  it("cannot work out a shelf level on a place", () => {
    expect(applyHelper(place, "level", [2])).toBeNull();
  });
});
