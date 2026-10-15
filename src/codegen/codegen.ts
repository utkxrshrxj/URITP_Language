// Builds the instruction for each robot statement from its worked-out values (Guidebook §9.2).
// Every number is in SI units; the runner decides which robot gets each instruction.

import type { Value } from "../runtime/values.js";
import { toField } from "./fields.js";
import { instruction, num, text, word, type FieldValue, type Instruction } from "./instruction.js";

const optional = (value: Value | null): FieldValue | null => (value === null ? null : toField(value));

/** The name of a robot part, like tool for arm.tool. */
const partName = (value: Value): FieldValue => (value.kind === "part" ? word(value.part) : toField(value));

export function move(frame: Value, target: Value, speed: Value | null, tolerance: Value | null, via: Value | null, avoid: readonly Value[]): Instruction {
  return instruction("MOVE", {
    frame: partName(frame),
    target: toField(target),
    speed: optional(speed),
    tolerance: optional(tolerance),
    via: optional(via),
    avoid: avoid.length === 0 ? null : { kind: "list", items: avoid.map(toField) },
  });
}

/**
 * DRIVE with a signed distance: backward is negative. Without a distance the robot drives until
 * stopped, so the direction is given instead (DECISIONS.md D36).
 */
export function drive(frame: Value, direction: "forward" | "backward", distance: Value | null, speed: Value | null): Instruction {
  const sign = direction === "backward" ? -1 : 1;
  const metres = distance?.kind === "quantity" ? distance.si * sign : null;
  return instruction("DRIVE", {
    frame: partName(frame),
    distance: metres === null ? null : num(metres),
    direction: metres === null ? word(direction) : null,
    speed: optional(speed),
  });
}

export function turn(frame: Value, angle: Value, speed: Value | null): Instruction {
  return instruction("TURN", { frame: partName(frame), angle: toField(angle), speed: optional(speed) });
}

/** grip open sets the state open; grip close sets closed (DECISIONS.md D8). */
export function grip(actuator: Value, action: "open" | "close", force: Value | null): Instruction {
  return instruction("ACTUATE", {
    actuator: partName(actuator),
    state: word(action === "open" ? "open" : "closed"),
    force: optional(force),
  });
}

/** A profile skill: pick, place, pour, weld, spray, takeoff, land or return_home (§9.2). */
export function skill(name: string, args: Record<string, FieldValue | null> = {}): Instruction {
  return instruction("SKILL", { name: word(name), ...args });
}

export function sense(sensor: string, extra: { save?: string; analyse?: Value } = {}): Instruction {
  return instruction("SENSE", {
    sensor: word(sensor),
    save: extra.save === undefined ? null : text(extra.save),
    analyse: extra.analyse === undefined ? null : toField(extra.analyse),
  });
}

export function talk(kind: "SAY" | "CONFIRM" | "ASK", message: string, lang: string | null): Instruction {
  return instruction(kind, { text: text(message), lang: lang === null ? null : word(lang) });
}

export function wait(seconds: number): Instruction {
  return instruction("WAIT", { duration: num(seconds) });
}

/** EXT name=vendor.feature, then each argument under its parameter name from the manifest. */
export function extension(name: string, args: readonly { name: string; value: Value }[]): Instruction {
  const fields: Record<string, FieldValue> = { name: word(name) };
  for (const arg of args) fields[arg.name] = toField(arg.value);
  return instruction("EXT", fields);
}

/** The value, as a field, for building SKILL arguments. */
export const field = (value: Value): FieldValue => toField(value);
export const partField = partName;
