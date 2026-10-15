// Runs a checked program: it works out loops, conditions, tasks and variables itself and sends
// each robot only instructions (Guidebook §9.2), watching every task's lifecycle as it goes.

import type { RobotModel } from "../checker/robot-model.js";
import type { SourceFile } from "../checker/checker.js";
import { missingProfile } from "../checker/capabilities.js";
import * as codegen from "../codegen/codegen.js";
import { conditionText } from "../codegen/condition.js";
import { formatInstruction, type Instruction } from "../codegen/instruction.js";
import type { Block, Expression, Program, SafetyRule, Statement, TaskStatement } from "../parser/ast.js";
import { parse } from "../parser/parser.js";
import type { Dimension } from "../stdlib/units.js";
import { CancelSignal, realClock, type Clock } from "./clock.js";
import { Evaluator, RunFailure, type RunEnv } from "./evaluate.js";
import { runTask, type FinalState, type RobotPort, type TaskOutput } from "./robot-port.js";
import { NOTHING, poseOf, quantityFromSI, show, type Value } from "./values.js";

/** Where logs and alerts go: to the operator, never to a robot (Guidebook §5). */
export interface RunOutput {
  log(text: string): void;
  alert(text: string): void;
}

/** One thing that happened while running, for the operator and for tests. */
export type TraceEntry =
  | { readonly kind: "instruction"; readonly robot: string; readonly line: number; readonly text: string; readonly state: FinalState; readonly reason: string }
  | { readonly kind: "stop"; readonly robot: string; readonly why: string }
  | { readonly kind: "log"; readonly text: string }
  | { readonly kind: "alert"; readonly text: string };

export interface RunResult {
  /** How the whole program ended: like a task, exactly one of these (Guidebook §2). */
  readonly state: FinalState;
  /** The failure no on fail: handled, with its R7xx code and line (Guidebook §8). */
  readonly error: { readonly code: string; readonly reason: string; readonly line: number } | null;
  /** Why the program was cancelled, if it was. */
  readonly reason: string;
  readonly trace: readonly TraceEntry[];
}

export interface RunOptions {
  readonly program: Program;
  /** Each robot's model from its manifest, by its name in the program. */
  readonly models: ReadonlyMap<string, RobotModel>;
  /** The connection to each robot, by its name in the program. */
  readonly robots: Readonly<Record<string, RobotPort>>;
  /** Connections the safety watcher reads through, when they differ from `robots`. */
  readonly safetyRobots?: Readonly<Record<string, RobotPort>>;
  readonly siteMaps?: readonly SourceFile[];
  readonly readFile?: (path: string) => string | null;
  readonly clock?: Clock;
  readonly output?: RunOutput;
  /** How often, in seconds, wait until checks its condition again. */
  readonly pollInterval?: number;
}

/** The unit a reading is shown in: the SI unit of its dimension. */
const SI_UNIT: Readonly<Record<Dimension, string>> = {
  Length: "m",
  Angle: "rad",
  Time: "s",
  Speed: "m/s",
  AngularSpeed: "rad/s",
  Mass: "kg",
  Force: "N",
  Current: "A",
  Volume: "l",
  Temperature: "deg_c",
};

class Scope {
  private readonly values = new Map<string, Value>();
  constructor(readonly parent: Scope | null) {}
  get(name: string): Value | undefined {
    return this.values.get(name) ?? this.parent?.get(name);
  }
  set(name: string, value: Value): void {
    this.values.set(name, value);
  }
}

/** Where a statement runs: its names, what can cancel it, and the error inside on fail:. */
interface Context {
  readonly scope: Scope;
  readonly signal: CancelSignal;
  readonly error: Value | null;
  readonly line: number;
  /** Robots used by this part of a parallel: block, so they can be stopped if another part fails. */
  readonly activeRobots: Set<string> | null;
  /** True while checking safety rules, so that check does not start another check. */
  readonly checkingSafety?: boolean;
}

/** A safety rule being watched, with the names it could see and whether it was true last time. */
interface WatchedRule {
  readonly rule: SafetyRule;
  readonly ctx: Context;
  wasTrue: boolean;
}

class BreakSignal {}
class ReturnSignal {
  constructor(readonly value: Value) {}
}
/** The program (or one part of a parallel: block) has been cancelled. */
class Cancelled {
  constructor(readonly why: string) {}
}

export class Runner {
  private readonly clock: Clock;
  private readonly global = new Scope(null);
  private readonly tasks = new Map<string, TaskStatement>();
  private readonly site = { places: new Map<string, Value>(), zones: new Map<string, Value>(), route: new Map<string, Value>() };
  /** Cancelled for an emergency stop, a safety rule, a "no" to confirm, or an unhandled failure. */
  private readonly programSignal = new CancelSignal();
  private readonly trace: TraceEntry[] = [];
  /** Robots connected so far, in order. */
  private readonly connected: string[] = [];
  /** Robots stopped by the program's own stop statement: their cancelled task is not a failure (D15). */
  private readonly stoppedByProgram = new Set<string>();
  /** Safety rules being watched while the program runs (Guidebook §5, D37). */
  private readonly rules: WatchedRule[] = [];
  private watching: Promise<void> | null = null;
  private checking: Promise<void> | null = null;
  /** Cancelled when the program has finished, to end the watch on safety rules. */
  private readonly finished = new CancelSignal();

  constructor(private readonly options: RunOptions) {
    this.clock = options.clock ?? realClock();
  }

  /** Runs the program to the end and says how it ended. */
  async run(): Promise<RunResult> {
    const ctx: Context = { scope: this.global, signal: this.programSignal, error: null, line: 0, activeRobots: null };
    try {
      for (const siteMap of this.options.siteMaps ?? []) await this.loadFile(siteMap.source, ctx);
      await this.runStatements(this.options.program, ctx, this.global);
      if (this.programSignal.cancelled) return this.result("cancelled", null);
      return this.result("succeeded", null);
    } catch (thrown) {
      if (thrown instanceof Cancelled || this.programSignal.cancelled) return this.result("cancelled", null);
      if (thrown instanceof RunFailure) {
        // No on fail: handled it: the robots stop safely and the error goes to the operator (§8).
        await this.cancelProgram(`the program failed: ${thrown.reason}`);
        return this.result("failed", { code: thrown.code, reason: thrown.reason, line: thrown.line });
      }
      throw thrown;
    } finally {
      this.finished.cancel("the program has finished");
      await this.watching;
    }
  }

  /** An emergency stop from outside the program: every robot stops and the program is cancelled. */
  async stop(reason = "emergency stop"): Promise<void> {
    await this.cancelProgram(reason);
  }

  private result(state: FinalState, error: RunResult["error"]): RunResult {
    return { state, error, reason: state === "cancelled" ? this.programSignal.reason : "", trace: this.trace };
  }

  // -------------------------------------------------------------------------
  // Blocks and statements
  // -------------------------------------------------------------------------

  /**
   * Runs a block's statements. If a task fails, the rest of the block is skipped and its
   * on fail: runs; if that finishes, the failure is handled (D15).
   */
  private async runStatements(block: Block, ctx: Context, scope = new Scope(ctx.scope)): Promise<void> {
    const inner: Context = { ...ctx, scope };
    try {
      for (const statement of block.statements) await this.runStatement(statement, inner);
    } catch (thrown) {
      if (!(thrown instanceof RunFailure) || block.onFail === null || this.programSignal.cancelled) throw thrown;
      const error: Value = { kind: "error", code: thrown.code, reason: thrown.reason };
      await this.runStatements(block.onFail.body, { ...ctx, error });
    }
  }

  private async runStatement(statement: Statement, outer: Context): Promise<void> {
    if (outer.signal.cancelled) throw new Cancelled(outer.signal.reason);
    const ctx: Context = { ...outer, line: statement.line };
    try {
      await this.execute(statement, ctx);
    } catch (thrown) {
      if (thrown instanceof RunFailure && thrown.line === 0) thrown.line = statement.line;
      throw thrown;
    }
  }

  private async execute(s: Statement, ctx: Context): Promise<void> {
    const value = (expr: Expression): Promise<Value> => this.evaluator(ctx).evaluate(expr);
    const maybe = (expr: Expression | null): Promise<Value | null> => (expr === null ? Promise.resolve(null) : value(expr));

    switch (s.kind) {
      // Program structure
      case "Robot":
        if (this.options.robots[s.name] === undefined) throw new RunFailure("R707", `there is no connection to robot '${s.name}'`);
        ctx.scope.set(s.name, { kind: "robot", robot: s.name });
        this.connected.push(s.name);
        return;
      case "Let":
        ctx.scope.set(s.name, s.value.kind === "Ask" ? await this.ask(s.value.question, s.value.lang, ctx) : await value(s.value));
        return;
      case "Task":
        this.tasks.set(s.name, s);
        return;
      case "Return":
        throw new ReturnSignal(s.value === null ? NOTHING : await value(s.value));
      case "Import": {
        const file = s.path.parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");
        const source = this.options.readFile?.(file) ?? null;
        if (source === null) throw new RunFailure("R707", `cannot read the file '${file}'`);
        await this.loadFile(source, ctx);
        return;
      }
      case "Define": {
        const v = await value(s.value);
        if (s.what === "place") this.site.places.set(s.name, { kind: "place", name: s.name, pose: poseOf(v) ?? { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 } });
        else if (s.what === "zone") this.site.zones.set(s.name, v.kind === "zone" ? { ...v, name: s.name } : v);
        else this.site.route.set(s.name, v);
        return;
      }
      case "CallStatement":
        await value(s.call);
        return;

      // Motion
      case "Move": {
        const frame = await value(s.frame);
        const avoid: Value[] = [];
        for (const zone of s.avoid) avoid.push(await value(zone));
        const instr = codegen.move(frame, await value(s.target), await maybe(s.speed), await maybe(s.tolerance), await maybe(s.via), avoid);
        await this.send(robotOf(frame), instr, ctx);
        return;
      }
      case "Drive": {
        const frame = await value(s.frame);
        await this.send(robotOf(frame), codegen.drive(frame, s.direction, await maybe(s.distance), await maybe(s.speed)), ctx);
        return;
      }
      case "Turn": {
        const frame = await value(s.frame);
        await this.send(robotOf(frame), codegen.turn(frame, await value(s.angle), await maybe(s.speed)), ctx);
        return;
      }
      case "Takeoff": {
        const robot = await value(s.robot);
        await this.send(robotOf(robot), codegen.skill("takeoff", { height: codegen.field(await value(s.height)) }), ctx);
        return;
      }
      case "Land": {
        const robot = await value(s.robot);
        const at = await maybe(s.at);
        await this.send(robotOf(robot), codegen.skill("land", { at: at === null ? null : codegen.field(at) }), ctx);
        return;
      }
      case "Stop":
        await this.stopRobot(robotOf(await value(s.robot)), `stop on line ${s.line}`, true);
        return;

      // Manipulation
      case "Grip": {
        const actuator = await value(s.actuator);
        await this.send(robotOf(actuator), codegen.grip(actuator, s.action, await maybe(s.force)), ctx);
        return;
      }
      case "Pick": {
        const robot = await value(s.robot);
        const onto = await maybe(s.onto);
        const args = { object: codegen.field(await value(s.object)), onto: onto === null ? null : codegen.partField(onto) };
        await this.send(robotOf(robot), codegen.skill("pick", args), ctx);
        return;
      }
      case "Place": {
        const frame = await value(s.frame);
        const args = { object: codegen.field(await value(s.object)), target: codegen.field(await value(s.target)), frame: codegen.partField(frame) };
        await this.send(robotOf(frame), codegen.skill("place", args), ctx);
        return;
      }
      case "Pour": {
        const until = conditionText(s.until, (name) => ctx.scope.get(name));
        if (until === null) throw new RunFailure("R705", "a pour condition may only use objects' properties, fixed values and comparisons");
        const args = { from: codegen.field(await value(s.from)), into: codegen.field(await value(s.into)), until: { kind: "condition" as const, text: until } };
        await this.send(this.robotFor("pour"), codegen.skill("pour", args), ctx);
        return;
      }
      case "Weld": {
        const args = { path: codegen.field(await value(s.path)), speed: codegen.field(await value(s.speed)), current: codegen.field(await value(s.current)) };
        await this.send(this.robotFor("weld"), codegen.skill("weld", args), ctx);
        return;
      }
      case "Spray": {
        const actuator = await value(s.actuator);
        const args = { actuator: codegen.partField(actuator), target: codegen.field(await value(s.target)), amount: codegen.field(await value(s.amount)) };
        await this.send(robotOf(actuator), codegen.skill("spray", args), ctx);
        return;
      }

      // Sensing, data and talking to people
      case "Capture": {
        const sensor = await value(s.sensor);
        const file = show(await value(s.file));
        await this.send(robotOf(sensor), codegen.sense(sensor.kind === "part" ? sensor.part : "camera", { save: file }), ctx);
        return;
      }
      case "Log": {
        const parts: string[] = [];
        for (const v of s.values) parts.push(show(await value(v)));
        const text = parts.join(", ");
        this.trace.push({ kind: "log", text });
        this.options.output?.log(text);
        return;
      }
      case "Alert": {
        const text = show(await value(s.message));
        this.trace.push({ kind: "alert", text });
        this.options.output?.alert(text);
        return;
      }
      case "Say":
        await this.send(this.robotFor("say"), codegen.talk("SAY", show(await value(s.message)), s.lang), ctx);
        return;
      case "Confirm": {
        const output = await this.send(this.robotFor("confirm"), codegen.talk("CONFIRM", show(await value(s.question)), s.lang), ctx);
        if (output?.kind !== "confirmed" || !output.yes) {
          // A no, or no answer, cancels the program safely (§5, D15).
          await this.cancelProgram(`the answer to "${show(await value(s.question))}" was not yes`);
          throw new Cancelled(this.programSignal.reason);
        }
        return;
      }

      // Control flow
      case "If":
        for (const branch of s.branches) {
          if (await this.evaluator(ctx).condition(branch.condition)) {
            await this.runStatements(branch.body, ctx);
            return;
          }
        }
        if (s.elseBody !== null) await this.runStatements(s.elseBody, ctx);
        return;
      case "For": {
        const list = await value(s.list);
        const items = list.kind === "list" ? list.items : [];
        for (const item of items) {
          const scope = new Scope(ctx.scope);
          scope.set(s.variable, item);
          if (await this.loopBody(s.body, { ...ctx, scope })) break;
        }
        return;
      }
      case "Repeat":
        await this.repeat(s, ctx);
        return;
      case "Break":
        throw new BreakSignal();
      case "Wait":
        await this.wait(await value(s.duration), ctx);
        return;
      case "WaitUntil":
        await this.waitUntil(s.condition, await maybe(s.timeout), ctx);
        return;
      case "Parallel":
        await this.parallel(s.body.statements, ctx);
        return;
      case "Native":
        throw new RunFailure("R701", "no URITP 0.1 robot accepts native code");
      case "Safety":
        for (const rule of s.rules) this.rules.push({ rule, ctx: { ...ctx, line: rule.line, checkingSafety: true }, wasTrue: false });
        await this.checkRules();
        this.watching ??= this.watchRules();
        return;
    }
  }

  /** Runs one round of a loop body; returns true if it ended with break. */
  private async loopBody(body: Block, ctx: Context): Promise<boolean> {
    try {
      await this.runStatements(body, ctx);
      return false;
    } catch (thrown) {
      if (thrown instanceof BreakSignal) return true;
      throw thrown;
    }
  }

  private async repeat(s: Extract<Statement, { kind: "Repeat" }>, ctx: Context): Promise<void> {
    if (s.mode === "times") {
      const count = await this.evaluator(ctx).evaluate(s.count as Expression);
      const n = count.kind === "number" ? count.value : 0;
      for (let i = 0; i < n; i++) if (await this.loopBody(s.body, ctx)) return;
      return;
    }
    if (s.mode === "forever") {
      for (;;) if (await this.loopBody(s.body, ctx)) return;
    }
    // repeat every Q: start the body every Q seconds; a late round starts the next one at once.
    const interval = await this.evaluator(ctx).evaluate(s.interval as Expression);
    const seconds = interval.kind === "quantity" ? interval.si : 0;
    for (;;) {
      const start = this.clock.now();
      if (await this.loopBody(s.body, ctx)) return;
      await this.sleep(seconds - (this.clock.now() - start), ctx);
    }
  }

  /**
   * wait Q: with one robot connected it is sent as WAIT, so STOP and on fail treat it like any
   * other task; with several robots the runner waits itself (DECISIONS.md D32).
   */
  private async wait(duration: Value, ctx: Context): Promise<void> {
    const seconds = duration.kind === "quantity" ? duration.si : 0;
    const [only] = this.connected;
    if (this.connected.length === 1 && only !== undefined) await this.send(only, codegen.wait(seconds), ctx);
    else await this.sleep(seconds, ctx);
  }

  /** wait until COND [timeout Q]: the runner checks the condition again and again (D32). */
  private async waitUntil(condition: Expression, timeout: Value | null, ctx: Context): Promise<void> {
    const limit = timeout?.kind === "quantity" ? timeout.si : Infinity;
    const start = this.clock.now();
    const poll = this.options.pollInterval ?? 0.2;
    for (;;) {
      if (await this.evaluator(ctx).condition(condition)) return;
      const waited = this.clock.now() - start;
      if (waited >= limit) {
        throw new RunFailure("R702", `waited ${show(timeout as Value)} but the condition did not become true`);
      }
      await this.sleep(Math.min(poll, limit - waited), ctx);
    }
  }

  private async sleep(seconds: number, ctx: Context): Promise<void> {
    await this.clock.sleep(seconds, ctx.signal);
    if (ctx.signal.cancelled) throw new Cancelled(ctx.signal.reason);
  }

  /**
   * parallel: starts every statement at once and waits for all. If one fails, the others are
   * cancelled and their robots stopped, then the failure moves out (DECISIONS.md D33).
   */
  private async parallel(statements: readonly Statement[], ctx: Context): Promise<void> {
    const signal = new CancelSignal();
    const stopListening = ctx.signal.onCancel(() => signal.cancel(ctx.signal.reason));
    const active = new Set<string>();
    const scope = new Scope(ctx.scope);
    let failure: unknown = null;
    await Promise.all(
      statements.map(async (statement) => {
        try {
          await this.runStatement(statement, { ...ctx, scope, signal, activeRobots: active });
        } catch (thrown) {
          if (thrown instanceof Cancelled && !ctx.signal.cancelled) return; // stopped because another part failed
          if (failure !== null) return;
          failure = thrown;
          signal.cancel("another part of the parallel block failed");
          for (const robot of active) await this.stopRobot(robot, "another part of the parallel block failed", true);
        }
      }),
    );
    stopListening();
    if (failure !== null) throw failure;
  }

  // -------------------------------------------------------------------------
  // Talking to robots
  // -------------------------------------------------------------------------

  /** Sends one instruction as a task and turns its outcome into a value or a failure. */
  private async send(robot: string, instr: Instruction, ctx: Context): Promise<TaskOutput | undefined> {
    const port = (ctx.checkingSafety === true ? this.options.safetyRobots?.[robot] : undefined) ?? this.port(robot);
    if (this.rules.length > 0 && ctx.checkingSafety !== true) await this.checkRules();
    if (this.programSignal.cancelled) throw new Cancelled(this.programSignal.reason);
    if (ctx.signal.cancelled) throw new Cancelled(ctx.signal.reason);
    this.stoppedByProgram.delete(robot);
    ctx.activeRobots?.add(robot);
    const outcome = await runTask(port, instr);
    const text = formatInstruction(instr);
    this.trace.push({ kind: "instruction", robot, line: ctx.line, text, state: outcome.state, reason: outcome.reason });

    if (this.programSignal.cancelled) throw new Cancelled(this.programSignal.reason);
    if (ctx.signal.cancelled) throw new Cancelled(ctx.signal.reason);
    if (outcome.state === "succeeded") return outcome.output;
    if (outcome.state === "cancelled") {
      if (this.stoppedByProgram.has(robot)) return undefined; // the program's own stop: carry on (D15)
      await this.cancelProgram(`robot '${robot}' was stopped from outside the program`);
      throw new Cancelled(this.programSignal.reason);
    }
    const verb = instr.name === "SKILL" ? textOf(instr, "name") : instr.name.toLowerCase();
    if (outcome.brokenLifecycle !== undefined) {
      throw new RunFailure("R704", `${verb} failed: ${outcome.brokenLifecycle}`);
    }
    if (outcome.rejected) throw new RunFailure("R701", `${verb} was refused by '${robot}': ${outcome.reason}`);
    throw new RunFailure("R703", `${verb} failed: ${outcome.reason}`);
  }

  // -------------------------------------------------------------------------
  // Safety rules (Guidebook §5, DECISIONS.md D37)
  // -------------------------------------------------------------------------

  /** Checks every rule each poll interval until the program finishes or is cancelled. */
  private async watchRules(): Promise<void> {
    const poll = this.options.pollInterval ?? 0.2;
    while (!this.finished.cancelled && !this.programSignal.cancelled) {
      await this.checkRules();
      await this.clock.sleep(poll, this.finished);
    }
  }

  /** Checks the rules once; if a check is already going on, waits for that one instead. */
  private checkRules(): Promise<void> {
    this.checking ??= this.checkRulesNow().finally(() => {
      this.checking = null;
    });
    return this.checking;
  }

  private async checkRulesNow(): Promise<void> {
    for (const watched of this.rules) {
      if (this.programSignal.cancelled) return;
      let isTrue: boolean;
      try {
        isTrue = await this.evaluator(watched.ctx).condition(watched.rule.condition);
      } catch (thrown) {
        if (thrown instanceof Cancelled) return;
        if (!(thrown instanceof RunFailure)) throw thrown;
        // A rule that cannot be checked cannot keep anyone safe, so the program stops (D37).
        await this.cancelProgram(`the safety rule on line ${watched.rule.line} could not be checked: ${thrown.reason}`);
        return;
      }
      // A rule fires when its condition becomes true, not again while it stays true (§5).
      const becameTrue = isTrue && !watched.wasTrue;
      watched.wasTrue = isTrue;
      if (becameTrue) await this.fire(watched);
    }
  }

  /** Carries out a rule's action: alert, or stop the program and then stop, return home or land. */
  private async fire({ rule, ctx }: WatchedRule): Promise<void> {
    const evaluator = this.evaluator(ctx);
    if (rule.action === "alert") {
      const text = rule.message === null ? `safety rule on line ${rule.line}` : show(await evaluator.evaluate(rule.message));
      this.trace.push({ kind: "alert", text });
      this.options.output?.alert(text);
      return;
    }
    if (rule.robot === null && rule.action === "stop") {
      // stop with no robot named stops every robot, which ending the program does (D44).
      await this.cancelProgram(`safety rule on line ${rule.line}: stop`);
      return;
    }
    const robot = rule.robot === null ? this.robotFor(rule.action) : robotOf(await evaluator.evaluate(rule.robot));
    const at = rule.at === null ? null : await evaluator.evaluate(rule.at);
    await this.cancelProgram(`safety rule on line ${rule.line}: ${rule.action} ${robot}`);
    if (rule.action === "return_home") await this.sendAnyway(robot, codegen.skill("return_home"), rule.line);
    if (rule.action === "land") await this.sendAnyway(robot, codegen.skill("land", { at: at === null ? null : codegen.field(at) }), rule.line);
  }

  /** Sends a safety action after the program has been cancelled; nothing can stop it but STOP. */
  private async sendAnyway(robot: string, instr: Instruction, line: number): Promise<void> {
    const outcome = await runTask(this.port(robot), instr);
    this.trace.push({ kind: "instruction", robot, line, text: formatInstruction(instr), state: outcome.state, reason: outcome.reason });
  }

  private port(robot: string): RobotPort {
    const port = this.options.robots[robot];
    if (port === undefined) throw new RunFailure("R707", `there is no connection to robot '${robot}'`);
    return port;
  }

  /** STOP one robot at once. `byProgram` is true for the program's own stop statement (D15). */
  private async stopRobot(robot: string, why: string, byProgram: boolean): Promise<void> {
    if (byProgram) this.stoppedByProgram.add(robot);
    this.trace.push({ kind: "stop", robot, why });
    await this.port(robot).stop();
  }

  /** Cancels the whole program and stops every connected robot. */
  private async cancelProgram(reason: string): Promise<void> {
    if (this.programSignal.cancelled) return;
    this.programSignal.cancel(reason);
    for (const robot of this.connected) await this.stopRobot(robot, reason, false);
  }

  /** The one connected robot that has the profile a statement with no robot needs (D27). */
  private robotFor(what: string): string {
    const able = this.connected.filter((robot) => {
      const model = this.options.models.get(robot);
      return model !== undefined && missingProfile(model, what) === null;
    });
    const [only] = able;
    if (able.length !== 1 || only === undefined) throw new RunFailure("R706", `cannot tell which robot should ${what}`);
    return only;
  }

  /** The robot that reads an object's properties (D30). */
  private objectRobot(object: string): string {
    const [first] = this.connected;
    if (this.connected.length === 1 && first !== undefined) return first;
    const seeing = this.connected.filter((r) => this.options.models.get(r)?.profiles.includes("vision") === true);
    const [only] = seeing;
    if (seeing.length !== 1 || only === undefined) throw new RunFailure("R706", `cannot tell which robot should look at '${object}'`);
    return only;
  }

  private async ask(question: Extract<Expression, { kind: "Text" }>, lang: string | null, ctx: Context): Promise<Value> {
    const text = show(await this.evaluator(ctx).evaluate(question));
    const output = await this.send(this.robotFor("ask"), codegen.talk("ASK", text, lang), ctx);
    return { kind: "text", value: output?.kind === "answer" ? output.text : "" };
  }

  /** Reads something from a robot with SENSE and turns the answer into a value (D30). */
  private async sense(robot: string, sensor: string, ctx: Context, analyse?: Value): Promise<Value> {
    const output = await this.send(robot, codegen.sense(sensor, analyse === undefined ? {} : { analyse }), ctx);
    if (output === undefined) throw new RunFailure("R703", `sense failed: '${sensor}' gave no reading`);
    if (output.kind === "analysis") return { kind: "analysis", label: output.label, health: output.health };
    if (output.kind !== "reading") throw new RunFailure("R703", `sense failed: '${sensor}' gave no reading`);
    const raw = output.value;
    if (sensor === "battery" || sensor.endsWith(".fill")) return { kind: "percent", value: Number(raw) * 100 };
    if (sensor === "state" || sensor.endsWith(".id")) return { kind: "text", value: String(raw) };
    if (sensor === "pose" || sensor.endsWith(".pose")) {
      return typeof raw === "object" ? { kind: "pose", pose: raw } : { kind: "text", value: String(raw) };
    }
    if (/\.(holding|loaded|locked)$/.test(sensor)) return { kind: "bool", value: raw === true };
    const dimension = this.options.models.get(robot)?.sensors[sensor]?.dimension ?? null;
    const asValue = (n: number | undefined): Value =>
      dimension === null ? { kind: "number", value: n ?? Number(raw) } : quantityFromSI(n ?? Number(raw), dimension, SI_UNIT[dimension]);
    return { kind: "reading", value: asValue(undefined), max: asValue(output.max), min: asValue(output.min), mean: asValue(output.mean), timestamp: this.clock.now() };
  }

  // -------------------------------------------------------------------------
  // Values, tasks and files
  // -------------------------------------------------------------------------

  private evaluator(ctx: Context): Evaluator {
    const env: RunEnv = {
      lookup: (name) => ctx.scope.get(name),
      place: (name) => this.site.places.get(name),
      zone: (name) => this.site.zones.get(name),
      route: (name) => this.site.route.get(name),
      error: ctx.error,
      sense: (robot, sensor, extra) => this.sense(robot, sensor, ctx, extra?.analyse),
      objectRobot: (object) => this.objectRobot(object),
      robotHas: (robot, name) => {
        const model = this.options.models.get(robot);
        return model !== undefined && (model.profiles.includes(name) || model.extensions[name] !== undefined);
      },
      callTask: (name, args) => this.callTask(name, args, ctx),
      callExtension: (name, args) => this.callExtension(name, args, ctx),
      now: () => this.clock.now(),
    };
    return new Evaluator(env);
  }

  private async callTask(name: string, args: readonly Value[], ctx: Context): Promise<Value> {
    const task = this.tasks.get(name);
    if (task === undefined) throw new RunFailure("R707", `there is no task called '${name}'`);
    const scope = new Scope(this.global);
    task.params.forEach((param, index) => scope.set(param, args[index] ?? NOTHING));
    try {
      await this.runStatements(task.body, { ...ctx, scope, error: null });
      return NOTHING;
    } catch (thrown) {
      if (thrown instanceof ReturnSignal) return thrown.value;
      throw thrown;
    }
  }

  /** vendor.feature(...): EXT to the robot whose manifest lists it, arguments under their names (D18). */
  private async callExtension(name: string, args: readonly { label: string | null; value: Value }[], ctx: Context): Promise<Value> {
    const robot = this.connected.find((r) => this.options.models.get(r)?.extensions[name] !== undefined);
    if (robot === undefined) throw new RunFailure("R701", `no connected robot has the extension '${name}'`);
    const params = this.options.models.get(robot)?.extensions[name]?.params ?? [];
    let next = 0;
    const named = args.map((arg) => ({ name: arg.label ?? params[next++]?.name ?? `arg${next}`, value: arg.value }));
    await this.send(robot, codegen.extension(name, named), ctx);
    return NOTHING;
  }

  /** Loads a site map or imported file: its places, zones, routes and tasks. */
  private async loadFile(source: string, ctx: Context): Promise<void> {
    for (const statement of parse(source).program.statements) {
      if (statement.kind === "Define" || statement.kind === "Task" || statement.kind === "Import") {
        await this.runStatement(statement, { ...ctx, scope: this.global });
      }
    }
  }
}

function robotOf(value: Value): string {
  if (value.kind === "robot" || value.kind === "part") return value.robot;
  throw new RunFailure("R705", `${show(value)} is not a robot or a part of one`);
}

function textOf(instr: Instruction, key: string): string {
  const found = instr.fields.find(([k]) => k === key)?.[1];
  return found?.kind === "word" ? found.value : instr.name.toLowerCase();
}
