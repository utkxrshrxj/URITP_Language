// Tests working out fixed values before the program runs, such as 10cm + 5mm = 10.5cm.
// Values that depend on robots or sensors must be left for later.
import { describe, expect, it } from "vitest";
import { evaluateConstant } from "../../src/checker/constants.js";
import { parseExpressionSource } from "../../src/parser/parser.js";
import { format } from "../../src/stdlib/quantity.js";

function value(source: string): string | null {
  const { expression } = parseExpressionSource(source);
  if (expression === null) throw new Error("did not parse");
  const result = evaluateConstant(expression);
  if (result === null) return null;
  if (result.kind === "Quantity") return format(result.quantity);
  return result.kind === "Percent" ? `${result.value}%` : String(result.value);
}

describe("evaluateConstant", () => {
  it.each([
    ["10cm + 5mm", "10.5cm"],
    ["1m - 20cm", "0.8m"],
    ["-5cm", "-5cm"],
    ["to(1.2m, cm)", "120cm"],
    ["round(1.234m, cm)", "123cm"],
    ["30s + 2min", "150s"],
    ["50% + 60%", "110%"],
    ["2 + 3", "5"],
  ])("works out %s = %s", (source, expected) => {
    expect(value(source)).toBe(expected);
  });

  it.each(["rover.battery", "10cm + 2s", "now()", "to(1m, s)", "10cm + 5"])("leaves %s for later", (source) => {
    expect(value(source)).toBeNull();
  });

  it("uses fixed values of names", () => {
    const { expression } = parseExpressionSource("gap + 1cm");
    if (expression === null) throw new Error("did not parse");
    const result = evaluateConstant(expression, (name) =>
      name === "gap" ? { kind: "Quantity", quantity: { value: 5, unit: "mm" } } : null,
    );
    expect(result?.kind === "Quantity" && format(result.quantity)).toBe("15mm");
  });
});
