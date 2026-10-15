// Works out the value of an expression while the program runs. Anything that must come from a
// robot (a sensor reading, the battery, where an object is) is asked of the runner through RunEnv.

import { applyHelper } from "../codegen/fields.js";
import type { PoseSI } from "../codegen/instruction.js";
import type { BinaryExpression, CallExpression, Expression, MemberAccess } from "../parser/ast.js";
import { UNITS } from "../stdlib/units.js";
import { bool, ORIGIN, poseOf, quantityFromSI, quantityOf, show, type Value } from "./values.js";

/** A failure while running, delivered to on fail: with its R7xx code (Guidebook §8). */
export class RunFailure extends Error {
  constructor(
    readonly code: string,
    readonly reason: string,
  ) {
    super(`${code}: ${reason}`);
  }
}

/** What the evaluator needs from the runner. */
export interface RunEnv {
  /** A variable, task parameter or robot, or undefined. */
  lookup(name: string): Value | undefined;
  place(name: string): Value | undefined;
  zone(name: string): Value | undefined;
  route(name: string): Value | undefined;
  /** The error value, inside on fail: only. */
  readonly error: Value | null;
  /** Reads something from a robot with a SENSE instruction (DECISIONS.md D30). */
  sense(robot: string, sensor: string, extra?: { analyse?: Value }): Promise<Value>;
  /** Which robot reads an object's properties, like mug.fill (D30). */
  objectRobot(object: string): string;
  /** True if the robot's manifest has this profile or extension (§6, D28). */
  robotHas(robot: string, name: string): boolean;
  callTask(name: string, args: readonly Value[]): Promise<Value>;
  callExtension(name: string, args: readonly { label: string | null; value: Value }[]): Promise<Value>;
  /** Seconds since the program started (D9). */
  now(): number;
}

const failValue = (reason: string): never => {
  throw new RunFailure("R705", reason);
};

export class Evaluator {
  constructor(private readonly env: RunEnv) {}

  async evaluate(expr: Expression): Promise<Value> {
    switch (expr.kind) {
      case "Number":
        return { kind: "number", value: expr.value };
      case "Quantity":
        return quantityOf(expr.value, expr.unit);
      case "Percent":
        return { kind: "percent", value: expr.value };
      case "Bool":
        return bool(expr.value);
      case "Text": {
        let result = "";
        for (const part of expr.parts) {
          if (part.kind === "literal") result += part.text;
          else result += show(await this.evaluatePath(part.path, expr));
        }
        return { kind: "text", value: result };
      }
      case "Name":
        return this.name(expr.name);
      case "Member":
        return this.member(expr);
      case "Call":
        return this.call(expr);
      case "List": {
        const items: Value[] = [];
        for (const item of expr.items) items.push(await this.evaluate(item));
        return { kind: "list", items };
      }
      case "Unary": {
        const operand = await this.evaluate(expr.operand);
        if (expr.op === "not") return bool(!truth(operand));
        if (operand.kind === "number") return { kind: "number", value: -operand.value };
        if (operand.kind === "quantity") return { ...operand, si: -operand.si };
        return failValue(`cannot make ${show(operand)} negative`);
      }
      case "Binary":
        return this.binary(expr);
    }
  }

  /** True or false for a condition (the checker made sure it is a Bool). */
  async condition(expr: Expression): Promise<boolean> {
    return truth(await this.evaluate(expr));
  }

  /** Evaluates a {a.b.c} insertion in text. */
  private evaluatePath(path: readonly string[], at: Expression): Promise<Value> {
    const [first, ...rest] = path;
    let expr: Expression = { kind: "Name", name: first ?? "", line: at.line, column: at.column };
    for (const name of rest) expr = { kind: "Member", object: expr, name, line: at.line, column: at.column };
    return this.evaluate(expr);
  }

  private name(name: string): Value {
    const value = this.env.lookup(name);
    if (value !== undefined) return value;
    if (name === "error" && this.env.error !== null) return this.env.error;
    // A name nobody defined is an object the robot finds (D4); the checker made sure of that.
    return { kind: "object", name, helpers: [] };
  }

  private async member(expr: MemberAccess): Promise<Value> {
    const name = expr.name;
    if (expr.object.kind === "Name" && this.env.lookup(expr.object.name) === undefined) {
      const ns = expr.object.name;
      const found = ns === "places" ? this.env.place(name) : ns === "zones" ? this.env.zone(name) : ns === "route" ? this.env.route(name) : undefined;
      if (found !== undefined) return found;
    }
    const owner = await this.evaluate(expr.object);
    switch (owner.kind) {
      case "robot":
        if (name === "battery" || name === "state" || name === "pose") return this.env.sense(owner.robot, name);
        if (name === "frames") return { kind: "list", items: [] };
        return { kind: "part", robot: owner.robot, part: name };
      case "part":
        // .holding, .loaded and .locked of an actuator (D11).
        return this.env.sense(owner.robot, `${owner.part}.${name}`);
      case "reading":
        if (name === "timestamp") return quantityFromSI(owner.timestamp, "Time", "s");
        return name === "max" ? owner.max : name === "min" ? owner.min : name === "mean" ? owner.mean : owner.value;
      case "analysis":
        return { kind: "text", value: name === "health" ? owner.health : owner.label };
      case "error":
        return { kind: "text", value: name === "code" ? owner.code : owner.reason };
      case "place":
        if (name === "name" || name === "id") return { kind: "text", value: owner.name };
        return applyHelper(owner, name, []) ?? failValue(`a place has no '${name}'`);
      case "pose":
        return applyHelper(owner, name, []) ?? failValue(`a pose has no '${name}'`);
      case "object":
        if (name === "handle") return applyHelper(owner, "handle", []) as Value;
        if (name === "name") return { kind: "text", value: owner.name };
        return this.env.sense(this.env.objectRobot(owner.name), `${owner.name}.${name}`);
      default:
        return failValue(`${show(owner)} has no '${name}'`);
    }
  }

  private async call(call: CallExpression): Promise<Value> {
    const callee = call.callee;
    if (callee.kind === "Name") return this.callFunction(callee.name, call);
    if (callee.kind !== "Member") return failValue("this cannot be called");
    const method = callee.name;

    // vendor.feature(...): a vendor extension (D18), sent as an EXT instruction.
    if (callee.object.kind === "Name" && this.env.lookup(callee.object.name) === undefined && !isStandardMethod(method)) {
      const args: { label: string | null; value: Value }[] = [];
      for (const arg of call.args) args.push({ label: arg.label, value: await this.evaluate(arg.value) });
      return this.env.callExtension(`${callee.object.name}.${method}`, args);
    }

    const owner = await this.evaluate(callee.object);
    const args: Value[] = [];
    for (const arg of call.args) args.push(await this.evaluate(arg.value));
    if (owner.kind === "robot" && (method === "has" || method === "sense")) {
      const name = args[0]?.kind === "text" ? args[0].value : "";
      return method === "has" ? bool(this.env.robotHas(owner.robot, name)) : this.env.sense(owner.robot, name);
    }
    if (method === "analyse" && owner.kind === "reading") {
      const [object] = args;
      const robot = object?.kind === "object" ? this.env.objectRobot(object.name) : "";
      return object === undefined ? failValue("analyse needs an object") : this.env.sense(robot, "camera", { analyse: object });
    }
    // Pose helpers: lengths in metres, a shelf level as a number.
    const numbers = args.map((a) => (a.kind === "quantity" ? a.si : a.kind === "number" ? a.value : 0));
    return applyHelper(owner, method, numbers) ?? failValue(`cannot work out .${method} of ${show(owner)}`);
  }

  private async callFunction(name: string, call: CallExpression): Promise<Value> {
    const positional: Value[] = [];
    const named = new Map<string, Value>();
    for (const arg of call.args) {
      if (name === "to" || name === "round") break; // the unit is a bare word, read below
      const value = await this.evaluate(arg.value);
      if (arg.label === null) positional.push(value);
      else named.set(arg.label, value);
    }
    switch (name) {
      case "pose": {
        const [x, y, z] = positional.map(si);
        const angle = (key: string): number => si(named.get(key));
        return { kind: "pose", pose: { x, y, z, roll: angle("roll"), pitch: angle("pitch"), yaw: angle("yaw") } as PoseSI };
      }
      case "distance": {
        const [a, b] = await Promise.all(positional.map((v) => this.positionOf(v)));
        const d = Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
        return quantityFromSI(d, "Length", "m");
      }
      case "now":
        return quantityFromSI(this.env.now(), "Time", "s");
      case "len": {
        const [list] = positional;
        return { kind: "number", value: list?.kind === "list" ? list.items.length : 0 };
      }
      case "text":
        return { kind: "text", value: positional[0] === undefined ? "" : show(positional[0]) };
      case "polygon":
        return {
          kind: "zone",
          name: "",
          corners: positional.map((p) => {
            const pose = poseOf(p) ?? ORIGIN;
            return { x: pose.x, y: pose.y };
          }),
        };
      case "to":
      case "round": {
        const [first, second] = call.args;
        const value = first === undefined ? undefined : await this.evaluate(first.value);
        const unit = second?.value.kind === "Name" ? second.value.name : "";
        const info = UNITS[unit];
        if (value?.kind !== "quantity" || info === undefined) return failValue(`cannot convert to '${unit}'`);
        const amount = value.si / info.toSI;
        const shown = name === "round" ? Math.round(amount) : amount;
        return quantityFromSI(shown * info.toSI, value.dimension, unit);
      }
      default:
        return this.env.callTask(name, positional);
    }
  }

  /** Where a pose, place or object is, in metres. An object's position is read from the robot (D30). */
  private async positionOf(value: Value): Promise<PoseSI> {
    const pose = poseOf(value);
    if (pose !== null) return pose;
    if (value.kind === "object") {
      const read = await this.env.sense(this.env.objectRobot(value.name), `${value.name}.pose`);
      return poseOf(read) ?? failValue(`the robot could not say where '${value.name}' is`);
    }
    return failValue(`${show(value)} has no position`);
  }

  private async binary(expr: BinaryExpression): Promise<Value> {
    if (expr.op === "and") return bool((await this.condition(expr.left)) && (await this.condition(expr.right)));
    if (expr.op === "or") return bool((await this.condition(expr.left)) || (await this.condition(expr.right)));
    const left = await this.evaluate(expr.left);
    const right = await this.evaluate(expr.right);
    if (expr.op === "+" || expr.op === "-") {
      const sign = expr.op === "+" ? 1 : -1;
      if (left.kind === "quantity" && right.kind === "quantity") return { ...left, si: left.si + sign * right.si };
      if (left.kind === "number" && right.kind === "number") return { kind: "number", value: left.value + sign * right.value };
      if (left.kind === "percent" && right.kind === "percent") {
        const value = left.value + sign * right.value;
        // A worked-out percent must stay between 0% and 100% (D12).
        if (value < 0 || value > 100) failValue(`${Number(value.toPrecision(12))}% is outside 0% to 100%`);
        return { kind: "percent", value };
      }
      return failValue(`cannot combine ${show(left)} and ${show(right)}`);
    }
    const a = comparable(left);
    const b = comparable(right);
    switch (expr.op) {
      case "==":
        return bool(a === b);
      case "!=":
        return bool(a !== b);
      case "<":
        return bool(a < b);
      case "<=":
        return bool(a <= b);
      case ">":
        return bool(a > b);
      default:
        return bool(a >= b);
    }
  }
}

/** Method names of the standard library, which are never vendor extensions. */
function isStandardMethod(name: string): boolean {
  return ["above", "below", "beside", "in_front", "at_height", "offset", "level", "analyse", "has", "sense"].includes(name);
}

function truth(value: Value): boolean {
  return value.kind === "bool" ? value.value : false;
}

/** A plain number or text to compare: quantities in SI, so 1m == 100cm. */
function comparable(value: Value): number | string | boolean {
  switch (value.kind) {
    case "number":
    case "percent":
      return value.value;
    case "quantity":
      return Number(value.si.toPrecision(12));
    case "bool":
      return value.value;
    case "reading":
      return comparable(value.value);
    default:
      return show(value);
  }
}

function si(value: Value | undefined): number {
  return value?.kind === "quantity" ? value.si : value?.kind === "number" ? value.value : 0;
}
