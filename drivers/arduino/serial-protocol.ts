// Company: Arduino
// The simple serial text protocol of the Arduino rover: one short line per command, in whole
// millimetres and hundredths of a degree, so the board only needs whole numbers.

/** Whole millimetres from metres. The difference is far below the rover's repeatability (D39). */
export const mm = (metres: number): number => Math.round(metres * 1000);

/** Whole hundredths of a degree from radians. */
export const centidegrees = (radians: number): number => Math.round((radians * 18000) / Math.PI);

/** F (forward) or B (backward) a distance in mm at a speed in mm/s; "-" drives until stopped. */
export function driveLine(metres: number | null, direction: "forward" | "backward", speed: number): string {
  const letter = (metres === null ? direction === "forward" : metres >= 0) ? "F" : "B";
  return `${letter} ${metres === null ? "-" : Math.abs(mm(metres))} ${mm(speed)}`;
}

/** L (left, anticlockwise) or R (right) by an angle, at a turning speed, both in hundredths of a degree. */
export function turnLine(radians: number, speed: number): string {
  return `${radians >= 0 ? "L" : "R"} ${Math.abs(centidegrees(radians))} ${centidegrees(speed)}`;
}

/** Q asks for a reading: DF the distance in front, BAT the battery, ST the state, POS the position. */
export const QUERIES: Readonly<Record<string, string>> = {
  distance_front: "Q DF",
  battery: "Q BAT",
  state: "Q ST",
  pose: "Q POS",
};

export const STOP_LINE = "S";

/** The angle from a to b, between -π and π, so the rover always turns the short way. */
export function shortestTurn(from: number, to: number): number {
  let turn = (to - from) % (2 * Math.PI);
  if (turn > Math.PI) turn -= 2 * Math.PI;
  if (turn < -Math.PI) turn += 2 * Math.PI;
  return turn;
}
