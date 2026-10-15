// Tests fixed positions in metres and the point-in-zone test used for forbidden zones.
// Positions that depend on the robot or its sensors must be left unknown.
import { describe, expect, it } from "vitest";
import { constantPoint, constantPolygon, insidePolygon } from "../../src/checker/geometry.js";
import { parseExpressionSource } from "../../src/parser/parser.js";

function expr(source: string) {
  const { expression } = parseExpressionSource(source);
  if (expression === null) throw new Error("did not parse");
  return expression;
}

const square = [
  { x: 10, y: 0 },
  { x: 14, y: 0 },
  { x: 14, y: 6 },
  { x: 10, y: 6 },
];

describe("constantPoint", () => {
  it.each([
    ["pose(4.2m, 100cm, 0m, yaw=90deg)", { x: 4.2, y: 1, z: 0 }],
    ["pose(1m, -2m, 0m)", { x: 1, y: -2, z: 0 }],
    ["pose(1m, 2m, 0m).above(10cm)", { x: 1, y: 2, z: 0.1 }],
    ["pose(1m, 2m, 0.5m).at_height(3m)", { x: 1, y: 2, z: 3 }],
    ["pose(1m, 2m, 0m).offset(1m, 0m, 0m)", { x: 2, y: 2, z: 0 }],
  ])("works out %s", (source, point) => {
    const result = constantPoint(expr(source));
    expect(result?.x).toBeCloseTo(point.x, 9);
    expect(result?.y).toBeCloseTo(point.y, 9);
    expect(result?.z).toBeCloseTo(point.z, 9);
  });

  it("looks up places", () => {
    expect(constantPoint(expr("places.lab.above(1m)"), (n) => (n === "lab" ? { x: 5, y: 2, z: 0 } : null))).toEqual({ x: 5, y: 2, z: 1 });
  });

  it.each(["cup", "cup.above(10cm)", "pose(1m, 2m, 0m).beside(10cm)", "rover.pose", "pose(gap, 0m, 0m)"])(
    "leaves %s unknown",
    (source) => {
      expect(constantPoint(expr(source))).toBeNull();
    },
  );
});

describe("zones", () => {
  it("reads the corners of a fixed polygon", () => {
    expect(constantPolygon(expr("polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m))"))).toEqual(square.slice(0, 3));
    expect(constantPolygon(expr("polygon(pose(10m, 0m, 0m), cup, pose(14m, 6m, 0m))"))).toBeNull();
  });

  it("finds points inside, outside and on the edge", () => {
    expect(insidePolygon({ x: 12, y: 3 }, square)).toBe(true);
    expect(insidePolygon({ x: 9, y: 3 }, square)).toBe(false);
    expect(insidePolygon({ x: 10, y: 3 }, square)).toBe(true);
    expect(insidePolygon({ x: 14, y: 6 }, square)).toBe(true);
  });
});
