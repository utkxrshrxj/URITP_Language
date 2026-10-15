// The instruction set of Guidebook §9.2: the only thing a robot ever receives.
// Every quantity is a plain number in SI units, so no robot has to convert units.

export type InstructionName =
  | "MOVE"
  | "DRIVE"
  | "TURN"
  | "ACTUATE"
  | "SKILL"
  | "SENSE"
  | "SAY"
  | "CONFIRM"
  | "ASK"
  | "WAIT"
  | "EXT"
  | "NATIVE"
  | "STOP"
  | "STATUS";

/** A pose in metres and radians. */
export interface PoseSI {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly roll: number;
  readonly pitch: number;
  readonly yaw: number;
}

/** One helper applied to an object the robot finds itself, like above(0.1) in cup.above(0.1). */
export interface ObjectHelper {
  readonly name: string;
  readonly args: readonly number[];
}

/** The value of one field=value pair. */
export type FieldValue =
  /** A number in SI units: metres, seconds, radians, kilograms, newtons, amperes, litres (§9.2). */
  | { readonly kind: "number"; readonly value: number }
  /** Text, written in double quotes. */
  | { readonly kind: "text"; readonly value: string }
  /** A bare word: a frame, actuator, state, sensor, skill or language name. */
  | { readonly kind: "word"; readonly value: string }
  | { readonly kind: "bool"; readonly value: boolean }
  | { readonly kind: "pose"; readonly pose: PoseSI }
  /** An object the robot finds by itself, with helpers: cup.above(0.1). */
  | { readonly kind: "object"; readonly name: string; readonly helpers: readonly ObjectHelper[] }
  /** A zone as its corners on the floor, in metres. */
  | { readonly kind: "zone"; readonly corners: readonly { readonly x: number; readonly y: number }[] }
  /** A condition the robot checks itself, with numbers in SI units, like mug.fill>=0.8. */
  | { readonly kind: "condition"; readonly text: string }
  | { readonly kind: "list"; readonly items: readonly FieldValue[] };

export interface Instruction {
  readonly name: InstructionName;
  /** The fields in the order they are written. */
  readonly fields: readonly (readonly [string, FieldValue])[];
}

export function instruction(name: InstructionName, fields: Record<string, FieldValue | null | undefined> = {}): Instruction {
  const present = Object.entries(fields).filter((entry): entry is [string, FieldValue] => entry[1] != null);
  return { name, fields: present };
}

/** The value of a field, or undefined if the instruction does not have it. */
export function field(instr: Instruction, name: string): FieldValue | undefined {
  return instr.fields.find(([key]) => key === name)?.[1];
}

/** Writes a number without floating-point leftovers: 0.1, not 0.10000000000000001. */
export function formatNumber(n: number): string {
  const tidy = Number(n.toPrecision(12));
  return Object.is(tidy, -0) ? "0" : String(tidy);
}

export function formatValue(value: FieldValue): string {
  switch (value.kind) {
    case "number":
      return formatNumber(value.value);
    case "text":
      return `"${value.value}"`;
    case "word":
      return value.value;
    case "bool":
      return String(value.value);
    case "pose": {
      const p = value.pose;
      return `pose(${[p.x, p.y, p.z, p.roll, p.pitch, p.yaw].map(formatNumber).join(",")})`;
    }
    case "object":
      return value.name + value.helpers.map((h) => `.${h.name}(${h.args.map(formatNumber).join(",")})`).join("");
    case "zone":
      return `polygon(${value.corners.map((c) => `(${formatNumber(c.x)},${formatNumber(c.y)})`).join(",")})`;
    case "condition":
      return value.text;
    case "list":
      return `[${value.items.map(formatValue).join(",")}]`;
  }
}

/** Writes an instruction on one line, as §9.2 shows: MOVE frame=tool target=cup.above(0.1) speed=0.2 */
export function formatInstruction(instr: Instruction): string {
  return [instr.name, ...instr.fields.map(([key, value]) => `${key}=${formatValue(value)}`)].join(" ");
}

// Small helpers for building field values.
export const num = (value: number): FieldValue => ({ kind: "number", value });
export const text = (value: string): FieldValue => ({ kind: "text", value });
export const word = (value: string): FieldValue => ({ kind: "word", value });
