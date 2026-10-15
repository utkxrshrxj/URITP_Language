// Checks names, types and units in a parsed program before anything runs (Guidebook §4 and §8).
// It reports E2xx (names) and E3xx (types and units) problems and never changes the program.

import { inFile, makeDiagnostic, type Diagnostic, type DiagnosticArgs } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import type {
  Argument,
  BinaryExpression,
  Block,
  CallExpression,
  DefineStatement,
  Expression,
  ImportStatement,
  MemberAccess,
  Position,
  Program,
  RobotStatement,
  Statement,
  TextLiteral,
  UnaryExpression,
} from "../parser/ast.js";
import { parse } from "../parser/parser.js";
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
  ROBOT_METHODS,
  ROBOT_PROPERTIES,
  type Signature,
} from "../stdlib/signatures.js";
import { isUnit, UNITS, type Dimension } from "../stdlib/units.js";
import { evaluateConstant, type Constant } from "./constants.js";
import type { RobotModel } from "./robot-model.js";
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
  TASK_RESULT,
  type Accept,
  type PartRole,
  type Type,
} from "./types.js";

/** A file given to the checker as text, like a site map. */
export interface SourceFile {
  readonly name: string;
  readonly source: string;
}

export interface CheckOptions {
  /**
   * Finds the model of a connected robot from its name and connect("ADDRESS"), usually built
   * from its manifest (Phase 4). A robot without a model cannot be checked, so it is an error.
   */
  readonly robots?: (name: string, address: string) => RobotModel | undefined;
  /** Site maps loaded before the program, such as site.uritp next to it (DECISIONS.md D16). */
  readonly siteMaps?: readonly SourceFile[];
  /**
   * Reads a file named in an import, or returns null if there is none. Passing this in keeps
   * the checker free of Node-only file access, so it can also run in a browser.
   */
  readonly readFile?: (path: string) => string | null;
}

export interface CheckResult {
  readonly diagnostics: Diagnostic[];
}

/** A place, zone or route from a site map. */
interface SiteEntry {
  readonly type: Type;
  readonly line: number;
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
  /** The kind of robot part wanted here, so a missing part gets the right message (E203 to E205). */
  readonly role?: PartRole;
}

/** Short names for the slots that statements accept (TYPES_AND_UNITS.md section 4). */
const FRAME: Accept[] = [{ kind: "Frame" }];
const ACTUATOR: Accept[] = [{ kind: "Actuator" }];
const SENSOR: Accept[] = [{ kind: "Sensor" }];
const ROBOT: Accept[] = [{ kind: "Robot" }];
const TARGET: Accept[] = [{ kind: "Pose" }, { kind: "Place" }, { kind: "Object" }];
const OBJECT_ONLY: Accept[] = [{ kind: "Object" }];
const PLACE_ONLY: Accept[] = [{ kind: "Place" }];
const ROUTE: Accept[] = [{ kind: "Route" }];
const ZONE_ONLY: Accept[] = [{ kind: "Zone" }];
const amountOf = (dimension: Dimension): Accept[] => [{ kind: "Quantity", dimension }];

/** A language code: two or three lower-case letters, like en, hi or ar (ISO 639). */
const LANGUAGE_CODE = /^[a-z]{2,3}$/;

const MISSING_PART_CODE: Readonly<Record<PartRole, string>> = { frame: "E203", actuator: "E204", sensor: "E205" };

export class Checker {
  readonly diagnostics: Diagnostic[] = [];
  protected scope = new Scope();
  /** Fixed values of names bound with let, like let gap = 5cm. */
  private readonly constants = new WeakMap<Binding, Constant>();
  /** The model of each connected robot, or null if none was found (E201 already reported). */
  protected readonly robots = new Map<string, RobotModel | null>();
  /** Places, zones and routes defined so far, from site maps and define lines. */
  private readonly site = {
    places: new Map<string, SiteEntry>(),
    zones: new Map<string, SiteEntry>(),
    route: new Map<string, SiteEntry>(),
  };
  /** The file being checked when it is not the main program. */
  private currentFile: string | undefined;
  /** Files being imported right now, to catch files that import each other (E214). */
  private readonly importChain: string[] = [];
  private readonly imported = new Set<string>();
  /** How many on fail: blocks we are inside; error only exists there (Guidebook §8). */
  private onFailDepth = 0;
  /** Every name the program has bound anywhere, with its line, to explain names used out of their block. */
  private readonly boundAnywhere = new Map<string, number>();

  constructor(private readonly options: CheckOptions = {}) {}

  // -------------------------------------------------------------------------
  // Reporting
  // -------------------------------------------------------------------------

  protected report(code: string, at: Position, args: DiagnosticArgs = {}): void {
    const diagnostic = makeDiagnostic(code, at.line, at.column, args);
    this.diagnostics.push(this.currentFile === undefined ? diagnostic : inFile(diagnostic, this.currentFile));
  }

  /** The diagnostics without repeats; a task checked several times may find the same thing twice. */
  uniqueDiagnostics(): Diagnostic[] {
    const seen = new Set<string>();
    return this.diagnostics
      .filter((d) => {
        const key = `${d.file ?? ""}|${d.code}|${d.line}|${d.column}|${JSON.stringify(d.args)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.file ?? "").localeCompare(b.file ?? "") || a.line - b.line || a.column - b.column);
  }

  // -------------------------------------------------------------------------
  // Programs and statements
  // -------------------------------------------------------------------------

  checkProgram(program: Program): void {
    for (const siteMap of this.options.siteMaps ?? []) this.checkOtherFile(siteMap.name, siteMap.source, "site map");
    for (const statement of program.statements) this.checkStatement(statement);
    this.checkOnFail(program.onFail);
  }

  /** Checks a block in its own scope. `setup` binds names first, like a loop variable. */
  protected checkBlock(block: Block, setup: (scope: Scope) => void = () => {}): void {
    const outer = this.scope;
    this.scope = new Scope(outer);
    try {
      setup(this.scope);
      for (const statement of block.statements) this.checkStatement(statement);
    } finally {
      this.scope = outer;
    }
    this.checkOnFail(block.onFail);
  }

  /** on fail: runs with error holding the failed task's result (Guidebook §8). */
  private checkOnFail(onFail: Block["onFail"]): void {
    if (onFail === null) return;
    this.onFailDepth++;
    try {
      this.checkBlock(onFail.body);
    } finally {
      this.onFailDepth--;
    }
  }

  /**
   * Checks a site map or imported file. Its diagnostics name the file. A site map may only
   * hold define lines (D16); an imported file may also hold tasks and imports (Guidebook §5).
   */
  private checkOtherFile(name: string, source: string, kind: "site map" | "import"): void {
    const parsed = parse(source);
    for (const d of parsed.diagnostics) this.diagnostics.push(inFile(d, name));
    const outerFile = this.currentFile;
    const outerScope = this.scope;
    this.currentFile = name;
    this.scope = new Scope();
    try {
      for (const statement of parsed.program.statements) {
        const allowed = statement.kind === "Define" || (kind === "import" && (statement.kind === "Task" || statement.kind === "Import"));
        if (!allowed) {
          this.report("E215", statement, {
            file: name,
            allowed: kind === "site map" ? "define lines" : "define, task and import lines",
          });
          continue;
        }
        this.checkStatement(statement);
      }
    } finally {
      // Tasks from an imported file become available to the file that imported it.
      const fileScope = this.scope;
      this.currentFile = outerFile;
      this.scope = outerScope;
      for (const [taskName, binding] of fileScope.ownBindings()) {
        const earlier = this.scope.define(taskName, binding);
        if (earlier !== undefined) this.report("E207", { line: 1, column: 1 }, { name: taskName, line: String(earlier.line) });
      }
    }
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
      case "Robot":
        this.checkRobot(statement);
        return;
      case "Define":
        this.checkDefine(statement);
        return;
      case "Import":
        this.checkImport(statement);
        return;
      case "CallStatement":
        this.checkCall(statement.call);
        return;

      // Motion (Guidebook §5)
      case "Move":
        this.expectValue(statement.frame, FRAME, "the frame to move");
        this.expectValue(statement.target, TARGET, "the target of move");
        this.optional(statement.speed, amountOf("Speed"), "speed");
        this.optional(statement.tolerance, amountOf("Length"), "tolerance");
        this.optional(statement.via, ROUTE, "via");
        for (const zone of statement.avoid) this.expectValue(zone, ZONE_ONLY, "avoid");
        return;
      case "Drive":
        this.expectValue(statement.frame, FRAME, "the frame to drive");
        this.optional(statement.distance, amountOf("Length"), "by");
        this.optional(statement.speed, amountOf("Speed"), "speed");
        return;
      case "Turn":
        this.expectValue(statement.frame, FRAME, "the frame to turn");
        this.expectValue(statement.angle, amountOf("Angle"), "the angle to turn by");
        this.optional(statement.speed, amountOf("AngularSpeed"), "speed");
        return;
      case "Takeoff":
        this.expectValue(statement.robot, ROBOT, "the robot to take off");
        this.expectValue(statement.height, amountOf("Length"), "the height");
        return;
      case "Land":
        this.expectValue(statement.robot, ROBOT, "the robot to land");
        this.optional(statement.at, PLACE_ONLY, "at");
        return;
      case "Stop":
        this.expectValue(statement.robot, ROBOT, "the robot to stop");
        return;

      // Manipulation
      case "Grip":
        this.expectValue(statement.actuator, ACTUATOR, "the gripper or hand");
        this.optional(statement.force, amountOf("Force"), "force");
        return;
      case "Pick":
        this.expectValue(statement.object, OBJECT_ONLY, "the object to pick");
        this.expectValue(statement.robot, ROBOT, "using");
        this.optional(statement.onto, FRAME, "onto");
        return;
      case "Place":
        this.expectValue(statement.object, OBJECT_ONLY, "the object to place");
        this.expectValue(statement.target, TARGET, "on");
        this.expectValue(statement.frame, FRAME, "using");
        return;
      case "Pour":
        this.expectValue(statement.from, OBJECT_ONLY, "from");
        this.expectValue(statement.into, OBJECT_ONLY, "into");
        this.checkCondition(statement.until, "until");
        return;
      case "Weld":
        this.expectValue(statement.path, ROUTE, "the path to weld along");
        this.expectValue(statement.speed, amountOf("Speed"), "speed");
        this.expectValue(statement.current, amountOf("Current"), "current");
        return;
      case "Spray":
        this.expectValue(statement.actuator, ACTUATOR, "the sprayer");
        this.expectValue(statement.target, TARGET, "on");
        this.expectValue(statement.amount, amountOf("Volume"), "amount");
        return;

      // Sensing, data and talking to people
      case "Capture":
        this.expectValue(statement.sensor, SENSOR, "the sensor to capture with");
        this.checkText(statement.file);
        return;
      case "Log":
        for (const value of statement.values) this.checkValue(value);
        return;
      case "Alert":
        this.checkText(statement.message);
        return;
      case "Say":
        this.checkText(statement.message);
        this.checkLang(statement.lang, statement);
        return;
      case "Confirm":
        this.checkText(statement.question);
        this.checkLang(statement.lang, statement);
        return;

      // Control flow
      case "If":
        for (const branch of statement.branches) {
          this.checkCondition(branch.condition, branch === statement.branches[0] ? "if" : "elif");
          this.checkBlock(branch.body);
        }
        if (statement.elseBody !== null) this.checkBlock(statement.elseBody);
        return;
      case "For": {
        const list = this.checkValue(statement.list);
        let item: Type = UNKNOWN;
        if (list.kind === "List") item = list.item;
        else if (list.kind === "Route") item = { kind: list.item };
        else if (list.kind !== "Unknown") {
          this.report("E306", statement.list, { slot: "for ... in", expected: "a List or Route", got: typeName(list) });
        }
        this.checkBlock(statement.body, () => this.bind(statement.variable, item, statement));
        return;
      }
      case "Repeat":
        if (statement.count !== null) this.checkRepeatCount(statement.count);
        if (statement.interval !== null) this.expectValue(statement.interval, amountOf("Time"), "repeat every");
        this.checkBlock(statement.body);
        return;
      case "Wait":
        this.expectValue(statement.duration, amountOf("Time"), "wait");
        return;
      case "WaitUntil":
        this.checkCondition(statement.condition, "wait until");
        this.optional(statement.timeout, amountOf("Time"), "timeout");
        return;
      case "Parallel":
        this.checkBlock(statement.body);
        return;

      // Safety
      case "Safety":
        for (const rule of statement.rules) {
          if (rule.robot !== null) this.expectValue(rule.robot, ROBOT, rule.action);
          this.optional(rule.at, PLACE_ONLY, "at");
          if (rule.message !== null) this.checkText(rule.message);
          this.checkCondition(rule.condition, "when");
        }
        return;
      default:
        return;
    }
  }

  private optional(expr: Expression | null, accepts: readonly Accept[], slot: string): void {
    if (expr !== null) this.expectValue(expr, accepts, slot);
  }

  /** Conditions must be true or false; there are no "truthy" numbers or text (TYPES_AND_UNITS.md section 3). */
  protected checkCondition(expr: Expression, slot: string): void {
    const type = this.checkValue(expr);
    if (type.kind !== "Bool" && type.kind !== "Unknown") this.report("E307", expr, { slot, got: typeName(type) });
  }

  /** repeat N times: N is a whole number, 0 or more. */
  private checkRepeatCount(count: Expression): void {
    const type = this.expectValue(count, [{ kind: "Number" }], "repeat ... times");
    if (type.kind !== "Number") return;
    const constant = evaluateConstant(count, (name) => this.constantOf(name));
    if (constant?.kind === "Number" && (!Number.isInteger(constant.value) || constant.value < 0)) {
      this.report("E312", count, { value: String(constant.value) });
    }
  }

  private checkLang(lang: string | null, at: Position): void {
    if (lang !== null && !LANGUAGE_CODE.test(lang)) this.report("E316", at, { code: lang });
  }

  /** robot NAME = connect("ADDRESS"): finds the robot's model so its parts can be checked. */
  private checkRobot(statement: RobotStatement): void {
    const address = statement.address.parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");
    const model = this.options.robots?.(statement.name, address);
    if (model === undefined) this.report("E201", statement, { robot: statement.name, address });
    if (this.bind(statement.name, { kind: "Robot", robot: statement.name }, statement) !== undefined) {
      this.robots.set(statement.name, model ?? null);
    }
  }

  /** define place|zone|route NAME = VALUE, from a site map or the program itself. */
  private checkDefine(statement: DefineStatement): void {
    let type: Type;
    if (statement.what === "place") {
      this.expectValue(statement.value, [{ kind: "Pose" }], `place '${statement.name}'`);
      type = { kind: "Place" };
    } else if (statement.what === "zone") {
      this.expectValue(statement.value, [{ kind: "Zone" }], `zone '${statement.name}'`);
      type = ZONE;
    } else {
      const value = this.checkValue(statement.value);
      const item = value.kind === "List" ? value.item : null;
      if (item !== null && item.kind !== "Pose" && item.kind !== "Place" && item.kind !== "Unknown") {
        this.report("E306", statement.value, { slot: `route '${statement.name}'`, expected: "a List of Place or Pose", got: typeName(value) });
      } else if (value.kind !== "List" && value.kind !== "Unknown") {
        this.report("E306", statement.value, { slot: `route '${statement.name}'`, expected: "a List of Place or Pose", got: typeName(value) });
      }
      type = { kind: "Route", item: item?.kind === "Pose" ? "Pose" : "Place" };
    }
    const table = statement.what === "place" ? this.site.places : statement.what === "zone" ? this.site.zones : this.site.route;
    const earlier = table.get(statement.name);
    if (earlier !== undefined) {
      this.report("E207", statement, { name: `${statement.what} ${statement.name}`, line: String(earlier.line) });
      return;
    }
    table.set(statement.name, { type, line: statement.line });
  }

  /** import "FILE.uritp": loads its places, zones, routes and tasks. */
  private checkImport(statement: ImportStatement): void {
    const file = statement.path.parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");
    if (this.importChain.includes(file)) {
      this.report("E214", statement, { file, chain: [...this.importChain, file].join(" -> ") });
      return;
    }
    if (this.imported.has(file)) return; // already loaded once; loading it again changes nothing
    const source = this.options.readFile?.(file) ?? null;
    if (source === null) {
      this.report("E213", statement, { file });
      return;
    }
    this.imported.add(file);
    this.importChain.push(file);
    try {
      this.checkOtherFile(file, source, "import");
    } finally {
      this.importChain.pop();
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
    if (!this.boundAnywhere.has(name)) this.boundAnywhere.set(name, at.line);
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
    const wanted = accepts.find((a) => a.kind === "Frame" || a.kind === "Actuator" || a.kind === "Sensor");
    const role = wanted === undefined ? undefined : (wanted.kind.toLowerCase() as PartRole);
    const type = this.checkValue(expr, role === undefined ? { objectAllowed } : { objectAllowed, role });
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
        return this.checkMember(expr, context);
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
    const boundElsewhere = this.boundAnywhere.get(name);
    if (boundElsewhere !== undefined) {
      // Defined in a block that has ended, like a loop variable used after its loop.
      // Such a name is never taken for an object (DECISIONS.md D4).
      this.report("E202", at, { name, elsewhere: String(boundElsewhere) });
      return UNKNOWN;
    }
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
    if (name === "error") {
      if (this.onFailDepth > 0) return TASK_RESULT;
      this.report("E216", at);
      return UNKNOWN;
    }
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

  protected checkMember(expr: MemberAccess, context: ValueContext = {}): Type {
    const name = expr.name;
    // An unknown name in front of an object property is an object, like mug.fill (D4).
    const objectAllowed = OBJECT_PROPERTIES[name] !== undefined || POSITION_PROPERTIES[name] !== undefined;
    const owner = this.checkValue(expr.object, { objectAllowed });
    return this.memberOf(owner, name, expr, context.role);
  }

  /** The type of `owner.name`, or UNKNOWN after reporting why there is no such property. */
  protected memberOf(owner: Type, name: string, at: Position, role?: PartRole): Type {
    const found = (table: Readonly<Record<string, Type>>): Type | undefined => table[name];
    let result: Type | undefined;
    switch (owner.kind) {
      case "Unknown":
        return UNKNOWN;
      case "Robot":
        return this.robotMember(owner.robot, name, at, role);
      case "Namespace":
        return this.siteMember(owner.namespace, name, at);
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

  /** rover.base, arm.gripper, drone.battery and so on. */
  private robotMember(robot: string, name: string, at: Position, role?: PartRole): Type {
    const property = ROBOT_PROPERTIES[name];
    if (property !== undefined) return property;
    if (name === "frames") return listOf({ kind: "Part", robot, part: "", roles: ["frame"] });
    if ((ROBOT_METHODS as readonly string[]).includes(name)) {
      this.report("E211", at, { owner: "a Robot", name, fix: `Call it with brackets, like ${robot}.${name}("NAME").` });
      return UNKNOWN;
    }
    const model = this.robots.get(robot);
    if (model === undefined || model === null) return UNKNOWN; // E201 has already been reported
    const roles: PartRole[] = [];
    if (model.frames[name] !== undefined) roles.push("frame");
    if (model.actuators[name] !== undefined) roles.push("actuator");
    if (model.sensors[name] !== undefined) roles.push("sensor");
    if (roles.length > 0) return { kind: "Part", robot, part: name, roles };

    const names = (role: PartRole): string[] =>
      Object.keys(role === "frame" ? model.frames : role === "actuator" ? model.actuators : model.sensors);
    const candidates = role === undefined ? [...names("frame"), ...names("actuator"), ...names("sensor")] : names(role);
    this.report(role === undefined ? "E206" : MISSING_PART_CODE[role], at, {
      robot,
      name,
      suggestion: closestMatch(name, candidates) ?? "",
      known: candidates.join(", "),
    });
    return UNKNOWN;
  }

  /** places.NAME, zones.NAME and route.NAME from the site map. */
  private siteMember(namespace: "places" | "zones" | "route", name: string, at: Position): Type {
    const table = this.site[namespace];
    const entry = table.get(name);
    if (entry !== undefined) return entry.type;
    const kind = namespace === "places" ? "place" : namespace === "zones" ? "zone" : "route";
    this.report("E209", at, { kind, name, suggestion: closestMatch(name, [...table.keys()]) ?? "" });
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

  /** A call like obj.above(10cm), reading.analyse(cup), rover.sense("x") or vendor.feature(...). */
  protected checkMethodCall(callee: MemberAccess, call: CallExpression): Type {
    const name = callee.name;
    if (this.isExtensionCall(callee)) {
      // A vendor extension such as examplecorp.adaptive_weld(...). Phase 4 checks it against
      // the manifests (D18); here only its arguments are checked.
      this.checkArgumentsLoosely(call.args, { objectAllowed: true });
      return UNKNOWN;
    }
    const owner = this.checkValue(callee.object, { objectAllowed: POSE_HELPERS[name] !== undefined });
    if (owner.kind === "Unknown") {
      this.checkArgumentsLoosely(call.args);
      return UNKNOWN;
    }
    if (owner.kind === "Robot" && (name === "has" || name === "sense")) return this.checkRobotMethod(owner.robot, name, call);
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

  /**
   * vendor.feature(...): the vendor is a name that is not bound and not built in, and the
   * feature is not a standard helper (cup.above(10cm) is an object, not an extension).
   */
  private isExtensionCall(callee: MemberAccess): boolean {
    const vendor = callee.object;
    if (vendor.kind !== "Name") return false;
    const standard = POSE_HELPERS[callee.name] !== undefined || callee.name === "analyse" ||
      (ROBOT_METHODS as readonly string[]).includes(callee.name);
    if (standard) return false;
    if (this.scope.lookup(vendor.name) !== undefined) return false;
    return !BUILT_IN_NAMES.includes(vendor.name);
  }

  /** robot.has("NAME") gives Bool; robot.sense("NAME") gives a Reading from that sensor. */
  private checkRobotMethod(robot: string, name: "has" | "sense", call: CallExpression): Type {
    this.rejectNamedArguments(call.args, `.${name}`);
    const [first] = call.args;
    if (call.args.length !== 1 || first === undefined) {
      this.report("E309", call, { what: `.${name}()`, expected: "1", got: String(call.args.length) });
      this.checkArgumentsLoosely(call.args);
      return name === "has" ? BOOL : UNKNOWN;
    }
    const text = first.value;
    if (text.kind !== "Text" || text.parts.some((p) => p.kind === "insert")) {
      this.checkValue(text);
      this.report("E311", first, { what: `.${name}()` });
      return name === "has" ? BOOL : UNKNOWN;
    }
    if (name === "has") return BOOL;
    const sensor = text.parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");
    const model = this.robots.get(robot);
    if (model === undefined || model === null) return UNKNOWN;
    const found = model.sensors[sensor];
    if (found === undefined) {
      const known = Object.keys(model.sensors);
      this.report("E205", first, { robot, name: sensor, suggestion: closestMatch(sensor, known) ?? "", known: known.join(", ") });
      return UNKNOWN;
    }
    return { kind: "Reading", dimension: found.dimension };
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
export function check(program: Program, options: CheckOptions = {}): CheckResult {
  const checker = new Checker(options);
  checker.checkProgram(program);
  return { diagnostics: checker.uniqueDiagnostics() };
}
