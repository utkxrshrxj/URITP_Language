// The URITP conformance test set (Guidebook §9.3): ten rules a robot driver must meet to be called
// URITP-compatible. It works with any driver and names no company; each rule gives a plain result.

import { checkManifest } from "../src/checker/manifest.js";
import type { Corner, RobotModel } from "../src/checker/robot-model.js";
import { instruction, num, text, word, type FieldValue, type Instruction, type PoseSI } from "../src/codegen/instruction.js";
import { realClock, type Clock } from "../src/runtime/clock.js";
import { lifecycleProblem, runTask, type TaskOutcome } from "../src/runtime/robot-port.js";
import { toSI } from "../src/stdlib/quantity.js";
import type { DriverOptions } from "../drivers/shared/base-driver.js";
import type { Driver } from "../drivers/shared/driver.js";
import type { CreateDriver } from "../drivers/shared/plain-driver.js";

export interface ConformanceTarget {
  /** A name for the report, like the driver's folder. */
  readonly name: string;
  /** The robot's manifest file, as text. */
  readonly manifest: string;
  readonly createDriver: CreateDriver;
  /** Corners of the zones the manifest forbids by name, from the site where the robot works. */
  readonly zones?: Readonly<Record<string, readonly Corner[]>>;
}

export interface RuleResult {
  readonly rule: number;
  readonly title: string;
  readonly passed: boolean;
  /** What went wrong, in plain words; empty when the rule passed. */
  readonly problems: readonly string[];
}

/** An object placed where every simulated robot can find and reach it. */
const TEST_OBJECT = "conformance_box";
const pose = (x: number, y: number, z: number): PoseSI => ({ x, y, z, roll: 0, pitch: 0, yaw: 0 });

/** A fresh driver on a fast clock, with a test object it can find. */
function fresh(target: ConformanceTarget, model: RobotModel): { driver: Driver; clock: Clock } {
  const clock = realClock({ speed: 1000 });
  const options: DriverOptions = {
    model,
    clock,
    ...(target.zones === undefined ? {} : { zones: target.zones }),
    simulator: { objects: { [TEST_OBJECT]: { pose: pose(0.3, 0, 0.05) } } },
  };
  return { driver: target.createDriver(options), clock };
}

/** A pose the frame can take: on the floor for a floor frame, within reach for an arm. */
function reachablePose(model: RobotModel, frame: string): PoseSI {
  const f = model.frames[frame];
  if (f?.type === "pose2d") return pose(0.2, 0, 0);
  const reach = f?.reach === undefined ? 0.5 : toSI(f.reach);
  return pose(reach * 0.4, 0, reach * 0.2);
}

const poseField = (p: PoseSI): FieldValue => ({ kind: "pose", pose: p });

/** One instruction for core and each profile the robot declares (rule 2). */
function requiredInstructions(model: RobotModel): { profile: string; instr: Instruction }[] {
  const frame = Object.keys(model.frames)[0] ?? "base";
  const actuator = Object.entries(model.actuators)[0];
  const sensor = Object.keys(model.sensors)[0];
  const list: { profile: string; instr: Instruction }[] = [
    { profile: "core", instr: instruction("MOVE", { frame: word(frame), target: poseField(reachablePose(model, frame)) }) },
    { profile: "core", instr: instruction("WAIT", { duration: num(0.1) }) },
    { profile: "core", instr: instruction("SENSE", { sensor: word("battery") }) },
    { profile: "core", instr: instruction("SENSE", { sensor: word("state") }) },
    { profile: "core", instr: instruction("SENSE", { sensor: word("pose") }) },
    { profile: "core", instr: instruction("STATUS") },
  ];
  const has = (profile: string): boolean => model.profiles.includes(profile);
  if (has("navigation")) {
    list.push({ profile: "navigation", instr: instruction("DRIVE", { frame: word(frame), distance: num(0.1) }) });
    list.push({ profile: "navigation", instr: instruction("TURN", { frame: word(frame), angle: num(0.5) }) });
  }
  if (has("legged") && !has("navigation")) list.push({ profile: "legged", instr: instruction("TURN", { frame: word(frame), angle: num(0.5) }) });
  if (has("manipulation") && actuator !== undefined) {
    const [name, a] = actuator;
    for (const state of ["open", "closed"].filter((s) => a.states.includes(s))) {
      list.push({ profile: "manipulation", instr: instruction("ACTUATE", { actuator: word(name), state: word(state) }) });
    }
    list.push({ profile: "manipulation", instr: instruction("SKILL", { name: word("pick"), object: { kind: "object", name: TEST_OBJECT, helpers: [] } }) });
    list.push({ profile: "manipulation", instr: instruction("SKILL", { name: word("place"), target: poseField(reachablePose(model, frame)), frame: word(frame) }) });
  }
  if (has("vision") && sensor !== undefined) {
    list.push({ profile: "vision", instr: instruction("SENSE", { sensor: word(sensor), save: text("conformance.jpg") }) });
  }
  if (has("speech")) list.push({ profile: "speech", instr: instruction("SAY", { text: text("conformance check") }) });
  if (has("flight")) {
    list.push({ profile: "flight", instr: instruction("SKILL", { name: word("takeoff"), height: num(1) }) });
    list.push({ profile: "flight", instr: instruction("SKILL", { name: word("land") }) });
  }
  return list;
}

/** Instructions this robot cannot do, which it must refuse with an E4xx reason (rule 4). */
function impossibleInstructions(model: RobotModel): Instruction[] {
  const list: Instruction[] = [
    instruction("MOVE", { frame: word("conformance_missing_frame"), target: poseField(pose(0, 0, 0)) }),
    instruction("EXT", { name: word("conformance.not_listed") }),
  ];
  if (!model.profiles.includes("flight")) list.push(instruction("SKILL", { name: word("takeoff"), height: num(1) }));
  if (!model.profiles.includes("speech")) list.push(instruction("SAY", { text: text("hello") }));
  if (!model.profiles.includes("navigation")) list.push(instruction("DRIVE", { frame: word(Object.keys(model.frames)[0] ?? "base"), distance: num(1) }));
  return list;
}

const name = (instr: Instruction): string => (instr.name === "SKILL" ? `SKILL ${(instr.fields[0]?.[1] as { value: string }).value}` : instr.name);

/** Runs all ten rules against one driver. */
export async function runConformance(target: ConformanceTarget): Promise<RuleResult[]> {
  const results: RuleResult[] = [];
  const add = (rule: number, title: string, problems: string[]): void => {
    results.push({ rule, title, passed: problems.length === 0, problems });
  };

  // Rule 1: a correct manifest that lists everything the robot accepts.
  const manifest = checkManifest(target.manifest);
  const model = manifest.model;
  add(1, "Manifest", manifest.diagnostics.map((d) => `manifest problem ${d.code} on line ${d.line}`));
  if (model === null) return results;

  // Rules 2 and 3: every core and profile instruction is accepted, with a correct task lifecycle.
  const { driver } = fresh(target, model);
  const outcomes: { profile: string; instr: Instruction; outcome: TaskOutcome }[] = [];
  for (const { profile, instr } of requiredInstructions(model)) outcomes.push({ profile, instr, outcome: await runTask(driver, instr) });
  add(2, "Core and declared profiles", outcomes.filter((o) => o.outcome.state !== "succeeded").map((o) => `${o.profile}: ${name(o.instr)} ended ${o.outcome.state} (${o.outcome.reason})`));

  // Rule 4: anything it cannot do exactly is refused at once with an E4xx reason.
  const refusals: string[] = [];
  for (const instr of impossibleInstructions(model)) {
    const outcome = await runTask(fresh(target, model).driver, instr);
    if (!outcome.rejected || !/^E4\d\d /.test(outcome.reason)) refusals.push(`${name(instr)} was not refused with an E4xx reason (${outcome.state}: ${outcome.reason || "no reason"})`);
    outcomes.push({ profile: "refused", instr, outcome });
  }
  const lifecycle = outcomes.flatMap((o) => {
    const problem = lifecycleProblem(o.outcome.states);
    return problem === null ? [] : [`${name(o.instr)}: ${problem}`];
  });
  add(3, "Task lifecycle", lifecycle);
  add(4, "No silent approximation", refusals);

  // Rule 5: STOP from any state, within the stated stopping time.
  const stopProblems: string[] = [];
  {
    const { driver: idle } = fresh(target, model);
    await idle.stop(); // STOP while nothing is running must simply work
    const { driver: busy, clock } = fresh(target, model);
    const task = runTask(busy, instruction("WAIT", { duration: num(3600) }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const before = clock.now();
    await busy.stop();
    const outcome = await task;
    const took = clock.now() - before;
    if (outcome.state !== "cancelled") stopProblems.push(`a running task ended ${outcome.state} after STOP, not cancelled`);
    if (took > busy.info.stoppingTime) stopProblems.push(`STOP took ${took.toFixed(3)} s, more than the stated ${busy.info.stoppingTime} s`);
  }
  add(5, "Stop", stopProblems);

  // Rule 6: it enforces its own safety limits, even when an instruction would break them.
  const safetyProblems: string[] = [];
  const frame = Object.keys(model.frames)[0] ?? "base";
  const limit = model.safety?.maxSpeed;
  if (limit !== undefined) {
    const tooFast = instruction("MOVE", { frame: word(frame), target: poseField(reachablePose(model, frame)), speed: num(toSI(limit) * 2) });
    const outcome = await runTask(fresh(target, model).driver, tooFast);
    if (!outcome.rejected || !/^E5\d\d /.test(outcome.reason)) safetyProblems.push(`a MOVE at twice the safety speed was not refused (${outcome.state}: ${outcome.reason})`);
  }
  for (const zone of model.safety?.forbiddenZones ?? []) {
    const corners = zone.kind === "polygon" ? zone.corners : (target.zones?.[zone.name] ?? []);
    if (corners.length < 3) continue;
    const inside = pose(corners.reduce((s, c) => s + c.x, 0) / corners.length, corners.reduce((s, c) => s + c.y, 0) / corners.length, 0);
    const outcome = await runTask(fresh(target, model).driver, instruction("MOVE", { frame: word(frame), target: poseField(inside) }));
    if (!outcome.rejected || !/^E5\d\d /.test(outcome.reason)) safetyProblems.push(`a MOVE into a forbidden zone was not refused (${outcome.state}: ${outcome.reason})`);
  }
  add(6, "Safety envelope", safetyProblems);

  // Rule 7: quantities are read in SI units: a move to a pose in metres ends exactly there.
  const unitProblems: string[] = [];
  {
    const { driver: d } = fresh(target, model);
    const goal = reachablePose(model, frame);
    await runTask(d, instruction("MOVE", { frame: word(frame), target: poseField(goal) }));
    const reading = await runTask(d, instruction("SENSE", { sensor: word("pose") }));
    const at = reading.output?.kind === "reading" && typeof reading.output.value === "object" ? reading.output.value : null;
    if (at === null || Math.abs(at.x - goal.x) > 1e-6 || Math.abs(at.y - goal.y) > 1e-6 || Math.abs(at.z - goal.z) > 1e-6) {
      unitProblems.push(`after a MOVE to (${goal.x}, ${goal.y}, ${goal.z}) m the robot reported ${at === null ? "no position" : `(${at.x}, ${at.y}, ${at.z})`}`);
    }
  }
  add(7, "SI units", unitProblems);

  // Rule 8: every vendor feature is named vendor.feature, listed in the manifest, and accepted.
  const extensionProblems: string[] = [];
  for (const ext of Object.keys(model.extensions)) {
    if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(ext)) extensionProblems.push(`extension '${ext}' is not named vendor.feature in lower case`);
    const outcome = await runTask(fresh(target, model).driver, instruction("EXT", { name: word(ext) }));
    if (outcome.rejected) extensionProblems.push(`the listed extension '${ext}' was refused: ${outcome.reason}`);
  }
  add(8, "Extensions", extensionProblems);

  // Rule 9: a robot whose manifest states no native languages refuses NATIVE (D20).
  const native = await runTask(fresh(target, model).driver, instruction("NATIVE", { language: text("any"), code: text("x") }));
  add(9, "Native code", native.rejected && native.reason.startsWith("E405") ? [] : [`NATIVE was not refused with E405 (${native.state}: ${native.reason})`]);

  // Rule 10: it passes this whole set.
  const failed = results.filter((r) => !r.passed).map((r) => `rule ${r.rule} (${r.title})`);
  add(10, "Conformance tests", failed.length === 0 ? [] : [`failed ${failed.join(", ")}`]);
  return results;
}

/** The results as plain text, one line per rule. */
export function formatResults(name: string, results: readonly RuleResult[]): string {
  const lines = results.map((r) => `${r.passed ? "PASS" : "FAIL"}  rule ${r.rule}: ${r.title}${r.problems.map((p) => `\n        - ${p}`).join("")}`);
  return [`URITP 0.1 conformance: ${name}`, ...lines].join("\n");
}
