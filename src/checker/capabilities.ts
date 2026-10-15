// Which profiles each statement needs (Guidebook §7, TYPES_AND_UNITS.md section 5), and how
// the type names a manifest uses for extension parameters map to checker slots.

import type { Dimension } from "../stdlib/units.js";
import type { RobotModel } from "./robot-model.js";
import type { Accept } from "./types.js";

/**
 * The profiles a statement needs. Each inner list is "any one of these"; every inner list
 * must be met. So weld needs manipulation and tooling, and turn needs any one of three.
 */
export const NEEDS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  drive: [["navigation"]],
  turn: [["navigation", "legged", "flight"]],
  via: [["navigation"]],
  avoid: [["navigation"]],
  takeoff: [["flight"]],
  land: [["flight"]],
  return_home: [["flight"]],
  grip: [["manipulation"]],
  pick: [["manipulation"]],
  place: [["manipulation"]],
  pour: [["manipulation"]],
  weld: [["manipulation"], ["tooling"]],
  spray: [["tooling"]],
  say: [["speech"]],
  confirm: [["speech"]],
  ask: [["speech"]],
  capture: [["vision"]],
  analyse: [["vision"]],
};

/** The first profile `model` lacks for `what`, written like "flight" or "navigation, legged or flight". */
export function missingProfile(model: RobotModel, what: string): string | null {
  for (const anyOf of NEEDS[what] ?? []) {
    if (!anyOf.some((p) => model.profiles.includes(p))) {
      return anyOf.length === 1 ? (anyOf[0] ?? "") : `${anyOf.slice(0, -1).join(", ")} or ${anyOf[anyOf.length - 1]}`;
    }
  }
  return null;
}

/** True if the robot supports a profile or extension by that name, as .has("NAME") asks (§6). */
export function robotHas(model: RobotModel, name: string): boolean {
  return model.profiles.includes(name) || model.extensions[name] !== undefined;
}

/** The slot an extension parameter type stands for, like Route or Quantity<Current>. */
export function acceptForType(type: string): Accept {
  const quantity = /^Quantity<(.+)>$/.exec(type);
  if (quantity !== null) return { kind: "Quantity", dimension: quantity[1] as Dimension };
  if (type.startsWith("List<")) return { kind: "List" };
  return { kind: type as "Number" };
}
