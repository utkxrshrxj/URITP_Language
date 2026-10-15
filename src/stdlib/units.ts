// The table of every unit URITP knows: which dimension it measures and its size in SI units.
// It follows spec/TYPES_AND_UNITS.md section 1; the lexer uses it to spot misspelled units.

export type Dimension =
  | "Length"
  | "Angle"
  | "Time"
  | "Speed"
  | "AngularSpeed"
  | "Mass"
  | "Force"
  | "Current"
  | "Volume"
  | "Temperature";

export interface UnitInfo {
  readonly dimension: Dimension;
  /** How many SI units one of this unit is worth: 1cm is 0.01 metres. */
  readonly toSI: number;
}

const DEGREE = Math.PI / 180;

export const UNITS: Readonly<Record<string, UnitInfo>> = {
  mm: { dimension: "Length", toSI: 0.001 },
  cm: { dimension: "Length", toSI: 0.01 },
  m: { dimension: "Length", toSI: 1 },
  km: { dimension: "Length", toSI: 1000 },
  deg: { dimension: "Angle", toSI: DEGREE },
  rad: { dimension: "Angle", toSI: 1 },
  ms: { dimension: "Time", toSI: 0.001 },
  s: { dimension: "Time", toSI: 1 },
  min: { dimension: "Time", toSI: 60 },
  h: { dimension: "Time", toSI: 3600 },
  "mm/s": { dimension: "Speed", toSI: 0.001 },
  "cm/s": { dimension: "Speed", toSI: 0.01 },
  "m/s": { dimension: "Speed", toSI: 1 },
  "km/h": { dimension: "Speed", toSI: 1 / 3.6 },
  "deg/s": { dimension: "AngularSpeed", toSI: DEGREE },
  "rad/s": { dimension: "AngularSpeed", toSI: 1 },
  g: { dimension: "Mass", toSI: 0.001 },
  kg: { dimension: "Mass", toSI: 1 },
  N: { dimension: "Force", toSI: 1 },
  A: { dimension: "Current", toSI: 1 },
  ml: { dimension: "Volume", toSI: 0.001 },
  l: { dimension: "Volume", toSI: 1 },
  deg_c: { dimension: "Temperature", toSI: 1 },
};

export const UNIT_NAMES: readonly string[] = Object.keys(UNITS);

export function isUnit(name: string): boolean {
  return Object.hasOwn(UNITS, name);
}

/**
 * Common ways people write units that URITP spells differently.
 * Used only for "did you mean ...?" hints; these spellings are never accepted.
 */
export const UNIT_MISSPELLINGS: Readonly<Record<string, string>> = {
  mms: "mm/s",
  cms: "cm/s",
  mps: "m/s",
  kmh: "km/h",
  kph: "km/h",
  cdeg: "deg_c",
  degc: "deg_c",
  celsius: "deg_c",
  sec: "s",
  secs: "s",
  second: "s",
  seconds: "s",
  mins: "min",
  minute: "min",
  minutes: "min",
  hr: "h",
  hrs: "h",
  hour: "h",
  hours: "h",
  degree: "deg",
  degrees: "deg",
  meter: "m",
  meters: "m",
  metre: "m",
  metres: "m",
};
