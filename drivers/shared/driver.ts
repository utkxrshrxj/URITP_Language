// The shape every robot driver shares: it runs URITP instructions on one robot (a RobotPort),
// says how quickly it stops, and records each protocol line it sends to the robot.

import type { RobotModel, Corner } from "../../src/checker/robot-model.js";
import type { RobotPort } from "../../src/runtime/robot-port.js";

export interface DriverInfo {
  /** Every URITP 0.1 driver runs in simulator mode; none has been tested on real hardware. */
  readonly mode: "simulator";
  /** What the robot can do, from its manifest. */
  readonly model: RobotModel;
  /** The longest STOP may take to halt all motion, in seconds (Guidebook §9.3 rule 5, D20). */
  readonly stoppingTime: number;
  /** The smallest tolerance the robot can keep, in metres; a smaller one is refused, never approximated. */
  readonly repeatability: number;
  /** The corners of each forbidden zone the manifest names, from the site where the robot works. */
  readonly zones: Readonly<Record<string, readonly Corner[]>>;
}

/** Where protocol lines go. In simulator mode they are only recorded; nothing reaches hardware. */
export interface Transport {
  send(line: string): Promise<void>;
  readonly lines: readonly string[];
}

export class RecordingTransport implements Transport {
  readonly lines: string[] = [];

  async send(line: string): Promise<void> {
    this.lines.push(line);
  }
}

export interface Driver extends RobotPort {
  readonly info: DriverInfo;
  readonly transport: Transport;
}
