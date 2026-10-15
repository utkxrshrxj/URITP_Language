// The values a program works with while it runs: numbers, quantities (kept in SI units inside),
// poses, places, objects and so on. Also shows each value as text for logs and {name} insertions.

import type { ObjectHelper, PoseSI } from "../codegen/instruction.js";
import { formatNumber } from "../codegen/instruction.js";
import type { Corner } from "../checker/robot-model.js";
import { UNITS, type Dimension } from "../stdlib/units.js";

export type Value =
  | { readonly kind: "number"; readonly value: number }
  /** A quantity in SI units; `unit` is only used to show it the way the program wrote it. */
  | { readonly kind: "quantity"; readonly si: number; readonly dimension: Dimension; readonly unit: string }
  /** A percent from 0 to 100. It is sent to robots as a fraction from 0 to 1 (D14). */
  | { readonly kind: "percent"; readonly value: number }
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "pose"; readonly pose: PoseSI }
  | { readonly kind: "place"; readonly name: string; readonly pose: PoseSI }
  | { readonly kind: "zone"; readonly name: string; readonly corners: readonly Corner[] }
  /** An object the robot finds itself, with the helpers applied to it so far (D4). */
  | { readonly kind: "object"; readonly name: string; readonly helpers: readonly ObjectHelper[] }
  | { readonly kind: "robot"; readonly robot: string }
  /** A named frame, actuator or sensor of a robot. */
  | { readonly kind: "part"; readonly robot: string; readonly part: string }
  | {
      readonly kind: "reading";
      readonly value: Value;
      readonly max: Value;
      readonly min: Value;
      readonly mean: Value;
      /** Seconds since the program started (D9). */
      readonly timestamp: number;
    }
  | { readonly kind: "analysis"; readonly label: string; readonly health: string }
  | { readonly kind: "list"; readonly items: readonly Value[] }
  /** The error value inside on fail: (Guidebook §8). */
  | { readonly kind: "error"; readonly code: string; readonly reason: string }
  /** What a task gives back when it returns no value. */
  | { readonly kind: "nothing" };

export const NOTHING: Value = { kind: "nothing" };
export const bool = (value: boolean): Value => ({ kind: "bool", value });

/** A quantity from a number and a unit, like quantityOf(10, "cm"). */
export function quantityOf(value: number, unit: string): Value {
  const info = UNITS[unit];
  if (info === undefined) throw new Error(`unknown unit '${unit}'`);
  return { kind: "quantity", si: value * info.toSI, dimension: info.dimension, unit };
}

/** A quantity from an SI value, shown in `unit`. */
export function quantityFromSI(si: number, dimension: Dimension, unit: string): Value {
  return { kind: "quantity", si, dimension, unit };
}

export const ORIGIN: PoseSI = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };

/** Shows a value as text, for log lines and {name} insertions: 10.5cm, 25%, true. */
export function show(value: Value): string {
  switch (value.kind) {
    case "number":
      return formatNumber(value.value);
    case "quantity":
      return `${formatNumber(value.si / (UNITS[value.unit]?.toSI ?? 1))}${value.unit}`;
    case "percent":
      return `${formatNumber(value.value)}%`;
    case "bool":
      return String(value.value);
    case "text":
      return value.value;
    case "pose": {
      const p = value.pose;
      return `pose(${[p.x, p.y, p.z].map((n) => `${formatNumber(n)}m`).join(", ")})`;
    }
    case "place":
      return value.name;
    case "zone":
      return value.name;
    case "object":
      return value.name;
    case "robot":
      return value.robot;
    case "part":
      return `${value.robot}.${value.part}`;
    case "reading":
      return show(value.value);
    case "analysis":
      return value.label;
    case "list":
      return `[${value.items.map(show).join(", ")}]`;
    case "error":
      return `${value.code}: ${value.reason}`;
    case "nothing":
      return "nothing";
  }
}

/** The pose of a pose or place, or null for anything else. */
export function poseOf(value: Value): PoseSI | null {
  return value.kind === "pose" || value.kind === "place" ? value.pose : null;
}

/** The SI number of a quantity, or null. */
export function siOf(value: Value): number | null {
  return value.kind === "quantity" ? value.si : null;
}
