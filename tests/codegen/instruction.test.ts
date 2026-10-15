// Tests how instructions are written, one per line as NAME field=value (Guidebook §9.2),
// using the Guidebook's own examples.
import { describe, expect, it } from "vitest";
import { field, formatInstruction, formatNumber, instruction, num, text, word } from "../../src/codegen/instruction.js";

describe("formatInstruction", () => {
  it("writes the Guidebook's MOVE example", () => {
    const move = instruction("MOVE", {
      frame: word("tool"),
      target: { kind: "object", name: "cup", helpers: [{ name: "above", args: [0.1] }] },
      speed: num(0.2),
      tolerance: num(0.005),
    });
    expect(formatInstruction(move)).toBe("MOVE frame=tool target=cup.above(0.1) speed=0.2 tolerance=0.005");
  });

  it("writes the Guidebook's ACTUATE example", () => {
    expect(formatInstruction(instruction("ACTUATE", { actuator: word("gripper"), state: word("closed") }))).toBe(
      "ACTUATE actuator=gripper state=closed",
    );
  });

  it("leaves out fields that are not given", () => {
    const move = instruction("MOVE", { frame: word("base"), target: word("x"), speed: null, tolerance: undefined });
    expect(formatInstruction(move)).toBe("MOVE frame=base target=x");
  });

  it("writes poses, zones, lists, text and conditions", () => {
    const i = instruction("MOVE", {
      frame: word("base"),
      target: { kind: "pose", pose: { x: 4.2, y: 1, z: 0, roll: 0, pitch: 0, yaw: Math.PI / 2 } },
      via: { kind: "list", items: [{ kind: "pose", pose: { x: 1, y: 2, z: 0, roll: 0, pitch: 0, yaw: 0 } }] },
      avoid: { kind: "list", items: [{ kind: "zone", corners: [{ x: 10, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 6 }] }] },
    });
    expect(formatInstruction(i)).toBe(
      "MOVE frame=base target=pose(4.2,1,0,0,0,1.57079632679) via=[pose(1,2,0,0,0,0)] avoid=[polygon((10,0),(14,0),(14,6))]",
    );
    expect(formatInstruction(instruction("SAY", { text: text("Parcel for you"), lang: word("en") }))).toBe('SAY text="Parcel for you" lang=en');
    expect(formatInstruction(instruction("SKILL", { name: word("pour"), until: { kind: "condition", text: "mug.fill>=0.8" } }))).toBe(
      "SKILL name=pour until=mug.fill>=0.8",
    );
  });

  it("writes STOP with no fields", () => {
    expect(formatInstruction(instruction("STOP"))).toBe("STOP");
  });

  it("reads a field back", () => {
    expect(field(instruction("WAIT", { duration: num(120) }), "duration")).toEqual(num(120));
  });
});

describe("formatNumber", () => {
  it.each([
    [0.1 + 0.2, "0.3"],
    [-0, "0"],
    [120, "120"],
    [0.005, "0.005"],
  ])("writes %d as %s", (n, written) => {
    expect(formatNumber(n)).toBe(written);
  });
});
