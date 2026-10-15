// A pretend robot for runner tests: it records every instruction line it gets and answers
// with a scripted response, following the task lifecycle unless told to break it.
import { formatInstruction, type Instruction } from "../../src/codegen/instruction.js";
import { CancelSignal, type Clock } from "../../src/runtime/clock.js";
import type { RobotPort, TaskOutput, TaskUpdate } from "../../src/runtime/robot-port.js";

export interface Response {
  /** Refuse straight away with this reason (§9.3 rule 4). */
  readonly reject?: string;
  /** Accept and run, then fail with this reason. */
  readonly fail?: string;
  /** Seconds the task takes on the program's clock. */
  readonly duration?: number;
  /** Keep running until stopped. */
  readonly hang?: boolean;
  /** Report succeeded without accepted and running first. */
  readonly brokenLifecycle?: boolean;
  readonly output?: TaskOutput;
}

export class FakeRobot implements RobotPort {
  readonly sent: string[] = [];
  stops = 0;
  private readonly running = new Set<CancelSignal>();

  constructor(
    private readonly clock: Clock,
    private readonly respond: (line: string) => Response = () => ({}),
  ) {}

  async run(instr: Instruction, update: (u: TaskUpdate) => void): Promise<void> {
    const line = formatInstruction(instr);
    this.sent.push(line);
    const response = this.respond(line);
    if (response.reject !== undefined) {
      update({ state: "failed", reason: response.reject });
      return;
    }
    if (response.brokenLifecycle === true) {
      update({ state: "succeeded" });
      return;
    }
    update({ state: "accepted" });
    update({ state: "running" });
    const signal = new CancelSignal();
    this.running.add(signal);
    await this.clock.sleep(response.hang === true ? 1e6 : (response.duration ?? 0), signal);
    this.running.delete(signal);
    if (signal.cancelled) update({ state: "cancelled", reason: "STOP" });
    else if (response.fail !== undefined) update({ state: "failed", reason: response.fail });
    else update(response.output === undefined ? { state: "succeeded" } : { state: "succeeded", output: response.output });
  }

  async stop(): Promise<void> {
    this.stops++;
    for (const signal of this.running) signal.cancel("STOP");
  }
}

/** A response with a SENSE reading. */
export const reading = (value: number | string | boolean): Response => ({ output: { kind: "reading", value } });

/** Only the instruction names and fields, without SENSE lines, to compare motion. */
export const motions = (robot: FakeRobot): string[] => robot.sent.filter((line) => !line.startsWith("SENSE"));
