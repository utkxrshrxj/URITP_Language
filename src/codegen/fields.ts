// Turns run-time values into instruction fields in SI units (Guidebook §9.2), and applies
// pose helpers such as .above(10cm) to poses, places and objects.

import type { Value } from "../runtime/values.js";
import { poseOf } from "../runtime/values.js";
import type { FieldValue, PoseSI } from "./instruction.js";

/**
 * The instruction field for a value. Quantities become SI numbers, percents become fractions
 * from 0 to 1 (D14), places become their pose, and robot parts become their name.
 */
export function toField(value: Value): FieldValue {
  switch (value.kind) {
    case "number":
      return { kind: "number", value: value.value };
    case "quantity":
      return { kind: "number", value: value.si };
    case "percent":
      return { kind: "number", value: value.value / 100 };
    case "bool":
      return { kind: "bool", value: value.value };
    case "text":
      return { kind: "text", value: value.value };
    case "pose":
    case "place":
      return { kind: "pose", pose: value.pose };
    case "zone":
      return { kind: "zone", corners: value.corners };
    case "object":
      return { kind: "object", name: value.name, helpers: value.helpers };
    case "part":
      return { kind: "word", value: value.part };
    case "robot":
      return { kind: "word", value: value.robot };
    case "list":
      return { kind: "list", items: value.items.map(toField) };
    case "reading":
      return toField(value.value);
    case "analysis":
      return { kind: "text", value: value.label };
    case "error":
      return { kind: "text", value: value.reason };
    case "nothing":
      return { kind: "word", value: "none" };
  }
}

/**
 * Applies a pose helper (Guidebook §6). Lengths are in metres. On an object the helper is kept
 * for the robot to work out, like cup.above(0.1); on a pose or place it is worked out here.
 * Returns null if the helper cannot be worked out for this value.
 */
export function applyHelper(owner: Value, helper: string, args: readonly number[]): Value | null {
  if (owner.kind === "object") {
    return { kind: "object", name: owner.name, helpers: [...owner.helpers, { name: helper, args }] };
  }
  const pose = poseOf(owner);
  if (pose === null) return null;
  const [a = 0, b = 0, c = 0] = args;
  const result = movePose(pose, helper, a, b, c);
  return result === null ? null : { kind: "pose", pose: result };
}

/** The pose a helper gives (D34). */
function movePose(p: PoseSI, helper: string, a: number, b: number, c: number): PoseSI | null {
  switch (helper) {
    case "above":
      // Raised by a length, with the tool pointing down (roll of half a turn).
      return { ...p, z: p.z + a, roll: Math.PI, pitch: 0 };
    case "below":
      return { ...p, z: p.z - a };
    case "at_height":
      return { ...p, z: a };
    case "offset":
      return { ...p, x: p.x + a, y: p.y + b, z: p.z + c };
    case "in_front":
      // Along the target's forward direction, turned round to face it.
      return { ...p, x: p.x + a * Math.cos(p.yaw), y: p.y + a * Math.sin(p.yaw), yaw: p.yaw + Math.PI };
    case "beside":
      // To the target's left, turned to face it.
      return { ...p, x: p.x - a * Math.sin(p.yaw), y: p.y + a * Math.cos(p.yaw), yaw: p.yaw - Math.PI / 2 };
    case "handle":
      return p; // a pose or place has no grasp point of its own, so it is its own handle
    default:
      return null; // level(N) only means something for a shelf-like object
  }
}
