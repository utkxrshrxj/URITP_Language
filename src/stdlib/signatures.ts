// The standard library of Guidebook §6: what each built-in function, helper and property
// takes and gives back. The checker uses these tables to check calls and properties.

import { BOOL, NUMBER, PERCENT, POSE, quantity, TEXT, type Accept, type Type } from "../checker/types.js";

const LENGTH: Accept = { kind: "Quantity", dimension: "Length" };
const ANGLE: Accept = { kind: "Quantity", dimension: "Angle" };
/** Things that have a position: poses, places and objects (§6 "on any Pose, Place or Object"). */
const POSITIONED: readonly Accept[] = [{ kind: "Pose" }, { kind: "Object" }];

export interface Param {
  readonly name: string;
  readonly accepts: readonly Accept[];
  /** Named parameters are written name=value and may be left out, like yaw=90deg. */
  readonly named?: boolean;
}

export interface Signature {
  readonly params: readonly Param[];
  /** null when the result depends on the arguments; the checker works it out itself. */
  readonly returns: Type | null;
  /** What it does, for error messages and documentation. */
  readonly meaning: string;
}

/** Built-in functions called by name (§6 "Pose helpers" and "Other built-ins"). */
export const FUNCTIONS: Readonly<Record<string, Signature>> = {
  pose: {
    params: [
      { name: "x", accepts: [LENGTH] },
      { name: "y", accepts: [LENGTH] },
      { name: "z", accepts: [LENGTH] },
      { name: "roll", accepts: [ANGLE], named: true },
      { name: "pitch", accepts: [ANGLE], named: true },
      { name: "yaw", accepts: [ANGLE], named: true },
    ],
    returns: POSE,
    meaning: "builds a pose from lengths and angles",
  },
  distance: {
    params: [
      { name: "a", accepts: POSITIONED },
      { name: "b", accepts: POSITIONED },
    ],
    returns: quantity("Length"),
    meaning: "the straight-line distance between two poses",
  },
  now: { params: [], returns: quantity("Time"), meaning: "the time since the program started (D9)" },
  len: { params: [{ name: "list", accepts: [{ kind: "List" }] }], returns: NUMBER, meaning: "the number of items" },
  round: {
    params: [
      { name: "q", accepts: [{ kind: "Any" }] },
      { name: "unit", accepts: [{ kind: "Any" }] },
    ],
    returns: null,
    meaning: "rounds a quantity in a given unit",
  },
  to: {
    params: [
      { name: "q", accepts: [{ kind: "Any" }] },
      { name: "unit", accepts: [{ kind: "Any" }] },
    ],
    returns: null,
    meaning: "converts a quantity to another unit",
  },
  text: { params: [{ name: "v", accepts: [{ kind: "Any" }] }], returns: TEXT, meaning: "converts a value to Text" },
  polygon: {
    // Takes three or more poses (D16); the checker counts them itself.
    params: [],
    returns: null,
    meaning: "builds a zone from three or more poses",
  },
};

/** Pose helpers, called on any Pose, Place or Object (§6). All return a Pose. */
export const POSE_HELPERS: Readonly<Record<string, Signature>> = {
  above: { params: [{ name: "q", accepts: [LENGTH] }], returns: POSE, meaning: "the same position raised by a length, tool pointing down" },
  below: { params: [{ name: "q", accepts: [LENGTH] }], returns: POSE, meaning: "lowered by a length" },
  beside: { params: [{ name: "q", accepts: [LENGTH] }], returns: POSE, meaning: "offset sideways by a length, facing the target" },
  in_front: { params: [{ name: "q", accepts: [LENGTH] }], returns: POSE, meaning: "offset along the target's forward direction" },
  at_height: { params: [{ name: "q", accepts: [LENGTH] }], returns: POSE, meaning: "the same x and y at an absolute height" },
  offset: {
    params: [
      { name: "dx", accepts: [LENGTH] },
      { name: "dy", accepts: [LENGTH] },
      { name: "dz", accepts: [LENGTH] },
    ],
    returns: POSE,
    meaning: "offset by three lengths in the world frame",
  },
  level: { params: [{ name: "n", accepts: [{ kind: "Number" }] }], returns: POSE, meaning: "the Nth level of a shelf-like object" },
};

/** Properties (no brackets) of each kind of value (§6). */
export const ROBOT_PROPERTIES: Readonly<Record<string, Type>> = {
  battery: PERCENT,
  state: TEXT,
  pose: POSE,
};

/** Robot methods: .has("NAME") and .sense("NAME"); both need fixed text (DECISIONS.md B6). */
export const ROBOT_METHODS = ["has", "sense"] as const;

/** Every pose, place and object has a grasp point .handle (§6 pose helpers). */
export const POSITION_PROPERTIES: Readonly<Record<string, Type>> = { handle: POSE };

export const OBJECT_PROPERTIES: Readonly<Record<string, Type>> = { fill: PERCENT, id: TEXT, name: TEXT };

/** A place also has .name and .id (DECISIONS.md D7). */
export const PLACE_PROPERTIES: Readonly<Record<string, Type>> = { name: TEXT, id: TEXT };

/** .holding, .loaded and .locked are accepted on any actuator (DECISIONS.md D11). */
export const ACTUATOR_PROPERTIES: Readonly<Record<string, Type>> = { holding: BOOL, loaded: BOOL, locked: BOOL };

/** Reading values take the sensor's dimension; .timestamp is always Time (D9, D10). */
export const READING_VALUES = ["value", "max", "min", "mean"] as const;

export const ANALYSIS_PROPERTIES: Readonly<Record<string, Type>> = { label: TEXT, health: TEXT };

/** The error value inside on fail: (Guidebook §8). */
export const ERROR_PROPERTIES: Readonly<Record<string, Type>> = { code: TEXT, reason: TEXT };

/** Names the program cannot redefine (DECISIONS.md D6). */
export const BUILT_IN_NAMES: readonly string[] = [
  "places", "zones", "route", "field", "shelf", "error",
  "pose", "polygon", "distance", "now", "len", "round", "text",
];
