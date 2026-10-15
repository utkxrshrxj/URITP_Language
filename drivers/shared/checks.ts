// Decides whether a driver must refuse an instruction (Guidebook §9.3 rules 4 and 6): anything the
// robot cannot do exactly, or that breaks its own safety limits, is refused with an E4xx or E5xx reason.

import { missingProfile } from "../../src/checker/capabilities.js";
import { insidePolygon } from "../../src/checker/geometry.js";
import type { Corner, RobotModel } from "../../src/checker/robot-model.js";
import { field, type FieldValue, type Instruction, type PoseSI } from "../../src/codegen/instruction.js";
import { explain, makeDiagnostic, type DiagnosticArgs } from "../../src/diagnostics/diagnostic.js";
import { compare, format, toSI } from "../../src/stdlib/quantity.js";
import type { DriverInfo } from "./driver.js";

/** A reason to refuse, as an error code and the details for its message. */
export interface Refusal {
  readonly code: string;
  readonly args: DiagnosticArgs;
}

/** The refusal as one line of text for the task's failed reason: "E502 speed 3m/s exceeds ...". */
export function refusalText(refusal: Refusal): string {
  return `${refusal.code} ${explain(makeDiagnostic(refusal.code, 0, 0, refusal.args)).message}`;
}

const ACTUATOR_PROPERTIES = ["holding", "loaded", "locked"];
/** Small differences from floating-point arithmetic, far below anything a robot could move. */
const EPSILON = 1e-9;

const numberOf = (value: FieldValue | undefined): number | null => (value?.kind === "number" ? value.value : null);
const wordOf = (value: FieldValue | undefined): string => (value?.kind === "word" ? value.value : "");

/** Every pose given directly in a field: a target pose, or the poses of a route. */
function posesIn(value: FieldValue | undefined): PoseSI[] {
  if (value === undefined) return [];
  if (value.kind === "pose") return [value.pose];
  if (value.kind === "list") return value.items.flatMap(posesIn);
  return [];
}

/** The corners of every zone the robot's manifest forbids. */
export function forbiddenZones(info: DriverInfo): { name: string; corners: readonly Corner[] }[] {
  return (info.model.safety?.forbiddenZones ?? []).map((zone) =>
    zone.kind === "polygon" ? { name: "", corners: zone.corners } : { name: zone.name, corners: info.zones[zone.name] ?? [] },
  );
}

/**
 * Checks a target pose against the frame it moves: a frame on a plane cannot leave the floor or
 * tilt (E422), a frame with a reach cannot go further (E421), and no target may lie in a forbidden
 * zone (E501). Returns the first problem found, or null.
 */
export function checkTarget(info: DriverInfo, frame: string, pose: PoseSI): Refusal | null {
  const model = info.model;
  const frameModel = model.frames[frame];
  if (frameModel?.type === "pose2d" && (Math.abs(pose.z) > EPSILON || Math.abs(pose.roll) > EPSILON || Math.abs(pose.pitch) > EPSILON)) {
    return { code: "E422", args: { frame, robot: model.name } };
  }
  if (frameModel?.reach !== undefined && frameModel.type !== "pose2d") {
    const distance = Math.hypot(pose.x, pose.y, pose.z);
    if (distance > toSI(frameModel.reach) + EPSILON) {
      return { code: "E421", args: { frame, robot: model.name, distance: `${Number(distance.toPrecision(6))}m`, reach: format(frameModel.reach) } };
    }
  }
  for (const zone of forbiddenZones(info)) {
    if (insidePolygon(pose, zone.corners)) return { code: "E501", args: { zone: zone.name, robot: model.name } };
  }
  return null;
}

/** A speed must not break the safety limit (E502) nor the frame's own limit (E406). */
function checkSpeed(model: RobotModel, frame: string | null, speed: number | null): Refusal | null {
  if (speed === null) return null;
  const asQuantity = { value: speed, unit: "m/s" };
  const safety = model.safety?.maxSpeed;
  if (safety !== undefined && compare(asQuantity, safety) > EPSILON) {
    return { code: "E502", args: { speed: format(asQuantity), limit: format(safety), robot: model.name } };
  }
  const frameLimit = frame === null ? undefined : model.frames[frame]?.maxSpeed;
  if (frame !== null && frameLimit !== undefined && compare(asQuantity, frameLimit) > EPSILON) {
    return { code: "E406", args: { speed: format(asQuantity), limit: format(frameLimit), frame, robot: model.name } };
  }
  return null;
}

function needsProfile(model: RobotModel, what: string): Refusal | null {
  const missing = missingProfile(model, what);
  return missing === null ? null : { code: "E401", args: { what, profile: missing, robot: model.name, supported: model.profiles.join(", ") } };
}

function needsPart(model: RobotModel, kind: "frame" | "actuator" | "sensor", name: string): Refusal | null {
  const table = kind === "frame" ? model.frames : kind === "actuator" ? model.actuators : model.sensors;
  return table[name] === undefined ? { code: "E409", args: { kind, name, robot: model.name } } : null;
}

/** Checks that a sensor name can be read (D30): a sensor, a robot property, or a dotted property. */
function checkSense(model: RobotModel, sensor: string): Refusal | null {
  if (["battery", "state", "pose"].includes(sensor) || model.sensors[sensor] !== undefined) return null;
  const [owner, property] = sensor.split(".");
  if (owner !== undefined && property !== undefined) {
    if (model.actuators[owner] !== undefined) {
      return ACTUATOR_PROPERTIES.includes(property) ? null : { code: "E409", args: { kind: "property", name: sensor, robot: model.name } };
    }
    // Reading an object's properties needs the robot to see it.
    return model.profiles.includes("vision")
      ? null
      : { code: "E401", args: { what: "finding objects", profile: "vision", robot: model.name, supported: model.profiles.join(", ") } };
  }
  return needsPart(model, "sensor", sensor);
}

/** The reason a driver must refuse `instr`, or null if it can do it exactly. */
export function checkInstruction(info: DriverInfo, instr: Instruction): Refusal | null {
  const model = info.model;
  const get = (key: string): FieldValue | undefined => field(instr, key);
  const frame = wordOf(get("frame"));

  switch (instr.name) {
    case "MOVE": {
      const problem =
        needsPart(model, "frame", frame) ??
        (get("via") !== undefined ? needsProfile(model, "via") : null) ??
        (get("avoid") !== undefined ? needsProfile(model, "avoid") : null) ??
        checkSpeed(model, frame, numberOf(get("speed")));
      if (problem !== null) return problem;
      const tolerance = numberOf(get("tolerance"));
      if (tolerance !== null && tolerance < info.repeatability - EPSILON) {
        return { code: "E423", args: { robot: model.name, value: `tolerance ${tolerance}m`, step: `${info.repeatability}m` } };
      }
      for (const pose of [...posesIn(get("target")), ...posesIn(get("via"))]) {
        const target = checkTarget(info, frame, pose);
        if (target !== null) return target;
      }
      return null;
    }
    case "DRIVE":
      return needsProfile(model, "drive") ?? needsPart(model, "frame", frame) ?? checkSpeed(model, frame, numberOf(get("speed")));
    case "TURN":
      return needsProfile(model, "turn") ?? needsPart(model, "frame", frame);
    case "ACTUATE": {
      const actuator = wordOf(get("actuator"));
      const missing = needsProfile(model, "grip") ?? needsPart(model, "actuator", actuator);
      if (missing !== null) return missing;
      const states = model.actuators[actuator]?.states ?? [];
      const state = wordOf(get("state"));
      if (!states.includes(state)) return { code: "E408", args: { actuator, robot: model.name, state, states: states.join(", ") } };
      const force = numberOf(get("force"));
      const limit = model.actuators[actuator]?.maxForce;
      if (force !== null && limit !== undefined && compare({ value: force, unit: "N" }, limit) > EPSILON) {
        return { code: "E407", args: { force: `${force}N`, limit: format(limit), actuator, robot: model.name } };
      }
      return null;
    }
    case "SKILL": {
      const name = wordOf(get("name"));
      const problem = needsProfile(model, name);
      if (problem !== null) return problem;
      if (name === "weld") return checkSpeed(model, null, numberOf(get("speed")));
      if (name === "place" || name === "land") {
        const placeFrame = name === "place" ? wordOf(get("frame")) : (Object.keys(model.frames)[0] ?? "");
        for (const pose of posesIn(get(name === "place" ? "target" : "at"))) {
          const target = checkTarget(info, placeFrame, pose);
          if (target !== null) return target;
        }
      }
      return null;
    }
    case "SENSE": {
      const sensor = wordOf(get("sensor"));
      if (get("save") !== undefined || get("analyse") !== undefined) {
        return needsProfile(model, get("save") !== undefined ? "capture" : "analyse") ?? needsPart(model, "sensor", sensor);
      }
      return checkSense(model, sensor);
    }
    case "SAY":
    case "CONFIRM":
    case "ASK":
      return needsProfile(model, instr.name.toLowerCase());
    case "EXT": {
      const name = wordOf(get("name"));
      return model.extensions[name] === undefined ? { code: "E402", args: { name } } : null;
    }
    case "NATIVE":
      return { code: "E405", args: {} };
    case "WAIT":
    case "STATUS":
    case "STOP":
      return null;
  }
}
