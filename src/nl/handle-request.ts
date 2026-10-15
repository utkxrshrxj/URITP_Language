// Handles one spoken or typed request from start to finish: translate it, check the program
// against each robot's manifest and the site map, and run it only if every check passes.
// The checker is always the gatekeeper, so a request can never make a robot do anything a
// written URITP program could not (Guidebook §9.4).

import type { SourceFile } from "../checker/checker.js";
import { checkManifest } from "../checker/manifest.js";
import type { Diagnostic } from "../diagnostics/diagnostic.js";
import { parse } from "../parser/parser.js";
import type { Clock } from "../runtime/clock.js";
import type { RobotPort } from "../runtime/robot-port.js";
import { runProgram } from "../runtime/run-program.js";
import type { RunOutput, RunResult, Runner } from "../runtime/runner.js";
import type { RobotDescription, Translator } from "./translator.js";

/** One connected robot: where it is, what it can do, and how to talk to it. */
export interface ConnectedRobot {
  readonly address: string;
  readonly manifest: SourceFile;
  readonly port: RobotPort;
}

export interface RequestInput {
  /** What the person said or typed. */
  readonly text: string;
  readonly translator: Translator;
  /** Each connected robot, by its name in programs. */
  readonly robots: Readonly<Record<string, ConnectedRobot>>;
  readonly siteMaps?: readonly SourceFile[];
  readonly clock?: Clock;
  readonly output?: RunOutput;
  readonly pollInterval?: number;
  /** Called once the program starts, so an operator can press stop. */
  readonly onStart?: (runner: Runner) => void;
}

export type RequestOutcome =
  /** The translator could not turn the request into a program. Nothing moved. */
  | { readonly stage: "not-understood"; readonly reason: string; readonly language: string }
  /** A program was written, but a check failed, so it never ran. Nothing moved. */
  | { readonly stage: "rejected"; readonly program: string; readonly explanation: string; readonly language: string; readonly diagnostics: Diagnostic[] }
  /** The program passed every check and ran. */
  | {
      readonly stage: "ran";
      readonly program: string;
      readonly explanation: string;
      readonly language: string;
      readonly diagnostics: Diagnostic[];
      readonly result: RunResult;
    };

/** The names of the places, zones and routes the site maps define. */
function siteNames(siteMaps: readonly SourceFile[]): { places: string[]; zones: string[]; routes: string[] } {
  const names = { places: [] as string[], zones: [] as string[], routes: [] as string[] };
  for (const file of siteMaps) {
    for (const statement of parse(file.source).program.statements) {
      if (statement.kind !== "Define") continue;
      (statement.what === "place" ? names.places : statement.what === "zone" ? names.zones : names.routes).push(statement.name);
    }
  }
  return names;
}

export async function handleRequest(input: RequestInput): Promise<RequestOutcome> {
  const siteMaps = input.siteMaps ?? [];

  // The translator is told what each robot can do, from its manifest.
  const descriptions: RobotDescription[] = [];
  const manifestProblems: Diagnostic[] = [];
  for (const [name, robot] of Object.entries(input.robots)) {
    const checked = checkManifest(robot.manifest.source, robot.manifest.name);
    manifestProblems.push(...checked.diagnostics);
    if (checked.model !== null) descriptions.push({ name, address: robot.address, model: checked.model });
  }
  if (manifestProblems.length > 0) {
    return { stage: "rejected", program: "", explanation: "A robot's manifest has problems.", language: "en", diagnostics: manifestProblems };
  }

  const translation = await input.translator.translate({ text: input.text, robots: descriptions, ...siteNames(siteMaps) });
  if (!translation.ok) return { stage: "not-understood", reason: translation.reason, language: translation.language };

  // The program goes through exactly the same checks as one a person wrote by hand.
  const manifests: Record<string, SourceFile> = {};
  const ports: Record<string, RobotPort> = {};
  for (const [name, robot] of Object.entries(input.robots)) {
    manifests[name] = robot.manifest;
    ports[name] = robot.port;
  }
  const { diagnostics, result } = await runProgram({
    program: { name: "request.uritp", source: translation.program },
    manifests,
    siteMaps,
    robots: ports,
    ...(input.clock === undefined ? {} : { clock: input.clock }),
    ...(input.output === undefined ? {} : { output: input.output }),
    ...(input.pollInterval === undefined ? {} : { pollInterval: input.pollInterval }),
    ...(input.onStart === undefined ? {} : { onStart: input.onStart }),
  });
  const { program, explanation, language } = translation;
  if (result === null) return { stage: "rejected", program, explanation, language, diagnostics };
  return { stage: "ran", program, explanation, language, diagnostics, result };
}
