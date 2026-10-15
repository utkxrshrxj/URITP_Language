// Straight-line paths on the floor plan, and whether a path crosses a zone.
// The simulated robots plan only straight lines, so a path that would cross a zone is refused.

import { insidePolygon } from "../../src/checker/geometry.js";
import type { Corner } from "../../src/checker/robot-model.js";

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

/** True if the straight line from a to b touches the zone: an end inside it, or crossing an edge. */
export function crossesZone(a: Point2, b: Point2, corners: readonly Corner[]): boolean {
  if (corners.length < 3) return false;
  if (insidePolygon(a, corners) || insidePolygon(b, corners)) return true;
  for (let i = 0; i < corners.length; i++) {
    const c = corners[i] as Corner;
    const d = corners[(i + 1) % corners.length] as Corner;
    if (segmentsCross(a, b, c, d)) return true;
  }
  return false;
}

function side(p: Point2, q: Point2, r: Point2): number {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

function segmentsCross(a: Point2, b: Point2, c: Point2, d: Point2): boolean {
  const d1 = side(c, d, a);
  const d2 = side(c, d, b);
  const d3 = side(a, b, c);
  const d4 = side(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** The length of a path through the given points, in metres. */
export function pathLength(points: readonly { x: number; y: number; z: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as { x: number; y: number; z: number };
    const b = points[i] as { x: number; y: number; z: number };
    total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return total;
}
