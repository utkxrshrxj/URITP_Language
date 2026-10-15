// Company: Universal Robots
// Writes poses and numbers the way URScript does: p[x, y, z, rx, ry, rz] in metres, with the
// orientation as a rotation vector (axis times angle in radians) instead of roll, pitch and yaw.

import { formatNumber, type PoseSI } from "../../src/codegen/instruction.js";

/** Turns roll, pitch and yaw (radians) into a URScript rotation vector [rx, ry, rz]. */
export function rotationVector(roll: number, pitch: number, yaw: number): [number, number, number] {
  // The rotation matrix for yaw about z, then pitch about y, then roll about x.
  const [cr, sr, cp, sp, cy, sy] = [Math.cos(roll), Math.sin(roll), Math.cos(pitch), Math.sin(pitch), Math.cos(yaw), Math.sin(yaw)];
  const m = [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ] as const;
  const trace = m[0][0] + m[1][1] + m[2][2];
  const angle = Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2)));
  if (angle < 1e-9) return [0, 0, 0];
  if (Math.PI - angle < 1e-6) {
    // Half a turn: the axis comes from the diagonal of the matrix.
    const x = Math.sqrt(Math.max(0, (m[0][0] + 1) / 2));
    const y = Math.sqrt(Math.max(0, (m[1][1] + 1) / 2)) * (m[0][1] >= 0 ? 1 : -1);
    const z = Math.sqrt(Math.max(0, (m[2][2] + 1) / 2)) * (m[0][2] >= 0 ? 1 : -1);
    return [x * angle, y * angle, z * angle];
  }
  const k = angle / (2 * Math.sin(angle));
  return [(m[2][1] - m[1][2]) * k, (m[0][2] - m[2][0]) * k, (m[1][0] - m[0][1]) * k];
}

/** A pose as URScript writes it: p[x, y, z, rx, ry, rz]. */
export function urPose(pose: PoseSI): string {
  const [rx, ry, rz] = rotationVector(pose.roll, pose.pitch, pose.yaw);
  return `p[${[pose.x, pose.y, pose.z, rx, ry, rz].map(urNumber).join(", ")}]`;
}

/** A number as URScript writes a float: always with a decimal point, like 0.25 or 2.0. */
export function urNumber(n: number): string {
  const text = formatNumber(Number(n.toFixed(6)));
  return text.includes(".") || text.includes("e") ? text : `${text}.0`;
}
