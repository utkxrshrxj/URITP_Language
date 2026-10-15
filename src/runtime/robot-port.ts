// How the runner talks to one robot: send it one instruction at a time and hear how the task
// goes, or stop it. Drivers (Phase 6) implement this; no driver code lives here.

import type { Instruction, PoseSI } from "../codegen/instruction.js";

/** The states of a task (Guidebook §2): accepted, running, then exactly one final state. */
export type TaskState = "accepted" | "running" | "succeeded" | "failed" | "cancelled";
export type FinalState = "succeeded" | "failed" | "cancelled";

/** What a task gives back besides its state: a sensor reading, an answer, or a yes/no. */
export type TaskOutput =
  | {
      readonly kind: "reading";
      /** The reading in SI units; percents as fractions from 0 to 1 (D14). */
      readonly value: number | string | boolean | PoseSI;
      readonly max?: number;
      readonly min?: number;
      readonly mean?: number;
    }
  | { readonly kind: "answer"; readonly text: string }
  | { readonly kind: "confirmed"; readonly yes: boolean };

export interface TaskUpdate {
  readonly state: TaskState;
  /** Why a task failed or was cancelled, in plain words. */
  readonly reason?: string;
  /** For SENSE, ASK and CONFIRM, given with the succeeded update. */
  readonly output?: TaskOutput;
}

export interface RobotPort {
  /**
   * Runs one instruction as a task. The robot reports each state through `update` and the
   * promise settles once the task has reached its final state.
   */
  run(instruction: Instruction, update: (update: TaskUpdate) => void): Promise<void>;
  /** STOP: stops all motion at once, from any state; a running task ends as cancelled (§9.3 rule 5). */
  stop(): Promise<void>;
}

export interface TaskOutcome {
  readonly state: FinalState;
  readonly reason: string;
  readonly output?: TaskOutput;
  /** True if the robot refused the instruction straight away, without accepting it (§9.3 rule 4). */
  readonly rejected: boolean;
  /** Set when the robot broke the task lifecycle (§9.3 rule 3); the task then counts as failed. */
  readonly brokenLifecycle?: string;
  /** Every state the robot reported, in order. */
  readonly states: readonly TaskState[];
}

const FINAL: readonly TaskState[] = ["succeeded", "failed", "cancelled"];

/**
 * Checks that the reported states follow the task lifecycle (DECISIONS.md D35). Allowed:
 * accepted, running, final; or failed alone (refused straight away); or accepted, cancelled
 * (stopped before it started). Returns a reason if the sequence is broken, otherwise null.
 */
export function lifecycleProblem(states: readonly TaskState[]): string | null {
  const finals = states.filter((s) => FINAL.includes(s));
  if (finals.length === 0) return "the robot never reported a final state";
  if (finals.length > 1) return "the robot reported more than one final state";
  const [first, second, third] = states;
  if (states.length === 1 && first === "failed") return null;
  if (states.length === 2 && first === "accepted" && second === "cancelled") return null;
  if (states.length === 3 && first === "accepted" && second === "running" && FINAL.includes(third as TaskState)) return null;
  return `the robot reported ${states.join(", ")} instead of accepted, running and one final state`;
}

/** Runs one instruction on a robot and checks its task lifecycle. Never throws. */
export async function runTask(port: RobotPort, instr: Instruction): Promise<TaskOutcome> {
  const updates: TaskUpdate[] = [];
  let thrown: string | null = null;
  try {
    await port.run(instr, (u) => updates.push(u));
  } catch (error) {
    thrown = error instanceof Error ? error.message : String(error);
  }
  const states = updates.map((u) => u.state);
  const final = updates.find((u) => FINAL.includes(u.state));
  if (thrown !== null && final === undefined) {
    return { state: "failed", reason: thrown, rejected: false, brokenLifecycle: "the robot stopped answering", states };
  }
  const problem = lifecycleProblem(states);
  if (problem !== null || final === undefined) {
    return { state: "failed", reason: problem ?? "", rejected: false, brokenLifecycle: problem ?? "", states };
  }
  const outcome: TaskOutcome = {
    state: final.state as FinalState,
    reason: final.reason ?? "",
    rejected: states.length === 1,
    states,
  };
  return final.output === undefined ? outcome : { ...outcome, output: final.output };
}
