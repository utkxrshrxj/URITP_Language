// Company: Universal Robots
// A simulated driver for a Universal Robots arm that writes each instruction as URScript-style text.
// Not tested on real hardware: the lines are recorded, never sent to a robot.

import type { Instruction } from "../../src/codegen/instruction.js";
import { field, type FieldValue } from "../../src/codegen/instruction.js";
import { SimulatedDriver, type DriverOptions } from "../shared/base-driver.js";
import type { Plan } from "../shared/simulator.js";
import { urNumber, urPose } from "./urscript.js";

/** Tool acceleration used in every move, in m/s². Illustrative: replace with datasheet values. */
const ACCELERATION = 1.2;
/** Deceleration used by stopl when stopping, in m/s². Illustrative: replace with datasheet values. */
const STOP_DECELERATION = 3.0;

const numberOf = (value: FieldValue | undefined): number | null => (value?.kind === "number" ? value.value : null);
const wordOf = (value: FieldValue | undefined): string => (value?.kind === "word" ? value.value : "");
const textOf = (value: FieldValue | undefined): string => (value?.kind === "text" ? value.value : value?.kind === "condition" ? value.text : "");

export class UniversalRobotsDriver extends SimulatedDriver {
  constructor(options: DriverOptions) {
    // Illustrative values: replace with datasheet values. Stopping time is how long STOP may take.
    super(options, { stoppingTime: 0.5, repeatability: 0.00003 });
  }

  protected stopLine(): string {
    return `stopl(${urNumber(STOP_DECELERATION)})`;
  }

  protected translate(instr: Instruction, plan: Plan): string[] {
    const get = (key: string): FieldValue | undefined => field(instr, key);
    const speed = numberOf(get("speed"));
    const move = (pose: Plan["target"]): string =>
      pose === undefined ? "" : `movel(${urPose(pose)}, a=${urNumber(ACCELERATION)}${speed === null ? "" : `, v=${urNumber(speed)}`})`;

    switch (instr.name) {
      case "MOVE": {
        const via = get("via");
        const waypoints = via?.kind === "list" ? via.items.flatMap((i) => (i.kind === "pose" ? [move(i.pose)] : [])) : [];
        return [...waypoints, move(plan.target)];
      }
      case "ACTUATE": {
        // gripper_open and gripper_close stand for the functions of the gripper fitted to the arm.
        const force = numberOf(get("force"));
        return wordOf(get("state")) === "closed"
          ? [`gripper_close(${force === null ? "" : `force=${urNumber(force)}`})`]
          : ["gripper_open()"];
      }
      case "SKILL": {
        const name = wordOf(get("name"));
        const target = plan.target;
        if (name === "pick" && target !== undefined) {
          const above = { ...target, z: target.z + 0.1 };
          return [move(above), move(target), "gripper_close()", move(above)];
        }
        if (name === "place" && target !== undefined) return [move(target), "gripper_open()"];
        // Other skills stand for a helper function written for the work cell.
        const args = instr.fields.filter(([key]) => key !== "name").map(([key, value]) => `${key}="${textOf(value) || wordOf(value)}"`);
        return [`uritp_${name}(${args.join(", ")})`];
      }
      case "SENSE": {
        const sensor = wordOf(get("sensor"));
        if (sensor === "force") return ["get_tcp_force()"];
        if (sensor === "pose") return ["get_actual_tcp_pose()"];
        if (sensor === "state") return ["is_steady()"];
        return []; // answered by the driver itself, such as the battery of an arm on mains power
      }
      case "WAIT":
        return [`sleep(${urNumber(numberOf(get("duration")) ?? 0)})`];
      case "STATUS":
        return ["is_steady()"];
      default:
        return [];
    }
  }
}
