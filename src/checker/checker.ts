// Checks names, types and units in a parsed program before anything runs (Guidebook §4 and §8).
// It reports E2xx (names) and E3xx (types and units) problems and never changes the program.

import { makeDiagnostic, type Diagnostic, type DiagnosticArgs } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import type {
  Argument,
  BinaryExpression,
  CallExpression,
  Expression,
  MemberAccess,
  Position,
  Program,
  Statement,
  TextLiteral,
  UnaryExpression,
} from "../parser/ast.js";
import {
  ANALYSIS_PROPERTIES,
  ACTUATOR_PROPERTIES,
  BUILT_IN_NAMES,
  ERROR_PROPERTIES,
  FUNCTIONS,
  OBJECT_PROPERTIES,
  PLACE_PROPERTIES,
  POSE_HELPERS,
  POSITION_PROPERTIES,
  READING_VALUES,
  type Signature,
} from "../stdlib/signatures.js";
import { isUnit, UNITS, type Dimension } from "../stdlib/units.js";
import { evaluateConstant, type Constant } from "./constants.js";
import { Scope, type Binding } from "./scope.js";
import {
  acceptName,
  BOOL,
  fits,
  fitsAny,
  listOf,
  NUMBER,
  OBJECT,
  PERCENT,
  POSE,
  quantity,
  sameType,
  TEXT,
  typeName,
  UNKNOWN,
  ZONE,
  type Accept,
  type Type,
} from "./types.js";

export interface CheckResult {
  readonly diagnostics: Diagnostic[];
}

/** The unit suggested when a bare number is given for a dimension (TYPES_AND_UNITS.md section 4). */
const SUGGESTED_UNIT: Readonly<Record<Dimension, string>> = {
  Length: "cm",
  Speed: "m/s",
  Time: "s",
  Angle: "deg",
  AngularSpeed: "deg/s",
  Force: "N",
  Current: "A",
  Volume: "ml",
  Mass: "kg",
  Temperature: "deg_c",
};

/** Kinds of value that can be inserted into text with { } (DECISIONS.md B6). */
const SHOWABLE: readonly Type["kind"][] = ["Number", "Quantity", "Percent", "Text", "Bool"];

const OPERATOR_WORDS: Readonly<Record<string, string>> = { "+": "add", "-": "subtract" };

/** Extra information about where a value is used. */
interface ValueContext {
  /** True where an object the robot finds by itself may appear, like a move target (DECISIONS.md D4). */
  readonly objectAllowed?: boolean;
}

export class Checker {
  readonly diagnostics: Diagnostic[] = [];
  protected scope = new Scope();
  /** Fixed values of names bound with let, like let gap = 5cm. */
  private readonly constants = new WeakMap<Binding, Constant>();

  // -------------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------------

  protected report(code: string, at: Position, args: DiagnosticArgs = {}): void {
    this.diagnostics.push(makeDiagnostic(code, at.line, at.column, args));
  }

  /** The diagnostics without repeats; a task checked several times may find the same thing twice. */
  uniqueDiagnostics(): Diagnostic[] {
    const seen = new Set<string>();
    return this.diagnostics
      .filter((d) => {
        const key = `${d.code}|${d.line}|${d.column}|${JSON.stringify(d.args)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.line - b.line || a.column - b.column);
  }

  // -------------------------------------------------------------------------
  // Programs and statements
  // -------------------------------------------------------------------------

  checkProgram(program: Program): void {
    for (const statement of program.statements) this.checkStatement(statement);
  }

  protected checkStatement(statement: Statement): void {
    switch (statement.kind) {
      case "Let": {
        const type = statement.value.kind === "Ask" ? this.checkAsk(statement.value.question) : this.checkValue(statement.value);
        const binding = this.bind(statement.name, type, statement);
        if (binding !== undefined && statement.value.kind !== "Ask") {
          const constant = evaluateConstant(statement.value, (name) => this.constantOf(name));
          if (constant !== null) this.constants.set(binding, constant);
        }
        return;
      }
      default:
        return;
    }
  }

  private checkAsk(question: TextLiteral): Type {
    this.checkText(question);
    return TEXT;
  }

  /** Binds a name in the current block, reporting E207 or E208 if that is not allowed. */
  protected bind(name: string, type: Type, at: Position): Binding | undefined {
    if (BUILT_IN_NAMES.includes(name)) {
      this.report("E208", at, { name });
      return undefined;
    }
    const binding: Binding = { kind: "value", type, line: at.line };
    const earlier = this.scope.define(name, binding);
    if (earlier !== undefined) {
      this.report("E207", at, { name, line: String(earlier.line) });
      return undefined;
    }
    return binding;
  }

  protected constantOf(name: string): Constant | null {
    const binding = this.scope.lookup(name);
    return binding === undefined ? null : (this.constants.get(binding) ?? null);
  }

  // -------------------------------------------------------------------------
  // Values that must fit a slot
  // -------------------------------------------------------------------------

  /**
   * Checks a value that must be one of `accepts`. A bare number where a quantity or percent
   * is expected gets the Guidebook's "Did you mean 20cm?" hint (E304, E305).
   */
  protected expectValue(expr: Expression, accepts: readonly Accept[], slot: string): Type {
    const objectAllowed = accepts.some((a) => a.kind === "Object");
    const type = this.checkValue(expr, { objectAllowed });
    if (fitsAny(type, accepts)) return type;
    if (type.kind === "Number") {
      const wanted = accepts.find((a) => a.kind === "Quantity");
      if (wanted !== undefined && wanted.kind === "Quantity") {
        this.reportBareNumber(expr, wanted.dimension);
        return UNKNOWN;
      }
      if (accepts.some((a) => a.kind === "Percent")) {
        this.reportBarePercent(expr);
        return UNKNOWN;
      }
    }
    this.report("E306", expr, { slot, expected: acceptName(accepts), got: typeName(type) });
    return UNKNOWN;
  }

  private reportBareNumber(expr: Expression, dimension: Dimension): void {
    const raw = literalText(expr);
    this.report("E304", expr, {
      expected: dimension,
      value: raw ?? "",
      suggestion: raw === null ? "" : `${raw}${SUGGESTED_UNIT[dimension]}`,
    });
  }

  private reportBarePercent(expr: Expression): void {
    const raw = literalText(expr);
    this.report("E305", expr, { value: raw ?? "", suggestion: raw === null ? "" : `${raw}%` });
  }

  // -------------------------------------------------------------------------
  // Values (GRAMMAR.md 2.10, TYPES_AND_UNITS.md sections 2 and 3)
  // -------------------------------------------------------------------------

  checkValue(expr: Expression, context: ValueContext = {}): Type {
    switch (expr.kind) {
      case "Number":
        return NUMBER;
      case "Quantity": {
        const unit = UNITS[expr.unit];
        return unit === undefined ? UNKNOWN : quantity(unit.dimension);
      }
      case "Percent":
        this.checkPercentRange(expr);
        return PERCENT;
      case "Text":
        this.checkText(expr);
        return TEXT;
      case "Bool":
        return BOOL;
      case "Name":
        return this.checkName(expr.name, expr, context);
      case "Member":
        return this.checkMember(expr);
      case "Call":
        return this.checkCall(expr);
      case "List":
        return this.checkList(expr.items, expr);
      case "Unary":
        return this.checkUnary(expr);
      case "Binary":
        return this.checkBinary(expr);
    }
  }

  /** A percent must be between 0% and 100% (DECISIONS.md D12), also when worked out from fixed values. */
  private checkPercentRange(expr: Expression): void {
    const constant = evaluateConstant(expr, (name) => this.constantOf(name));
    if (constant?.kind === "Percent" && (constant.value < 0 || constant.value > 100)) {
      this.report("E308", expr, { value: `${Number(constant.value.toPrecision(12))}%` });
    }
  }

  /** Checks each {insertion} in text: it must name something that can be shown as text. */
  protected checkText(text: TextLiteral): void {
    for (const part of text.parts) {
      if (part.kind !== "insert") continue;
      const at = { line: text.line, column: part.column };
      const [first, ...rest] = part.path;
      let expr: Expression = { kind: "Name", name: first ?? "", ...at };
      for (const name of rest) expr = { kind: "Member", object: expr, name, ...at };
      const type = this.checkValue(expr);
      if (type.kind !== "Unknown" && !SHOWABLE.includes(type.kind)) {
        this.report("E315", at, { inside: part.path.join("."), type: typeName(type) });
      }
    }
  }

  protected checkName(name: string, at: Position, context: ValueContext): Type {
    const binding = this.scope.lookup(name);
    if (binding !== undefined) {
      if (binding.kind === "value") return binding.type;
      this.report("E306", at, { slot: `'${name}'`, expected: "a value", got: "a task", fix: `Call the task with brackets: ${name}(...)` });
      return UNKNOWN;
    }
    const builtIn = this.checkBuiltInName(name, at);
    if (builtIn !== null) return builtIn;
    if (context.objectAllowed === true) {
      // A name nobody defined is an object the robot finds at run time (DECISIONS.md D4),
      // unless it looks like a typo of a name that does exist.
      const close = closestMatch(name, this.scope.visibleNames());
      if (close === undefined || close === name) return OBJECT;
      this.report("E202", at, { name, suggestion: close });
      return UNKNOWN;
    }
    this.report("E202", at, { name, suggestion: closestMatch(name, this.scope.visibleNames()) ?? "" });
    return UNKNOWN;
  }

  /** The type of a built-in name used on its own, or null if `name` is not built in. */
  protected checkBuiltInName(name: string, at: Position): Type | null {
    if (name === "places" || name === "zones" || name === "route") return { kind: "Namespace", namespace: name };
    if (name === "field" || name === "shelf") {
      this.report("E212", at, { name });
      return UNKNOWN;
    }
    if (FUNCTIONS[name] !== undefined) {
      this.report("E306", at, { slot: `'${name}'`, expected: "a value", got: "a built-in function", fix: `Call it with brackets: ${name}(...)` });
      return UNKNOWN;
    }
    return null;
  }

  protected checkMember(expr: MemberAccess): Type {
    const name = expr.name;
    // An unknown name in front of an object property is an object, like mug.fill (D4).
    const objectAllowed = OBJECT_PROPERTIES[name] !== undefined || POSITION_PROPERTIES[name] !== undefined;
    const owner = this.checkValue(expr.object, { objectAllowed });
    return this.memberOf(owner, name, expr);
  }

  /** The type of `owner.name`, or UNKNOWN after reporting why there is no such property. */
  protected memberOf(owner: Type, name: string, at: Position): Type {
    const found = (table: Readonly<Record<string, Type>>): Type | undefined => table[name];
    let result: Type | undefined;
    switch (owner.kind) {
      case "Unknown":
        return UNKNOWN;
      case "Part":
        if (owner.roles.includes("actuator")) result = found(ACTUATOR_PROPERTIES);
        break;
      case "Reading":
        if ((READING_VALUES as readonly string[]).includes(name)) {
          result = owner.dimension === null ? NUMBER : quantity(owner.dimension);
        } else if (name === "timestamp") {
          result = quantity("Time");
        }
        break;
      case "Analysis":
        result = found(ANALYSIS_PROPERTIES);
        break;
      case "Pose":
        result = found(POSITION_PROPERTIES);
        break;
      case "Place":
        result = found(POSITION_PROPERTIES) ?? found(PLACE_PROPERTIES);
        break;
      case "Object":
        result = found(POSITION_PROPERTIES) ?? found(OBJECT_PROPERTIES);
        break;
      case "TaskResult":
        result = found(ERROR_PROPERTIES);
        break;
      default:
        break;
    }
    if (result !== undefined) return result;
    const isHelper = POSE_HELPERS[name] !== undefined;
    this.report("E211", at, {
      owner: typeName(owner),
      name,
      fix: isHelper ? `.${name} is a helper; call it with brackets, like .${name}(10cm).` : "",
    });
    return UNKNOWN;
  }

  protected checkCall(call: CallExpression): Type {
    const callee = call.callee;
    if (callee.kind === "Name") {
      const signature = FUNCTIONS[callee.name];
      if (signature !== undefined && this.scope.lookup(callee.name) === undefined) {
        return this.checkBuiltInCall(callee.name, signature, call);
      }
      return this.checkNamedCall(callee.name, call);
    }
    if (callee.kind === "Member") return this.checkMethodCall(callee, call);
    return UNKNOWN; // the parser only allows names and members to be called
  }

  /** A call of a name that is not a built-in function: a task (checked later) or a mistake. */
  protected checkNamedCall(name: string, call: CallExpression): Type {
    this.checkArgumentsLoosely(call.args);
    const candidates = [...Object.keys(FUNCTIONS), ...this.scope.visibleNames()];
    this.report("E210", call, { name, suggestion: closestMatch(name, candidates) ?? "" });
    return UNKNOWN;
  }

  /** A call like obj.above(10cm) or reading.analyse(cup). */
  protected checkMethodCall(callee: MemberAccess, call: CallExpression): Type {
    const name = callee.name;
    const owner = this.checkValue(callee.object, { objectAllowed: POSE_HELPERS[name] !== undefined });
    if (owner.kind === "Unknown") {
      this.checkArgumentsLoosely(call.args);
      return UNKNOWN;
    }
    const helper = POSE_HELPERS[name];
    if (helper !== undefined && (owner.kind === "Pose" || owner.kind === "Place" || owner.kind === "Object")) {
      this.checkArguments(call, helper, `.${name}`);
      return POSE;
    }
    if (name === "analyse" && owner.kind === "Reading") {
      this.checkArguments(call, { params: [{ name: "object", accepts: [{ kind: "Object" }] }], returns: null, meaning: "" }, ".analyse");
      return { kind: "Analysis" };
    }
    this.checkArgumentsLoosely(call.args);
    this.report("E211", callee, { owner: typeName(owner), name, fix: "" });
    return UNKNOWN;
  }

  protected checkBuiltInCall(name: string, signature: Signature, call: CallExpression): Type {
    switch (name) {
      case "to":
      case "round":
        return this.checkUnitCall(name, call);
      case "polygon": {
        this.rejectNamedArguments(call.args, "polygon");
        for (const arg of call.args) this.expectValue(arg.value, [{ kind: "Pose" }], "each corner of the polygon");
        if (call.args.length < 3) this.report("E319", call, { count: String(call.args.length) });
        return ZONE;
      }
      default:
        this.checkArguments(call, signature, `${name}()`);
        return signature.returns ?? UNKNOWN;
    }
  }

  /** to(q, unit) and round(q, unit): the unit is written as a bare unit name, like cm. */
  private checkUnitCall(name: string, call: CallExpression): Type {
    this.rejectNamedArguments(call.args, name);
    if (call.args.length !== 2) {
      this.report("E309", call, { what: `${name}()`, expected: "2", got: String(call.args.length) });
      this.checkArgumentsLoosely(call.args);
      return UNKNOWN;
    }
    const [value, unitArg] = call.args as [Argument, Argument];
    const unit = unitArg.value.kind === "Name" ? unitArg.value.name : null;
    if (unit === null || !isUnit(unit)) {
      this.checkValue(value.value);
      this.report("E317", unitArg, { what: `${name}()` });
      return UNKNOWN;
    }
    const dimension = UNITS[unit]?.dimension as Dimension;
    const type = this.checkValue(value.value);
    if (type.kind === "Number") {
      this.reportBareNumber(value.value, dimension);
      return quantity(dimension);
    }
    if (type.kind === "Quantity" && type.dimension !== dimension) {
      this.report("E318", unitArg, { from: type.dimension, unit });
    } else if (type.kind !== "Quantity" && type.kind !== "Unknown") {
      this.report("E306", value, { slot: `the first argument of ${name}()`, expected: "a quantity", got: typeName(type) });
    }
    return quantity(dimension);
  }

  /** Checks arguments against a signature: count, names and types (E309, E310). */
  protected checkArguments(call: CallExpression, signature: Signature, what: string): void {
    const positional = signature.params.filter((p) => p.named !== true);
    const plainArgs = call.args.filter((a) => a.label === null);
    if (plainArgs.length !== positional.length) {
      this.report("E309", call, { what, expected: String(positional.length), got: String(plainArgs.length) });
    }
    plainArgs.forEach((arg, index) => {
      const param = positional[index];
      if (param === undefined) this.checkValue(arg.value);
      else this.expectValue(arg.value, param.accepts, `'${param.name}' of ${what}`);
    });
    for (const arg of call.args.filter((a) => a.label !== null)) {
      const param = signature.params.find((p) => p.named === true && p.name === arg.label);
      if (param === undefined) {
        this.report("E310", arg, { what, name: arg.label ?? "" });
        this.checkValue(arg.value);
      } else {
        this.expectValue(arg.value, param.accepts, `'${param.name}' of ${what}`);
      }
    }
  }

  protected rejectNamedArguments(args: readonly Argument[], what: string): void {
    for (const arg of args) {
      if (arg.label !== null) this.report("E310", arg, { what: `${what}()`, name: arg.label });
    }
  }

  /** Checks each argument on its own, when there is no signature to compare against. */
  protected checkArgumentsLoosely(args: readonly Argument[], context: ValueContext = {}): void {
    for (const arg of args) this.checkValue(arg.value, context);
  }

  /** All items of a list must have the same type; places and poses may be mixed, giving poses. */
  protected checkList(items: readonly Expression[], at: Position): Type {
    let item: Type | null = null;
    for (const expr of items) {
      const type = this.checkValue(expr, { objectAllowed: true });
      if (type.kind === "Unknown") continue;
      if (item === null) {
        item = type;
      } else if (!sameType(item, type)) {
        const placeAndPose = fits(item, { kind: "Pose" }) && fits(type, { kind: "Pose" });
        if (placeAndPose) {
          item = POSE;
        } else {
          this.report("E313", expr, { first: typeName(item), other: typeName(type) });
          return listOf(UNKNOWN);
        }
      }
    }
    return listOf(item ?? UNKNOWN);
  }

  private checkUnary(expr: UnaryExpression): Type {
    const type = this.checkValue(expr.operand);
    if (type.kind === "Unknown") return UNKNOWN;
    if (expr.op === "not") {
      if (type.kind === "Bool") return BOOL;
      this.report("E302", expr, { op: "not", type: typeName(type) });
      return UNKNOWN;
    }
    if (type.kind === "Number" || type.kind === "Quantity") return type;
    this.report("E302", expr, { op: "-", type: typeName(type) });
    return UNKNOWN;
  }

  private checkBinary(expr: BinaryExpression): Type {
    const left = this.checkValue(expr.left);
    const right = this.checkValue(expr.right);
    if (left.kind === "Unknown" || right.kind === "Unknown") return UNKNOWN;
    const op = expr.op;

    if (op === "and" || op === "or") {
      for (const [side, type] of [[expr.left, left], [expr.right, right]] as const) {
        if (type.kind !== "Bool") {
          this.report("E302", side, { op, type: typeName(type) });
          return UNKNOWN;
        }
      }
      return BOOL;
    }

    // A bare number next to a quantity or percent: "distance < 20" (Guidebook §4).
    if (left.kind === "Number" && right.kind === "Quantity") return this.bareNumberSide(expr.left, right, op);
    if (right.kind === "Number" && left.kind === "Quantity") return this.bareNumberSide(expr.right, left, op);
    if (left.kind === "Number" && right.kind === "Percent") return this.bareNumberSide(expr.left, right, op);
    if (right.kind === "Number" && left.kind === "Percent") return this.bareNumberSide(expr.right, left, op);

    const comparison = op !== "+" && op !== "-";
    const numeric = left.kind === "Number" || left.kind === "Quantity" || left.kind === "Percent";

    if (sameType(left, right)) {
      if (!comparison) {
        if (!numeric) {
          const fix = left.kind === "Text" ? 'Join text by inserting values: "Hello {name}".' : "";
          this.report("E302", expr, { op, type: typeName(left), fix });
          return UNKNOWN;
        }
        if (left.kind === "Percent") this.checkPercentRange(expr);
        return left;
      }
      const ordering = op !== "==" && op !== "!=";
      if (ordering && !numeric) {
        this.report("E302", expr, { op, type: typeName(left) });
        return UNKNOWN;
      }
      if (!ordering && !numeric && left.kind !== "Text" && left.kind !== "Bool") {
        this.report("E302", expr, { op, type: typeName(left) });
        return UNKNOWN;
      }
      return BOOL;
    }

    if (left.kind === "Quantity" && right.kind === "Quantity") {
      if (comparison) this.report("E303", expr, { left: left.dimension, right: right.dimension });
      else this.report("E301", expr, { op: OPERATOR_WORDS[op] ?? op, left: left.dimension, right: right.dimension });
      return UNKNOWN;
    }
    if (comparison) this.report("E303", expr, { left: typeName(left), right: typeName(right) });
    else this.report("E301", expr, { op: OPERATOR_WORDS[op] ?? op, left: typeName(left), right: typeName(right) });
    return UNKNOWN;
  }

  /** Reports a bare number used next to a quantity or percent, suggesting the right unit. */
  private bareNumberSide(numberExpr: Expression, other: Type, op: string): Type {
    if (other.kind === "Quantity") this.reportBareNumber(numberExpr, other.dimension);
    else this.reportBarePercent(numberExpr);
    const comparison = op !== "+" && op !== "-";
    return comparison ? BOOL : other;
  }
}

/** The text of a plain number literal, like "20" or "-20", or null for anything else. */
function literalText(expr: Expression): string | null {
  if (expr.kind === "Number") return expr.raw;
  if (expr.kind === "Unary" && expr.op === "-" && expr.operand.kind === "Number") return `-${expr.operand.raw}`;
  return null;
}

/** Checks a parsed program and returns every name, type and unit problem found. */
export function check(program: Program): CheckResult {
  const checker = new Checker();
  checker.checkProgram(program);
  return { diagnostics: checker.uniqueDiagnostics() };
}
