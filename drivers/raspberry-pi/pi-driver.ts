// Company: Raspberry Pi
// A simulated driver for a rover built on a Raspberry Pi. Each instruction becomes a JSON command
// message for a motor, camera, sensor or system service on the Pi. Not tested on real hardware.

import { field, formatNumber, type FieldValue, type Instruction } from "../../src/codegen/instruction.js";
import { SimulatedDriver, type DriverOptions } from "../shared/base-driver.js";
import type { Plan } from "../shared/simulator.js";

/** One command message for a service on the Pi. Numbers are in SI units: metres, radians, seconds. */
export type CommandMessage = { readonly service: "motors" | "camera" | "sensors" | "system"; readonly command: string } & Readonly<
  Record<string, string | number>
>;

const numberOf = (value: FieldValue | undefined): number | null => (value?.kind === "number" ? value.value : null);
const wordOf = (value: FieldValue | undefined): string => (value?.kind === "word" ? value.value : "");
/** A number without floating-point leftovers, so 0.1 is sent as 0.1. */
const si = (n: number): number => Number(formatNumber(n));

/** Writes a message as one line of JSON, the form the Pi's services read. */
export function writeMessage(message: CommandMessage): string {
  return JSON.stringify(message);
}

export class RaspberryPiDriver extends SimulatedDriver {
  constructor(options: DriverOptions) {
    // Illustrative values: replace with datasheet values for your motors and wheels.
    super(options, { stoppingTime: 0.3, repeatability: 0.01 });
  }

  protected stopLine(): string {
    return writeMessage({ service: "motors", command: "stop" });
  }

  protected translate(instr: Instruction, plan: Plan): string[] {
    return this.messages(instr, plan).map(writeMessage);
  }

  /** The command messages that carry out one instruction. */
  messages(instr: Instruction, plan: Plan): CommandMessage[] {
    const get = (key: string): FieldValue | undefined => field(instr, key);
    const speed = numberOf(get("speed"));
    const withSpeed = (message: CommandMessage): CommandMessage => (speed === null ? message : { ...message, speed: si(speed) });
    const goTo = (pose: { x: number; y: number; yaw: number }): CommandMessage =>
      withSpeed({ service: "motors", command: "go_to", x: si(pose.x), y: si(pose.y), heading: si(pose.yaw) });

    switch (instr.name) {
      case "MOVE": {
        const via = get("via");
        const waypoints = via?.kind === "list" ? via.items.flatMap((i) => (i.kind === "pose" ? [goTo(i.pose)] : [])) : [];
        return plan.target === undefined ? waypoints : [...waypoints, goTo(plan.target)];
      }
      case "DRIVE": {
        const distance = numberOf(get("distance"));
        return [withSpeed(distance === null ? { service: "motors", command: "drive", direction: wordOf(get("direction")) } : { service: "motors", command: "drive", distance: si(distance) })];
      }
      case "TURN":
        return [withSpeed({ service: "motors", command: "turn", angle: si(numberOf(get("angle")) ?? 0) })];
      case "SENSE": {
        const sensor = wordOf(get("sensor"));
        const save = get("save");
        const analyse = get("analyse");
        if (save?.kind === "text") return [{ service: "camera", command: "capture", file: save.value }];
        if (analyse?.kind === "object") return [{ service: "camera", command: "analyse", object: analyse.name }];
        if (["battery", "state", "pose"].includes(sensor)) return [{ service: "system", command: "read", value: sensor }];
        if (sensor.includes(".")) {
          const [object = "", property = ""] = sensor.split(".");
          return [{ service: "camera", command: "locate", object, property }];
        }
        return [{ service: "sensors", command: "read", sensor }];
      }
      case "STATUS":
        return [{ service: "system", command: "read", value: "state" }];
      default:
        return []; // WAIT is timed by the driver itself; nothing needs to reach the services
    }
  }
}
