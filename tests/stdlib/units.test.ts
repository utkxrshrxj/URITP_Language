// Checks the unit table against spec/TYPES_AND_UNITS.md: every unit, its dimension and SI size.
// Also checks that the misspelling hints point at real units.
import { describe, expect, it } from "vitest";
import { UNITS, UNIT_MISSPELLINGS, UNIT_NAMES, isUnit } from "../../src/stdlib/units.js";

describe("unit table", () => {
  it("has exactly the units of Guidebook §3", () => {
    expect([...UNIT_NAMES].sort()).toEqual(
      [
        "mm", "cm", "m", "km", "deg", "rad", "ms", "s", "min", "h",
        "mm/s", "cm/s", "m/s", "km/h", "deg/s", "rad/s", "g", "kg", "N", "A",
        "ml", "l", "deg_c",
      ].sort(),
    );
  });

  it.each([
    ["cm", "Length", 0.01],
    ["km", "Length", 1000],
    ["min", "Time", 60],
    ["h", "Time", 3600],
    ["ms", "Time", 0.001],
    ["m/s", "Speed", 1],
    ["ml", "Volume", 0.001],
    ["deg_c", "Temperature", 1],
  ] as const)("%s is %s worth %d in SI", (unit, dimension, toSI) => {
    expect(UNITS[unit]).toEqual({ dimension, toSI });
  });

  it("converts degrees and km/h correctly", () => {
    expect(UNITS["deg"]?.toSI).toBeCloseTo(0.0174533, 6);
    expect(UNITS["deg/s"]?.toSI).toBeCloseTo(0.0174533, 6);
    expect(UNITS["km/h"]?.toSI).toBeCloseTo(0.277778, 6);
  });

  it("is case-sensitive", () => {
    expect(isUnit("N")).toBe(true);
    expect(isUnit("n")).toBe(false);
    expect(isUnit("L")).toBe(false);
  });

  it("does not treat built-in object names as units", () => {
    expect(isUnit("toString")).toBe(false);
    expect(isUnit("constructor")).toBe(false);
  });

  it("only suggests real units for misspellings", () => {
    for (const target of Object.values(UNIT_MISSPELLINGS)) {
      expect(isUnit(target)).toBe(true);
    }
    expect(UNIT_MISSPELLINGS["mms"]).toBe("mm/s");
    expect(UNIT_MISSPELLINGS["cdeg"]).toBe("deg_c");
  });
});
