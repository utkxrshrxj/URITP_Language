// Checks a program and, only if it passes every check, runs it. This is the single way to make
// robots move, so an unsafe or impossible program is always rejected before anything moves.

import { checkProgram, type ProgramCheckInput } from "../checker/check-program.js";
import type { Diagnostic } from "../diagnostics/diagnostic.js";
import type { Clock } from "./clock.js";
import type { RobotPort } from "./robot-port.js";
import { Runner, type RunOutput, type RunResult } from "./runner.js";

export interface RunProgramInput extends ProgramCheckInput {
  /** The connection to each robot, by its name in the program. */
  readonly robots: Readonly<Record<string, RobotPort>>;
  readonly clock?: Clock;
  readonly output?: RunOutput;
  readonly pollInterval?: number;
  /** Called with the runner once it starts, so an operator can press stop. */
  readonly onStart?: (runner: Runner) => void;
}

export interface RunProgramResult {
  /** Problems found by the checks; warnings are kept even when the program runs. */
  readonly diagnostics: Diagnostic[];
  /** How the run ended, or null if the program was rejected and never started. */
  readonly result: RunResult | null;
}

export async function runProgram(input: RunProgramInput): Promise<RunProgramResult> {
  const checked = checkProgram(input);
  if (!checked.ok || checked.program === null) return { diagnostics: checked.diagnostics, result: null };
  const runner = new Runner({
    program: checked.program,
    models: checked.models,
    robots: input.robots,
    ...(input.siteMaps === undefined ? {} : { siteMaps: input.siteMaps }),
    ...(input.readFile === undefined ? {} : { readFile: input.readFile }),
    ...(input.clock === undefined ? {} : { clock: input.clock }),
    ...(input.output === undefined ? {} : { output: input.output }),
    ...(input.pollInterval === undefined ? {} : { pollInterval: input.pollInterval }),
  });
  input.onStart?.(runner);
  return { diagnostics: checked.diagnostics, result: await runner.run() };
}
