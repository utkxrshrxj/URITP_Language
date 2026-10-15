// Test helper: checks a program against the made-up test robots, then runs it with fake robots
// on a clock 1000 times faster than real time, and returns what happened.
import { expect } from "vitest";
import { check } from "../../src/checker/checker.js";
import { formatDiagnostic } from "../../src/diagnostics/diagnostic.js";
import { parse } from "../../src/parser/parser.js";
import { realClock } from "../../src/runtime/clock.js";
import { Runner, type RunResult } from "../../src/runtime/runner.js";
import { MODELS } from "../checker/models.js";
import { FakeRobot, type Response } from "./fake-robot.js";

export const lines = (...source: string[]): string => source.join("\n");

export interface Run {
  readonly result: RunResult;
  readonly robots: Record<string, FakeRobot>;
  readonly logs: string[];
  readonly alerts: string[];
}

export interface Setup {
  /** How each robot answers, by its name in the program. Every robot named here is connected. */
  readonly robots: Record<string, (line: string) => Response>;
  readonly site?: string;
  /** Called once the run has started, to stop it from outside for example. */
  readonly whileRunning?: (runner: Runner) => Promise<void>;
}

export async function run(source: string, setup: Setup): Promise<Run> {
  const parsed = parse(source);
  expect(parsed.diagnostics.map((d) => formatDiagnostic(d))).toEqual([]);
  const siteMaps = setup.site === undefined ? [] : [{ name: "site.uritp", source: setup.site }];
  const checked = check(parsed.program, { robots: (name) => MODELS[name], siteMaps });
  expect(checked.diagnostics.filter((d) => d.severity === "error").map((d) => formatDiagnostic(d))).toEqual([]);

  const clock = realClock({ speed: 1000 });
  const robots: Record<string, FakeRobot> = {};
  for (const [name, respond] of Object.entries(setup.robots)) robots[name] = new FakeRobot(clock, respond);
  const models = new Map(Object.keys(setup.robots).map((name) => [name, MODELS[name]!]));
  const logs: string[] = [];
  const alerts: string[] = [];
  const runner = new Runner({
    program: parsed.program,
    models,
    robots,
    siteMaps,
    clock,
    output: { log: (t) => logs.push(t), alert: (t) => alerts.push(t) },
    pollInterval: 0.5,
  });
  const running = runner.run();
  if (setup.whileRunning !== undefined) await setup.whileRunning(runner);
  return { result: await running, robots, logs, alerts };
}
