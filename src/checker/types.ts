// The types the checker gives to every value, following spec/TYPES_AND_UNITS.md section 2.
// Also decides whether a value fits a slot, like "move needs a Frame here".

import type { Dimension } from "../stdlib/units.js";

export type PartRole = "frame" | "actuator" | "sensor";

export type Type =
  | { readonly kind: "Number" }
  | { readonly kind: "Quantity"; readonly dimension: Dimension }
  | { readonly kind: "Percent" }
  | { readonly kind: "Bool" }
  | { readonly kind: "Text" }
  | { readonly kind: "Pose" }
  | { readonly kind: "Place" }
  | { readonly kind: "Zone" }
  /** A route; its items are places (with names) or plain poses. */
  | { readonly kind: "Route"; readonly item: "Place" | "Pose" }
  | { readonly kind: "Object" }
  | { readonly kind: "Robot"; readonly robot: string }
  /** A named part of a robot. A hand can be a frame and an actuator at once (DECISIONS.md D8). */
  | { readonly kind: "Part"; readonly robot: string; readonly part: string; readonly roles: readonly PartRole[] }
  | { readonly kind: "Reading"; readonly dimension: Dimension | null }
  /** The result of reading.analyse(OBJECT) (DECISIONS.md D10). */
  | { readonly kind: "Analysis" }
  | { readonly kind: "List"; readonly item: Type }
  /** The error value inside on fail:. */
  | { readonly kind: "TaskResult" }
  /** The places, zones and route namespaces themselves, before .NAME. */
  | { readonly kind: "Namespace"; readonly namespace: "places" | "zones" | "route" }
  /** What a task call gives when the task returns no value. */
  | { readonly kind: "Nothing" }
  /** Used after an error, so one mistake gives one message, and for extension results. */
  | { readonly kind: "Unknown" };

export const NUMBER: Type = { kind: "Number" };
export const PERCENT: Type = { kind: "Percent" };
export const BOOL: Type = { kind: "Bool" };
export const TEXT: Type = { kind: "Text" };
export const POSE: Type = { kind: "Pose" };
export const PLACE: Type = { kind: "Place" };
export const ZONE: Type = { kind: "Zone" };
export const OBJECT: Type = { kind: "Object" };
export const TASK_RESULT: Type = { kind: "TaskResult" };
export const NOTHING: Type = { kind: "Nothing" };
export const UNKNOWN: Type = { kind: "Unknown" };
export const quantity = (dimension: Dimension): Type => ({ kind: "Quantity", dimension });
export const listOf = (item: Type): Type => ({ kind: "List", item });

/** What a slot accepts. Several can be allowed at once, like "a Pose, Place or Object". */
export type Accept =
  | { readonly kind: "Number" | "Percent" | "Bool" | "Text" | "Pose" | "Place" | "Zone" | "Route" | "Object" | "Robot" }
  | { readonly kind: "Quantity"; readonly dimension: Dimension }
  | { readonly kind: "Frame" | "Actuator" | "Sensor" | "List" | "Any" };

/** True if a value of type `type` fits a slot that accepts `accept`. */
export function fits(type: Type, accept: Accept): boolean {
  if (type.kind === "Unknown" || accept.kind === "Any") return true;
  switch (accept.kind) {
    case "Quantity":
      return type.kind === "Quantity" && type.dimension === accept.dimension;
    case "Frame":
      return type.kind === "Part" && type.roles.includes("frame");
    case "Actuator":
      return type.kind === "Part" && type.roles.includes("actuator");
    case "Sensor":
      return type.kind === "Part" && type.roles.includes("sensor");
    case "Pose":
      // A place is a pose with a name, so it can go wherever a pose can.
      return type.kind === "Pose" || type.kind === "Place";
    case "List":
      return type.kind === "List" || type.kind === "Route";
    default:
      return type.kind === accept.kind;
  }
}

export function fitsAny(type: Type, accepts: readonly Accept[]): boolean {
  return accepts.some((accept) => fits(type, accept));
}

/** The type's name for messages: Length, Percent, Frame, List of Place, and so on. */
export function typeName(type: Type): string {
  switch (type.kind) {
    case "Quantity":
      return type.dimension;
    case "Route":
      return "Route";
    case "Part":
      return type.roles.map((r) => r[0]?.toUpperCase() + r.slice(1)).join(" and ");
    case "List":
      return `List of ${typeName(type.item)}`;
    case "Namespace":
      return `the ${type.namespace} namespace`;
    case "Nothing":
      return "no value";
    case "Unknown":
      return "an unknown value";
    default:
      return type.kind;
  }
}

/** Names what a slot accepts for messages: "Speed", "a Pose, Place or Object". */
export function acceptName(accepts: readonly Accept[]): string {
  const names = accepts.map((a) => (a.kind === "Quantity" ? a.dimension : a.kind === "Any" ? "any value" : a.kind));
  if (names.length === 1) return names[0] ?? "";
  return `a ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

/** True if two types are the same, for comparing list items and return values. */
export function sameType(a: Type, b: Type): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "Quantity" && b.kind === "Quantity") return a.dimension === b.dimension;
  if (a.kind === "List" && b.kind === "List") return sameType(a.item, b.item);
  if (a.kind === "Robot" && b.kind === "Robot") return a.robot === b.robot;
  if (a.kind === "Part" && b.kind === "Part") return a.robot === b.robot && a.part === b.part;
  return true;
}
