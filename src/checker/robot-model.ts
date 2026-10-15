// Describes what the checker needs to know about one robot: its frames, actuators, sensors,
// profiles, extensions and safety limits. It is built from a manifest file (Guidebook §9.1).

import type { Quantity } from "../stdlib/quantity.js";
import type { Dimension } from "../stdlib/units.js";

export interface FrameModel {
  /** pose2d (moves on a plane), pose3d (position in space) or pose6d (position and orientation). */
  readonly type: "pose2d" | "pose3d" | "pose6d";
  /** How far the frame can reach (a Length). */
  readonly reach?: Quantity;
  /** The fastest the frame can move (a Speed). */
  readonly maxSpeed?: Quantity;
  /** The heaviest load it can carry (a Mass). */
  readonly payload?: Quantity;
}

export interface ActuatorModel {
  /** The discrete states, like ["open", "closed"]. */
  readonly states: readonly string[];
  /** The strongest force it can apply (a Force). */
  readonly maxForce?: Quantity;
}

export interface SensorModel {
  /** What the sensor measures, like rgb, thermal or distance. */
  readonly kind: string;
  /** The dimension of its readings, or null if they are plain numbers (DECISIONS.md D10). */
  readonly dimension: Dimension | null;
}

export interface ExtensionModel {
  readonly params: readonly { readonly name: string; readonly type: string }[];
}

/** A corner of a zone on the floor, in metres. */
export interface Corner {
  readonly x: number;
  readonly y: number;
}

/**
 * A zone the robot must never enter: one named in the site map (zones.NAME), or a polygon
 * written in the manifest itself (DECISIONS.md D19).
 */
export type ForbiddenZone =
  | { readonly kind: "named"; readonly name: string }
  | { readonly kind: "polygon"; readonly corners: readonly Corner[] };

/** Limits enforced on every program, which no program can switch off (Guidebook §9.1, §9.3 rule 6). */
export interface SafetyLimits {
  /** The fastest any frame of this robot may move (a Speed). */
  readonly maxSpeed?: Quantity;
  readonly forbiddenZones: readonly ForbiddenZone[];
}

export interface RobotModel {
  /** The robot model's name, from manifest "NAME". */
  readonly name: string;
  readonly frames: Readonly<Record<string, FrameModel>>;
  readonly actuators: Readonly<Record<string, ActuatorModel>>;
  readonly sensors: Readonly<Record<string, SensorModel>>;
  readonly profiles: readonly string[];
  /** Vendor extensions by full name, like "examplecorp.adaptive_weld". */
  readonly extensions: Readonly<Record<string, ExtensionModel>>;
  readonly safety?: SafetyLimits;
}
