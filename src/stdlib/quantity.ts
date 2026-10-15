// Works with quantities (a number plus a unit): converting units, adding, comparing and printing.
// Inside, every value is turned into SI units, so 10cm + 5mm becomes 0.105m, shown as 10.5cm.

import { UNITS, type Dimension } from "./units.js";

export interface Quantity {
  readonly value: number;
  readonly unit: string;
}

function info(unit: string): { dimension: Dimension; toSI: number } {
  const found = UNITS[unit];
  if (found === undefined) throw new Error(`unknown unit '${unit}'`);
  return found;
}

export function dimensionOf(unit: string): Dimension {
  return info(unit).dimension;
}

/** The value in SI units: 10cm gives 0.1 (metres). */
export function toSI(q: Quantity): number {
  return q.value * info(q.unit).toSI;
}

/** Removes tiny floating-point leftovers, so 10.500000000000002 becomes 10.5. */
function tidy(n: number): number {
  return Number(n.toPrecision(12));
}

/** Converts to another unit of the same dimension: to(1.2m, cm) gives 120cm. */
export function convert(q: Quantity, unit: string): Quantity {
  if (dimensionOf(q.unit) !== dimensionOf(unit)) {
    throw new Error(`cannot convert ${q.unit} to ${unit}`);
  }
  return { value: tidy(toSI(q) / info(unit).toSI), unit };
}

/** Adds two quantities of the same dimension. The result uses the unit of the left one (D13). */
export function add(a: Quantity, b: Quantity): Quantity {
  return { value: tidy(a.value + convert(b, a.unit).value), unit: a.unit };
}

export function subtract(a: Quantity, b: Quantity): Quantity {
  return { value: tidy(a.value - convert(b, a.unit).value), unit: a.unit };
}

/** Compares in SI units: negative if a is smaller, 0 if equal, positive if a is bigger. */
export function compare(a: Quantity, b: Quantity): number {
  return tidy(toSI(a)) - tidy(toSI(b));
}

/** Rounds to a whole number of `unit`: round(1.234m, cm) gives 123cm. */
export function roundTo(q: Quantity, unit: string): Quantity {
  return { value: Math.round(convert(q, unit).value), unit };
}

/** Writes a quantity the way a program would: 10.5cm. */
export function format(q: Quantity): string {
  return `${tidy(q.value)}${q.unit}`;
}
