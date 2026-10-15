// Company: Arduino
// A simulated driver for a small rover run by an Arduino board, which writes each instruction as
// lines of a simple serial text protocol. Not tested on real hardware.

import { field, type FieldValue, type Instruction, type PoseSI } from "../../src/codegen/instruction.js";
import { SimulatedDriver, type DriverOptions } from "../shared/base-driver.js";
import type { Plan } from "../shared/simulator.js";
import { driveLine, QUERIES, shortestTurn, STOP_LINE, turnLine } from "./serial-protocol.js";

const numberOf = (value: FieldValue | undefined): number | null => (value?.kind === "number" ? value.value : null);
const wordOf = (value: FieldValue | undefined): string => (value?.kind === "word" ? value.value : "");

export class ArduinoDriver extends SimulatedDriver {
  constructor(options: DriverOptions) {
    // Illustrative values: replace with datasheet values for your motors and wheels.
    super(options, { stoppingTime: 0.2, repeatability: 0.005 });
  }

  protected stopLine(): string {
    return STOP_LINE;
  }

  protected translate(instr: Instruction, plan: Plan): string[] {
    const get = (key: string): FieldValue | undefined => field(instr, key);
    const frame = wordOf(get("frame"));
    const speed = this.world.speedFor(frame, numberOf(get("speed")));
    const turnSpeed = this.world.turnSpeedFor(null);

    switch (instr.name) {
      case "MOVE": {
        // The rover has no "go to" command, so each leg is: turn to face it, drive, then turn to the final heading.
        const via = get("via");
        const stops: PoseSI[] = via?.kind === "list" ? via.items.flatMap((i) => (i.kind === "pose" ? [i.pose] : [])) : [];
        if (plan.target !== undefined) stops.push(plan.target);
        const lines: string[] = [];
        let at = this.world.pose(frame);
        for (const stop of stops) {
          const distance = Math.hypot(stop.x - at.x, stop.y - at.y);
          const heading = distance > 0 ? Math.atan2(stop.y - at.y, stop.x - at.x) : at.yaw;
          const face = shortestTurn(at.yaw, heading);
          if (Math.abs(face) > 1e-9) lines.push(turnLine(face, turnSpeed));
          if (distance > 0) lines.push(driveLine(distance, "forward", speed));
          at = { ...stop, yaw: heading };
        }
        const last = stops[stops.length - 1];
        if (last !== undefined) {
          const finalTurn = shortestTurn(at.yaw, last.yaw);
          if (Math.abs(finalTurn) > 1e-9) lines.push(turnLine(finalTurn, turnSpeed));
        }
        return lines;
      }
      case "DRIVE": {
        const direction = wordOf(get("direction")) === "backward" ? "backward" : "forward";
        return [driveLine(numberOf(get("distance")), direction, speed)];
      }
      case "TURN":
        return [turnLine(numberOf(get("angle")) ?? 0, this.world.turnSpeedFor(numberOf(get("speed"))))];
      case "SENSE": {
        const query = QUERIES[wordOf(get("sensor"))];
        return query === undefined ? [] : [query];
      }
      case "STATUS":
        return [QUERIES["state"] as string];
      default:
        return []; // WAIT is timed by the driver itself
    }
  }
}
