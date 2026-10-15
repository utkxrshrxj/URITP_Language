// Tests unit conversion and arithmetic on quantities, starting with the Guidebook's 10cm + 5mm = 10.5cm.
// Also checks that different dimensions are never mixed.
import { describe, expect, it } from "vitest";
import { add, compare, convert, format, roundTo, subtract, toSI, type Quantity } from "../../src/stdlib/quantity.js";

const q = (value: number, unit: string): Quantity => ({ value, unit });

describe("quantities", () => {
  it("adds 10cm + 5mm to get 10.5cm (Guidebook §3)", () => {
    expect(format(add(q(10, "cm"), q(5, "mm")))).toBe("10.5cm");
  });

  it("keeps the unit of the left value (DECISIONS.md D13)", () => {
    expect(format(add(q(5, "mm"), q(10, "cm")))).toBe("105mm");
    expect(format(add(q(30, "s"), q(2, "min")))).toBe("150s");
    expect(format(subtract(q(1, "m"), q(20, "cm")))).toBe("0.8m");
  });

  it("converts with to(), as in to(1.2m, cm) = 120cm", () => {
    expect(format(convert(q(1.2, "m"), "cm"))).toBe("120cm");
    expect(format(convert(q(3.6, "km/h"), "m/s"))).toBe("1m/s");
    expect(convert(q(180, "deg"), "rad").value).toBeCloseTo(Math.PI, 10);
  });

  it("gives SI values", () => {
    expect(toSI(q(10, "cm"))).toBeCloseTo(0.1, 12);
    expect(toSI(q(2, "min"))).toBe(120);
    expect(toSI(q(250, "ml"))).toBeCloseTo(0.25, 12);
  });

  it("compares across units", () => {
    expect(compare(q(1, "m"), q(100, "cm"))).toBe(0);
    expect(compare(q(3, "m/s"), q(1.5, "m/s"))).toBeGreaterThan(0);
    expect(compare(q(500, "ms"), q(1, "s"))).toBeLessThan(0);
  });

  it("rounds in a given unit", () => {
    expect(format(roundTo(q(1.234, "m"), "cm"))).toBe("123cm");
  });

  it("refuses to mix dimensions", () => {
    expect(() => add(q(10, "cm"), q(2, "s"))).toThrow("cannot convert s to cm");
    expect(() => convert(q(90, "deg"), "deg_c")).toThrow();
  });

  it("refuses unknown units", () => {
    expect(() => toSI(q(5, "mms"))).toThrow("unknown unit 'mms'");
  });
});
