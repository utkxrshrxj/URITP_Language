// Works out positions that are fixed before the program runs, and whether a point lies in a zone.
// Used for forbidden zones (Guidebook §9.1): all positions here are in metres, on the floor plan.

import type { Expression } from "../parser/ast.js";
import { toSI } from "../stdlib/quantity.js";
import { UNITS } from "../stdlib/units.js";
import type { Corner } from "./robot-model.js";

/** A fixed position in metres. Only x and y matter for zones, which cover every height (D16). */
export interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Finds the fixed position of a place by name, if it has one. */
export type PlaceLookup = (name: string) => Point | null;

/** The length in metres of a fixed length like 10cm, or null. */
function metres(expr: Expression | undefined): number | null {
  if (expr === undefined) return null;
  if (expr.kind === "Unary" && expr.op === "-") {
    const inner = metres(expr.operand);
    return inner === null ? null : -inner;
  }
  if (expr.kind !== "Quantity" || UNITS[expr.unit]?.dimension !== "Length") return null;
  return toSI({ value: expr.value, unit: expr.unit });
}

/**
 * The fixed position of `expr`, or null if it is only known while running (an object, a sensor
 * reading, a helper whose direction depends on the robot such as .beside).
 */
export function constantPoint(expr: Expression, places: PlaceLookup = () => null): Point | null {
  if (expr.kind === "Member" && expr.object.kind === "Name" && expr.object.name === "places") {
    return places(expr.name);
  }
  if (expr.kind !== "Call") return null;
  const args = expr.args.filter((a) => a.label === null).map((a) => a.value);
  if (expr.callee.kind === "Name" && expr.callee.name === "pose") {
    const [x, y, z] = args.map(metres);
    return x == null || y == null || z == null ? null : { x, y, z };
  }
  if (expr.callee.kind !== "Member") return null;
  const base = constantPoint(expr.callee.object, places);
  if (base === null) return null;
  const amount = metres(args[0]);
  switch (expr.callee.name) {
    case "above":
      return amount === null ? null : { ...base, z: base.z + amount };
    case "below":
      return amount === null ? null : { ...base, z: base.z - amount };
    case "at_height":
      return amount === null ? null : { ...base, z: amount };
    case "offset": {
      const [dx, dy, dz] = args.map(metres);
      return dx == null || dy == null || dz == null ? null : { x: base.x + dx, y: base.y + dy, z: base.z + dz };
    }
    default:
      return null;
  }
}

/** The corners of polygon(pose(...), ...) when they are all fixed, or null. */
export function constantPolygon(expr: Expression, places: PlaceLookup = () => null): Corner[] | null {
  if (expr.kind !== "Call" || expr.callee.kind !== "Name" || expr.callee.name !== "polygon") return null;
  const corners: Corner[] = [];
  for (const arg of expr.args) {
    const point = constantPoint(arg.value, places);
    if (point === null) return null;
    corners.push({ x: point.x, y: point.y });
  }
  return corners.length >= 3 ? corners : null;
}

/** True if the point lies inside the polygon or on its edge (the ray-crossing rule). */
export function insidePolygon(point: { x: number; y: number }, corners: readonly Corner[]): boolean {
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const a = corners[i] as Corner;
    const b = corners[j] as Corner;
    if (onSegment(point, a, b)) return true;
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function onSegment(p: { x: number; y: number }, a: Corner, b: Corner): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  return Math.min(a.x, b.x) - 1e-9 <= p.x && p.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= p.y && p.y <= Math.max(a.y, b.y) + 1e-9;
}
