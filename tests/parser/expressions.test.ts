// Tests parsing of values: literals, dotted names, calls, lists and operators in the right order.
// Also checks the E1xx errors for chained comparisons, misplaced arguments and missing values.
import { describe, expect, it } from "vitest";
import { parseExpressionSource } from "../../src/parser/parser.js";
import { show } from "./show.js";

function parsed(source: string): string {
  const { expression, diagnostics } = parseExpressionSource(source);
  expect(diagnostics).toEqual([]);
  if (expression === null) throw new Error("no expression");
  return show(expression);
}

function codes(source: string): string[] {
  return parseExpressionSource(source).diagnostics.map((d) => d.code);
}

describe("literals and names", () => {
  it.each([
    ["3", "3"],
    ["0.5", "0.5"],
    ["10cm", "10cm"],
    ["25%", "25%"],
    ["true", "true"],
    ['"Parcel for you"', '"Parcel for you"'],
    ['"Hot spot at {checkpoint.name}"', '"Hot spot at {checkpoint.name}"'],
    ["cup", "cup"],
  ])("reads %s", (source, expected) => {
    expect(parsed(source)).toBe(expected);
  });

  it("keeps positions", () => {
    expect(parseExpressionSource("  \n  ").expression).toBeNull();
    expect(parseExpressionSource("rover.base").expression).toMatchObject({ kind: "Member", line: 1, column: 1 });
  });
});

describe("dotted names, calls and lists", () => {
  it.each([
    ["rover.tray.loaded", "rover.tray.loaded"],
    ["obj.above(10cm)", "obj.above(10cm)"],
    ['dog.sense("thermal").max', 'dog.sense("thermal").max'],
    ["field.row(4).plants", "field.row(4).plants"],
    ["now()", "now()"],
    ["pose(4.2m, 1.0m, 0m, yaw=90deg)", "pose(4.2m, 1.0m, 0m, yaw=90deg)"],
    ["examplecorp.adaptive_weld(route.seam, current=180A)", "examplecorp.adaptive_weld(route.seam, current=180A)"],
    ["to(1.2m, cm)", "to(1.2m, cm)"],
    ["[places.a, places.b]", "[places.a, places.b]"],
    ["[]", "[]"],
  ])("reads %s", (source, expected) => {
    expect(parsed(source)).toBe(expected);
  });
});

describe("operator order", () => {
  it.each([
    ["10cm + 5mm", "(+ 10cm 5mm)"],
    ["1m - 20cm + 5cm", "(+ (- 1m 20cm) 5cm)"],
    ["-5cm", "(- 5cm)"],
    ["- -2", "(- (- 2))"],
    ["a + -b", "(+ a (- b))"],
    ["distance < 20cm", "(< distance 20cm)"],
    ["a + b >= c - d", "(>= (+ a b) (- c d))"],
    ['rover.state == "idle"', '(== rover.state "idle")'],
    ["not rover.tray.loaded", "(not rover.tray.loaded)"],
    ["not a and b", "(and (not a) b)"],
    ["a or b and c", "(or a (and b c))"],
    ["a and b or c", "(or (and a b) c)"],
    ["(a or b) and c", "(and (or a b) c)"],
    ["drone.battery < 25% or not x", "(or (< drone.battery 25%) (not x))"],
    ["not a < b", "(not (< a b))"],
    ["mug.fill >= 80%", "(>= mug.fill 80%)"],
  ])("reads %s as %s", (source, expected) => {
    expect(parsed(source)).toBe(expected);
  });
});

describe("expression errors", () => {
  it("rejects chained comparisons", () => {
    expect(codes("a < b < c")).toEqual(["E125"]);
  });

  it("rejects a plain argument after a named one", () => {
    expect(codes("pose(1m, yaw=90deg, 2m)")).toEqual(["E126"]);
  });

  it("rejects a keyword after a dot", () => {
    expect(codes("places.place")).toEqual(["E123"]);
  });

  it("rejects ask inside a value", () => {
    expect(codes('1 + ask "q"')).toEqual(["E129"]);
  });

  it("rejects calling something that is not a name", () => {
    expect(codes("5(2)")).toEqual(["E120"]);
  });

  it.each(["", "a +", "(a", "[a, b", "pose(1m,", "+"])("reports a missing value in %j", (source) => {
    expect(codes(source)).toEqual(["E120"]);
  });

  it("explains what was found", () => {
    const d = parseExpressionSource("a +").diagnostics[0];
    expect(d?.args).toMatchObject({ expected: "a value", found: "the end of the line" });
  });
});
