// Tests which value types fit which slots, and how types are named in error messages.
// Covers hands that are both frames and actuators, and places used as poses.
import { describe, expect, it } from "vitest";
import {
  acceptName, BOOL, fits, listOf, NUMBER, OBJECT, PLACE, POSE, quantity, sameType, typeName, UNKNOWN,
  type Type,
} from "../../src/checker/types.js";

const hand: Type = { kind: "Part", robot: "helper", part: "left_hand", roles: ["frame", "actuator"] };
const camera: Type = { kind: "Part", robot: "drone", part: "camera", roles: ["sensor"] };

describe("fits", () => {
  it("matches quantities by dimension", () => {
    expect(fits(quantity("Length"), { kind: "Quantity", dimension: "Length" })).toBe(true);
    expect(fits(quantity("Time"), { kind: "Quantity", dimension: "Length" })).toBe(false);
    expect(fits(NUMBER, { kind: "Quantity", dimension: "Length" })).toBe(false);
  });

  it("lets a hand be both a frame and an actuator (DECISIONS.md D8)", () => {
    expect(fits(hand, { kind: "Frame" })).toBe(true);
    expect(fits(hand, { kind: "Actuator" })).toBe(true);
    expect(fits(hand, { kind: "Sensor" })).toBe(false);
    expect(fits(camera, { kind: "Sensor" })).toBe(true);
  });

  it("lets a place go where a pose is expected, but not the other way round", () => {
    expect(fits(PLACE, { kind: "Pose" })).toBe(true);
    expect(fits(POSE, { kind: "Place" })).toBe(false);
  });

  it("treats routes as lists", () => {
    expect(fits({ kind: "Route", item: "Place" }, { kind: "List" })).toBe(true);
  });

  it("lets an unknown value fit anywhere, so one mistake gives one error", () => {
    expect(fits(UNKNOWN, { kind: "Bool" })).toBe(true);
  });
});

describe("names for messages", () => {
  it.each([
    [quantity("Length"), "Length"],
    [NUMBER, "Number"],
    [hand, "Frame and Actuator"],
    [listOf(PLACE), "List of Place"],
    [{ kind: "Nothing" } as Type, "no value"],
  ])("names %j as %s", (type, name) => {
    expect(typeName(type)).toBe(name);
  });

  it("lists what a slot accepts", () => {
    expect(acceptName([{ kind: "Quantity", dimension: "Speed" }])).toBe("Speed");
    expect(acceptName([{ kind: "Pose" }, { kind: "Place" }, { kind: "Object" }])).toBe("a Pose, Place or Object");
  });
});

describe("sameType", () => {
  it("compares quantities and lists deeply", () => {
    expect(sameType(quantity("Length"), quantity("Length"))).toBe(true);
    expect(sameType(listOf(quantity("Length")), listOf(quantity("Time")))).toBe(false);
    expect(sameType(OBJECT, BOOL)).toBe(false);
  });
});
