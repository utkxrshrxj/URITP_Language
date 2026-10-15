// Describes what the checker needs to know about one robot: its frames, actuators, sensors,
// profiles and extensions. Phase 4 fills this in from a manifest file (Guidebook §9.1).

import type { Dimension } from "../stdlib/units.js";

export interface FrameModel {
  /** pose2d (moves on a plane), pose3d (position in space) or pose6d (position and orientation). */
  readonly type: "pose2d" | "pose3d" | "pose6d";
}

export interface ActuatorModel {
  /** The discrete states, like ["open", "closed"]. */
  readonly states: readonly string[];
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

export interface RobotModel {
  /** The robot model's name, from manifest "NAME". */
  readonly name: string;
  readonly frames: Readonly<Record<string, FrameModel>>;
  readonly actuators: Readonly<Record<string, ActuatorModel>>;
  readonly sensors: Readonly<Record<string, SensorModel>>;
  readonly profiles: readonly string[];
  /** Vendor extensions by full name, like "examplecorp.adaptive_weld". */
  readonly extensions: Readonly<Record<string, ExtensionModel>>;
}
