// Reads the tokens of a program and builds its syntax tree, following spec/GRAMMAR.md.
// It is a hand-written "recursive descent" parser: one method per grammar rule.

import { makeDiagnostic, type Diagnostic, type DiagnosticArgs } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import { lex } from "../lexer/lexer.js";
import { describeToken, type Token } from "../lexer/tokens.js";
import type {
  AlertStatement,
  Argument,
  AskExpression,
  BinaryOperator,
  Block,
  BreakStatement,
  CallStatement,
  CaptureStatement,
  ConfirmStatement,
  DriveStatement,
  Expression,
  ForStatement,
  GripStatement,
  IfBranch,
  IfStatement,
  ImportStatement,
  LandStatement,
  LetStatement,
  LogStatement,
  MoveStatement,
  ParallelStatement,
  PickStatement,
  PlaceStatement,
  PourStatement,
  Program,
  RepeatStatement,
  ReturnStatement,
  RobotStatement,
  SayStatement,
  SprayStatement,
  Statement,
  StopStatement,
  TakeoffStatement,
  TaskStatement,
  TextLiteral,
  TurnStatement,
  WaitStatement,
  WaitUntilStatement,
  WeldStatement,
} from "./ast.js";

/** Thrown to give up on the current statement after an error has been recorded. */
class ParseError extends Error {}

const COMPARISON_OPERATORS = ["==", "!=", "<", "<=", ">", ">="];

/** Words that can start a statement, used for "did you mean ...?" hints. */
const STATEMENT_WORDS = [
  "robot", "let", "task", "return", "import", "move", "drive", "turn", "takeoff",
  "land", "stop", "grip", "pick", "place", "pour", "weld", "spray", "capture",
  "log", "alert", "say", "confirm", "if", "for", "repeat", "break", "wait",
  "parallel", "safety", "native", "define",
];

/** Words from other languages or the examples that people may type by habit. */
const STATEMENT_HINTS: Readonly<Record<string, string>> = {
  disp: "say",
  display: "say",
  print: "say",
  speak: "say",
  show: "say",
  goto: "move",
  go: "move",
  sleep: "wait",
  delay: "wait",
  pause: "wait",
  while: "repeat",
  loop: "repeat",
  def: "task",
  function: "task",
  func: "task",
  var: "let",
  const: "let",
  set: "let",
};

/** What the statement being read is allowed to contain (DECISIONS.md C6). */
interface Context {
  /** True only for statements directly in the program, not inside any block. */
  readonly topLevel: boolean;
  /** True inside a task body, where return is allowed. */
  readonly canReturn: boolean;
  /** True inside a for or repeat loop, where break is allowed. */
  readonly canBreak: boolean;
}

const TOP_LEVEL: Context = { topLevel: true, canReturn: false, canBreak: false };

/** Rules for statements that only belong in one kind of place. */
const PLACEMENT: Readonly<Record<string, { allowed: (c: Context) => boolean; where: string; fix: string }>> = {
  robot: { allowed: (c) => c.topLevel, where: "at the top level of a program", fix: "Move it to the top level, with no indentation." },
  task: { allowed: (c) => c.topLevel, where: "at the top level of a program", fix: "Move it to the top level, with no indentation. Tasks cannot be put inside other blocks." },
  import: { allowed: (c) => c.topLevel, where: "at the top level of a program", fix: "Move it to the top level, with no indentation." },
  define: { allowed: (c) => c.topLevel, where: "at the top level of a program", fix: "Move it to the top level, with no indentation." },
  safety: { allowed: (c) => c.topLevel, where: "at the top level of a program", fix: "Move it to the top level, with no indentation." },
  return: { allowed: (c) => c.canReturn, where: "inside a task", fix: "Use return only inside a task, and not inside parallel:." },
  break: { allowed: (c) => c.canBreak, where: "inside a for or repeat loop", fix: "Use break only inside a loop. It cannot be used inside parallel: or to leave a task." },
};

export class Parser {
  private position = 0;
  private context: Context = TOP_LEVEL;
  readonly diagnostics: Diagnostic[] = [];

  constructor(private readonly tokens: readonly Token[]) {}

  // -------------------------------------------------------------------------
  // Moving through the tokens
  // -------------------------------------------------------------------------

  /** The token `offset` places ahead, without moving. The last token is always EOF. */
  protected peek(offset = 0): Token {
    const index = Math.min(this.position + offset, this.tokens.length - 1);
    return this.tokens[index] as Token;
  }

  protected advance(): Token {
    const token = this.peek();
    if (token.kind !== "eof") this.position++;
    return token;
  }

  protected isKeyword(word: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.kind === "keyword" && token.text === word;
  }

  protected isSymbol(symbol: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.kind === "symbol" && token.text === symbol;
  }

  protected acceptKeyword(word: string): Token | undefined {
    return this.isKeyword(word) ? this.advance() : undefined;
  }

  protected acceptSymbol(symbol: string): Token | undefined {
    return this.isSymbol(symbol) ? this.advance() : undefined;
  }

  // -------------------------------------------------------------------------
  // Reporting errors
  // -------------------------------------------------------------------------

  /** Records a problem at `token` and carries on. */
  protected report(code: string, token: Token, args: DiagnosticArgs = {}): void {
    this.diagnostics.push(makeDiagnostic(code, token.line, token.column, args));
  }

  /** Records a problem at `token` and gives up on the current statement. */
  protected fail(code: string, token: Token, args: DiagnosticArgs = {}): never {
    this.report(code, token, args);
    throw new ParseError(code);
  }

  /** Records "expected X but found Y" and gives up on the current statement. */
  protected failExpected(expected: string, form = "", fix = ""): never {
    const token = this.peek();
    return this.fail("E120", token, { expected, found: describeToken(token), form, fix });
  }

  protected expectKeyword(word: string, form = ""): Token {
    return this.acceptKeyword(word) ?? this.failExpected(`'${word}'`, form);
  }

  protected expectSymbol(symbol: string, form = ""): Token {
    return this.acceptSymbol(symbol) ?? this.failExpected(`'${symbol}'`, form);
  }

  /** Reads a name the program chooses. Keywords are refused with E123. */
  protected expectName(what = "a name", form = ""): Token {
    const token = this.peek();
    if (token.kind === "name") return this.advance();
    if (token.kind === "keyword") this.fail("E123", token, { word: token.text });
    return this.failExpected(what, form);
  }

  /** Reads a text literal and turns it into a tree node. */
  protected expectText(what = "text in double quotes", form = ""): TextLiteral {
    const token = this.peek();
    if (token.kind !== "text") return this.failExpected(what, form);
    this.advance();
    return { kind: "Text", parts: token.parts, line: token.line, column: token.column };
  }

  /** Reports E130 if `text` contains {insertions} where only fixed text is allowed (DECISIONS.md B6). */
  protected requireConstantText(text: TextLiteral, what: string): void {
    const insert = text.parts.find((part) => part.kind === "insert");
    if (insert !== undefined) {
      this.diagnostics.push(makeDiagnostic("E130", text.line, text.column, { what }));
    }
  }

  // -------------------------------------------------------------------------
  // Values (expressions), from loosest to tightest binding (GRAMMAR.md 2.10)
  // -------------------------------------------------------------------------

  parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let left = this.parseAnd();
    while (this.isKeyword("or")) {
      this.advance();
      left = this.binary("or", left, this.parseAnd());
    }
    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();
    while (this.isKeyword("and")) {
      this.advance();
      left = this.binary("and", left, this.parseNot());
    }
    return left;
  }

  private parseNot(): Expression {
    const token = this.acceptKeyword("not");
    if (token === undefined) return this.parseComparison();
    const operand = this.parseNot();
    return { kind: "Unary", op: "not", operand, line: token.line, column: token.column };
  }

  private parseComparison(): Expression {
    const left = this.parseAdditive();
    const op = this.peek();
    if (op.kind !== "symbol" || !COMPARISON_OPERATORS.includes(op.text)) return left;
    this.advance();
    const result = this.binary(op.text as BinaryOperator, left, this.parseAdditive());
    const another = this.peek();
    if (another.kind === "symbol" && COMPARISON_OPERATORS.includes(another.text)) {
      this.fail("E125", another);
    }
    return result;
  }

  private parseAdditive(): Expression {
    let left = this.parseUnary();
    while (this.isSymbol("+") || this.isSymbol("-")) {
      const op = this.advance().text as BinaryOperator;
      left = this.binary(op, left, this.parseUnary());
    }
    return left;
  }

  private parseUnary(): Expression {
    const token = this.acceptSymbol("-");
    if (token === undefined) return this.parsePostfix();
    const operand = this.parseUnary();
    return { kind: "Unary", op: "-", operand, line: token.line, column: token.column };
  }

  /** A value followed by any number of .name parts and (argument) lists. */
  private parsePostfix(): Expression {
    let expression = this.parsePrimary();
    for (;;) {
      if (this.isSymbol(".")) {
        this.advance();
        const name = this.expectName("a name after '.'");
        expression = {
          kind: "Member",
          object: expression,
          name: name.text,
          line: expression.line,
          column: expression.column,
        };
      } else if (this.isSymbol("(")) {
        if (expression.kind !== "Name" && expression.kind !== "Member") {
          this.fail("E120", this.peek(), {
            expected: "the end of the value",
            found: "'('",
            fix: "Only a name such as pose or obj.above can be called with ( ).",
          });
        }
        this.advance();
        const args = this.parseArguments();
        expression = { kind: "Call", callee: expression, args, line: expression.line, column: expression.column };
      } else {
        return expression;
      }
    }
  }

  private parsePrimary(): Expression {
    const token = this.peek();
    const at = { line: token.line, column: token.column };
    switch (token.kind) {
      case "number":
        this.advance();
        return { kind: "Number", value: token.value, raw: token.text, ...at };
      case "quantity":
        this.advance();
        return { kind: "Quantity", value: token.value, unit: token.unit, raw: token.text, ...at };
      case "percent":
        this.advance();
        return { kind: "Percent", value: token.value, ...at };
      case "text":
        this.advance();
        return { kind: "Text", parts: token.parts, ...at };
      case "name":
        this.advance();
        return { kind: "Name", name: token.text, ...at };
      case "keyword":
        if (token.text === "true" || token.text === "false") {
          this.advance();
          return { kind: "Bool", value: token.text === "true", ...at };
        }
        if (token.text === "to" && this.isSymbol("(", 1)) {
          // The built-in to(q, unit), which shares its name with the keyword (DECISIONS.md B7).
          this.advance();
          return { kind: "Name", name: "to", ...at };
        }
        if (token.text === "ask") this.fail("E129", token);
        return this.failExpected("a value");
      case "symbol":
        if (token.text === "(") {
          this.advance();
          const inner = this.parseExpression();
          this.expectSymbol(")");
          return inner;
        }
        if (token.text === "[") return this.parseList();
        return this.failExpected("a value");
      default:
        return this.failExpected("a value");
    }
  }

  private parseList(): Expression {
    const open = this.advance();
    const items: Expression[] = [];
    if (!this.isSymbol("]")) {
      do {
        items.push(this.parseExpression());
      } while (this.acceptSymbol(","));
    }
    this.expectSymbol("]");
    return { kind: "List", items, line: open.line, column: open.column };
  }

  /** Reads arguments after "(" up to and including ")". Plain ones come before name=value ones (C7). */
  private parseArguments(): Argument[] {
    const args: Argument[] = [];
    let sawLabel = false;
    if (this.acceptSymbol(")")) return args;
    do {
      const start = this.peek();
      const labelled = (start.kind === "name" || start.kind === "keyword") && this.isSymbol("=", 1);
      if (labelled) {
        this.advance();
        this.advance();
        sawLabel = true;
        args.push({ label: start.text, value: this.parseExpression(), line: start.line, column: start.column });
      } else {
        if (sawLabel) this.report("E126", start);
        args.push({ label: null, value: this.parseExpression(), line: start.line, column: start.column });
      }
    } while (this.acceptSymbol(","));
    this.expectSymbol(")");
    return args;
  }

  private binary(op: BinaryOperator, left: Expression, right: Expression): Expression {
    return { kind: "Binary", op, left, right, line: left.line, column: left.column };
  }

  // -------------------------------------------------------------------------
  // Programs and blocks (GRAMMAR.md 2.1)
  // -------------------------------------------------------------------------

  parseProgram(): Program {
    const { statements, onFail } = this.parseStatements("eof");
    return { kind: "Program", statements, onFail };
  }

  /**
   * Reads statements until `end` (the end of a block, or of the file).
   * An on fail: handler must be the last item (DECISIONS.md C6).
   */
  private parseStatements(end: "dedent" | "eof"): Block {
    const statements: Statement[] = [];
    let onFail: Block["onFail"] = null;
    for (;;) {
      const token = this.peek();
      if (token.kind === end || token.kind === "eof") break;
      if (token.kind === "dedent" || token.kind === "newline") {
        this.advance(); // left over after an earlier error
        continue;
      }
      if (token.kind === "indent") {
        this.synchronize(); // a block with no statement to belong to; the lexer has reported it
        continue;
      }
      if (this.isKeyword("on") && this.isKeyword("fail", 1)) {
        const handler = this.parseOnFail();
        if (handler !== null) onFail = handler;
        const next = this.peek().kind;
        if (next !== end && next !== "eof") this.report("E128", token);
        continue;
      }
      const statement = this.parseStatementSafely();
      if (statement !== null) statements.push(statement);
    }
    return { statements, onFail };
  }

  private parseOnFail(): Block["onFail"] {
    const start = this.advance();
    this.advance(); // fail
    try {
      const body = this.parseBlock("'on fail'");
      return { body, line: start.line, column: start.column };
    } catch (error) {
      if (!(error instanceof ParseError)) throw error;
      this.synchronize();
      return null;
    }
  }

  /** Reads ':' NEWLINE INDENT statements DEDENT. `after` names the line, for the E101 message. */
  protected parseBlock(after: string, context: Partial<Context> = {}): Block {
    if (!this.isSymbol(":")) this.fail("E101", this.peek(), { after });
    this.advance();
    if (this.peek().kind !== "newline") {
      this.failExpected("the end of the line after ':'", "", "Start the block on the next line, indented by 4 more spaces.");
    }
    this.advance();
    if (this.peek().kind !== "indent") {
      // Report but do not give up: the next line is a real statement and should still be read.
      this.report("E104", this.peek());
      return { statements: [], onFail: null };
    }
    this.advance();
    const outer = this.context;
    this.context = { ...outer, topLevel: false, ...context };
    try {
      const block = this.parseStatements("dedent");
      if (this.peek().kind === "dedent") this.advance();
      return block;
    } finally {
      this.context = outer;
    }
  }

  /** Reads one statement; after an error, skips to the next statement and returns null. */
  private parseStatementSafely(): Statement | null {
    try {
      return this.parseStatement();
    } catch (error) {
      if (!(error instanceof ParseError)) throw error;
      this.synchronize();
      return null;
    }
  }

  /**
   * Skips the rest of a broken statement: up to the end of its line, plus any block
   * that belongs to it (and the elif/else parts of a broken if).
   */
  private synchronize(): void {
    let depth = 0;
    for (;;) {
      const token = this.peek();
      if (token.kind === "eof") return;
      if (token.kind === "indent") {
        depth++;
      } else if (token.kind === "dedent") {
        if (depth === 0) return; // the end of the enclosing block: not ours to skip
        depth--;
        if (depth === 0) {
          this.advance();
          if (this.isKeyword("elif") || this.isKeyword("else")) continue;
          return;
        }
      } else if (token.kind === "newline" && depth === 0) {
        this.advance();
        if (this.peek().kind !== "indent") return;
        continue;
      }
      this.advance();
    }
  }

  /** Expects the end of a simple statement's line. */
  protected endStatement(form: string): void {
    if (this.peek().kind === "newline") {
      this.advance();
      return;
    }
    if (this.isSymbol(",")) {
      this.failExpected("the end of the line", form, "Remove the comma. The parts of a statement follow each other without commas.");
    }
    this.failExpected("the end of the line", form);
  }

  // -------------------------------------------------------------------------
  // Statements (GRAMMAR.md 2.2 to 2.8)
  // -------------------------------------------------------------------------

  private parseStatement(): Statement {
    const token = this.peek();
    if (token.kind === "name") return this.parseCallStatement();
    if (token.kind !== "keyword") return this.failExpected("a statement");

    const placement = PLACEMENT[token.text];
    if (placement !== undefined && !placement.allowed(this.context)) {
      this.report("E127", token, { statement: token.text, where: placement.where, fix: placement.fix });
    }

    switch (token.text) {
      case "robot":
        return this.parseRobot();
      case "let":
        return this.parseLet();
      case "task":
        return this.parseTask();
      case "return":
        return this.parseReturn();
      case "import":
        return this.parseImport();
      case "move":
        return this.parseMove();
      case "drive":
        return this.parseDrive();
      case "turn":
        return this.parseTurn();
      case "takeoff":
        return this.parseTakeoff();
      case "land":
        return this.parseLand();
      case "stop":
        return this.parseStop();
      case "grip":
        return this.parseGrip();
      case "pick":
        return this.parsePick();
      case "place":
        return this.parsePlace();
      case "pour":
        return this.parsePour();
      case "weld":
        return this.parseWeld();
      case "spray":
        return this.parseSpray();
      case "capture":
        return this.parseCapture();
      case "log":
        return this.parseLog();
      case "alert":
        return this.parseAlert();
      case "say":
        return this.parseSay();
      case "confirm":
        return this.parseConfirm();
      case "if":
        return this.parseIf();
      case "for":
        return this.parseFor();
      case "repeat":
        return this.parseRepeat();
      case "break":
        return this.parseBreak();
      case "wait":
        return this.parseWait();
      case "parallel":
        return this.parseParallel();
      default:
        return this.parseOtherKeyword(token);
    }
  }

  /** Explains keywords that cannot start a statement. */
  protected parseOtherKeyword(token: Token): Statement {
    switch (token.text) {
      case "return_home":
        return this.fail("E127", token, {
          statement: "return_home",
          where: "as a safety action inside safety:",
          fix: "Write it inside a safety: block, for example: return_home drone when drone.battery < 25%",
        });
      case "ask":
        return this.fail("E129", token);
      case "elif":
      case "else":
        return this.failExpected("a statement", "", `'${token.text}' must line up with an 'if' just above it.`);
      case "on":
        this.advance();
        return this.failExpected("'fail'", "on fail:");
      default:
        return this.failExpected("a statement");
    }
  }

  // ---- Program structure (GRAMMAR.md 2.3) ----

  private parseRobot(): RobotStatement {
    const form = 'robot NAME = connect("ADDRESS")';
    const start = this.advance();
    const name = this.expectName("a robot name", form);
    this.expectSymbol("=", form);
    this.expectKeyword("connect", form);
    this.expectSymbol("(", form);
    const address = this.expectText("the robot address in double quotes", form);
    this.requireConstantText(address, "robot address");
    this.expectSymbol(")", form);
    this.endStatement(form);
    return { kind: "Robot", name: name.text, address, line: start.line, column: start.column };
  }

  private parseLet(): LetStatement {
    const form = "let NAME = VALUE";
    const start = this.advance();
    const name = this.expectName("a name", form);
    this.expectSymbol("=", form);
    let value: Expression | AskExpression;
    const ask = this.acceptKeyword("ask");
    if (ask !== undefined) {
      const question = this.expectText("a question in double quotes", 'let NAME = ask "QUESTION" [lang CODE]');
      value = { kind: "Ask", question, lang: this.parseLang(), line: ask.line, column: ask.column };
    } else {
      value = this.parseExpression();
    }
    this.endStatement(form);
    return { kind: "Let", name: name.text, value, line: start.line, column: start.column };
  }

  private parseTask(): TaskStatement {
    const form = "task NAME(PARAMS):";
    const start = this.advance();
    const name = this.expectName("a task name", form);
    this.expectSymbol("(", form);
    const params: string[] = [];
    if (!this.isSymbol(")")) {
      do {
        params.push(this.expectName("a parameter name", form).text);
      } while (this.acceptSymbol(","));
    }
    this.expectSymbol(")", form);
    const body = this.parseBlock("the task name and its parameters", { canReturn: true, canBreak: false });
    return { kind: "Task", name: name.text, params, body, line: start.line, column: start.column };
  }

  private parseReturn(): ReturnStatement {
    const start = this.advance();
    const value = this.peek().kind === "newline" ? null : this.parseExpression();
    this.endStatement("return [VALUE]");
    return { kind: "Return", value, line: start.line, column: start.column };
  }

  private parseImport(): ImportStatement {
    const form = 'import "FILE.uritp"';
    const start = this.advance();
    const path = this.expectText("a file name in double quotes", form);
    this.requireConstantText(path, "file name");
    this.endStatement(form);
    return { kind: "Import", path, line: start.line, column: start.column };
  }

  /** A line starting with a name must be a call, like pick_and_place(cup, tray) (DECISIONS.md C3). */
  private parseCallStatement(): CallStatement {
    const start = this.peek();
    if (!this.isSymbol("(", 1) && !this.isSymbol(".", 1)) {
      this.fail("E121", start, this.unknownStatementHint(start.text));
    }
    const expression = this.parseExpression();
    if (expression.kind !== "Call") this.fail("E122", start);
    this.endStatement("NAME(ARGS)");
    return { kind: "CallStatement", call: expression, line: start.line, column: start.column };
  }

  // ---- Motion (GRAMMAR.md 2.4) ----

  /**
   * Reads optional clauses such as "speed 0.5m/s tolerance 1cm", in any order (DECISIONS.md C2).
   * Each may appear once, except those listed in `repeatable`.
   */
  private parseOptions(
    allowed: readonly string[],
    form: string,
    repeatable: readonly string[] = [],
  ): Map<string, Expression[]> {
    const options = new Map<string, Expression[]>();
    for (;;) {
      const next = this.peek(1);
      if (this.isSymbol(",") && next.kind === "keyword" && allowed.includes(next.text)) {
        this.failExpected(
          `'${next.text}'`,
          form,
          `Remove the comma before '${next.text}'. Clauses follow each other without commas.`,
        );
      }
      const clause = this.peek();
      if (clause.kind !== "keyword" || !allowed.includes(clause.text)) return options;
      this.advance();
      const values = options.get(clause.text) ?? [];
      if (values.length > 0 && !repeatable.includes(clause.text)) {
        this.report("E124", clause, { clause: clause.text });
      }
      values.push(this.parseExpression());
      options.set(clause.text, values);
    }
  }

  private static first(options: Map<string, Expression[]>, clause: string): Expression | null {
    return options.get(clause)?.[0] ?? null;
  }

  private parseMove(): MoveStatement {
    const form = "move FRAME to TARGET [speed Q] [tolerance Q] [via ROUTE] [avoid ZONE]";
    const start = this.advance();
    const frame = this.parseExpression();
    this.expectKeyword("to", form);
    const target = this.parseExpression();
    const options = this.parseOptions(["speed", "tolerance", "via", "avoid"], form, ["avoid"]);
    this.endStatement(form);
    return {
      kind: "Move",
      frame,
      target,
      speed: Parser.first(options, "speed"),
      tolerance: Parser.first(options, "tolerance"),
      via: Parser.first(options, "via"),
      avoid: options.get("avoid") ?? [],
      line: start.line,
      column: start.column,
    };
  }

  private parseDrive(): DriveStatement {
    const form = "drive FRAME forward/backward [by Q] [speed Q]";
    const start = this.advance();
    const frame = this.parseExpression();
    const direction = this.acceptKeyword("forward") ?? this.acceptKeyword("backward");
    if (direction === undefined) this.failExpected("'forward' or 'backward'", form);
    const options = this.parseOptions(["by", "speed"], form);
    this.endStatement(form);
    return {
      kind: "Drive",
      frame,
      direction: direction.text as "forward" | "backward",
      distance: Parser.first(options, "by"),
      speed: Parser.first(options, "speed"),
      line: start.line,
      column: start.column,
    };
  }

  private parseTurn(): TurnStatement {
    const form = "turn FRAME by ANGLE [speed Q]";
    const start = this.advance();
    const frame = this.parseExpression();
    this.expectKeyword("by", form);
    const angle = this.parseExpression();
    const options = this.parseOptions(["speed"], form);
    this.endStatement(form);
    return { kind: "Turn", frame, angle, speed: Parser.first(options, "speed"), line: start.line, column: start.column };
  }

  private parseTakeoff(): TakeoffStatement {
    const form = "takeoff ROBOT to HEIGHT";
    const start = this.advance();
    const robot = this.parseExpression();
    if (!this.isKeyword("to") && robot.kind === "Call" && robot.callee.kind === "Name" && robot.args.length === 1) {
      // takeoff drone(15m), as in the original example iii (DECISIONS.md A6).
      const height = robot.args[0]?.value;
      const shown = height?.kind === "Quantity" ? height.raw : "HEIGHT";
      this.failExpected("'to'", form, `Write: takeoff ${robot.callee.name} to ${shown}`);
    }
    this.expectKeyword("to", form);
    const height = this.parseExpression();
    this.endStatement(form);
    return { kind: "Takeoff", robot, height, line: start.line, column: start.column };
  }

  private parseLand(): LandStatement {
    const form = "land ROBOT [at PLACE]";
    const start = this.advance();
    const robot = this.parseExpression();
    const at = this.acceptKeyword("at") === undefined ? null : this.parseExpression();
    this.endStatement(form);
    return { kind: "Land", robot, at, line: start.line, column: start.column };
  }

  private parseStop(): StopStatement {
    const start = this.advance();
    const robot = this.parseExpression();
    this.endStatement("stop ROBOT");
    return { kind: "Stop", robot, line: start.line, column: start.column };
  }

  // ---- Manipulation (GRAMMAR.md 2.5) ----

  private parseGrip(): GripStatement {
    const form = "grip ACTUATOR open/close [force Q]";
    const start = this.advance();
    const actuator = this.parseExpression();
    const action = this.acceptKeyword("open") ?? this.acceptKeyword("close");
    if (action === undefined) this.failExpected("'open' or 'close'", form);
    const options = this.parseOptions(["force"], form);
    this.endStatement(form);
    return {
      kind: "Grip",
      actuator,
      action: action.text as "open" | "close",
      force: Parser.first(options, "force"),
      line: start.line,
      column: start.column,
    };
  }

  private parsePick(): PickStatement {
    const form = "pick OBJECT using ROBOT [onto FRAME]";
    const start = this.advance();
    const object = this.parseExpression();
    this.expectKeyword("using", form);
    const robot = this.parseExpression();
    const onto = this.acceptKeyword("onto") === undefined ? null : this.parseExpression();
    this.endStatement(form);
    return { kind: "Pick", object, robot, onto, line: start.line, column: start.column };
  }

  private parsePlace(): PlaceStatement {
    const form = "place OBJECT on TARGET using FRAME";
    const start = this.advance();
    const object = this.parseExpression();
    this.expectKeyword("on", form);
    const target = this.parseExpression();
    this.expectKeyword("using", form);
    const frame = this.parseExpression();
    this.endStatement(form);
    return { kind: "Place", object, target, frame, line: start.line, column: start.column };
  }

  private parsePour(): PourStatement {
    const form = "pour from OBJECT into OBJECT until CONDITION";
    const start = this.advance();
    this.expectKeyword("from", form);
    const from = this.parseExpression();
    this.expectKeyword("into", form);
    const into = this.parseExpression();
    this.expectKeyword("until", form);
    const until = this.parseExpression();
    this.endStatement(form);
    return { kind: "Pour", from, into, until, line: start.line, column: start.column };
  }

  private parseWeld(): WeldStatement {
    const form = "weld along PATH speed Q current Q";
    const start = this.advance();
    this.expectKeyword("along", form);
    const path = this.parseExpression();
    this.expectKeyword("speed", form);
    const speed = this.parseExpression();
    this.expectKeyword("current", form);
    const current = this.parseExpression();
    this.endStatement(form);
    return { kind: "Weld", path, speed, current, line: start.line, column: start.column };
  }

  private parseSpray(): SprayStatement {
    const form = "spray ACTUATOR on TARGET amount Q";
    const start = this.advance();
    const actuator = this.parseExpression();
    this.expectKeyword("on", form);
    const target = this.parseExpression();
    this.expectKeyword("amount", form);
    const amount = this.parseExpression();
    this.endStatement(form);
    return { kind: "Spray", actuator, target, amount, line: start.line, column: start.column };
  }

  // ---- Sensing and data (GRAMMAR.md 2.6) ----

  private parseCapture(): CaptureStatement {
    const form = 'capture SENSOR save as "FILE"';
    const start = this.advance();
    const sensor = this.parseExpression();
    this.expectKeyword("save", form);
    this.expectKeyword("as", form);
    const file = this.expectText("a file name in double quotes", form);
    this.endStatement(form);
    return { kind: "Capture", sensor, file, line: start.line, column: start.column };
  }

  private parseLog(): LogStatement {
    const start = this.advance();
    const values = [this.parseExpression()];
    while (this.acceptSymbol(",")) values.push(this.parseExpression());
    this.endStatement("log VALUE, VALUE, ...");
    return { kind: "Log", values, line: start.line, column: start.column };
  }

  private parseAlert(): AlertStatement {
    const form = 'alert "TEXT"';
    const start = this.advance();
    const message = this.expectText("a message in double quotes", form);
    this.endStatement(form);
    return { kind: "Alert", message, line: start.line, column: start.column };
  }

  // ---- Talking to people (GRAMMAR.md 2.7) ----

  private parseSay(): SayStatement {
    const form = 'say "TEXT" [lang CODE]';
    const start = this.advance();
    const message = this.expectText("a message in double quotes", form);
    const lang = this.parseLang();
    this.endStatement(form);
    return { kind: "Say", message, lang, line: start.line, column: start.column };
  }

  private parseConfirm(): ConfirmStatement {
    const form = 'confirm "QUESTION" [lang CODE]';
    const start = this.advance();
    const question = this.expectText("a question in double quotes", form);
    const lang = this.parseLang();
    this.endStatement(form);
    return { kind: "Confirm", question, lang, line: start.line, column: start.column };
  }

  // ---- Control flow (GRAMMAR.md 2.8) ----

  private parseIf(): IfStatement {
    const start = this.advance();
    const branches: IfBranch[] = [];
    const condition = this.parseExpression();
    branches.push({ condition, body: this.parseBlock("the 'if' condition"), line: start.line, column: start.column });
    for (;;) {
      const elif = this.acceptKeyword("elif");
      if (elif === undefined) break;
      const elifCondition = this.parseExpression();
      const body = this.parseBlock("the 'elif' condition");
      branches.push({ condition: elifCondition, body, line: elif.line, column: elif.column });
    }
    let elseBody: Block | null = null;
    if (this.acceptKeyword("else") !== undefined) {
      if (this.isKeyword("if")) {
        this.failExpected("':'", "", "Write 'elif CONDITION:' instead of 'else if'.");
      }
      elseBody = this.parseBlock("'else'");
    }
    return { kind: "If", branches, elseBody, line: start.line, column: start.column };
  }

  private parseFor(): ForStatement {
    const form = "for NAME in LIST:";
    const start = this.advance();
    const variable = this.expectName("a name for each item", form);
    this.expectKeyword("in", form);
    const list = this.parseExpression();
    const body = this.parseBlock("the 'for' line", { canBreak: true });
    return { kind: "For", variable: variable.text, list, body, line: start.line, column: start.column };
  }

  private parseRepeat(): RepeatStatement {
    const form = "repeat N times: / repeat every Q: / repeat forever:";
    const start = this.advance();
    let mode: RepeatStatement["mode"];
    let count: Expression | null = null;
    let interval: Expression | null = null;
    if (this.acceptKeyword("forever") !== undefined) {
      mode = "forever";
    } else if (this.acceptKeyword("every") !== undefined) {
      mode = "every";
      interval = this.parseExpression();
    } else {
      if (this.isKeyword("for")) {
        // repeat for 30min, from example iv (DECISIONS.md A11).
        this.failExpected("a number of times, 'every' or 'forever'", form, "URITP has no 'repeat for'. Use repeat forever: with a check like 'if now() >= 30min: break'.");
      }
      mode = "times";
      count = this.parseExpression();
      this.expectKeyword("times", form);
    }
    const body = this.parseBlock("the 'repeat' line", { canBreak: true });
    return { kind: "Repeat", mode, count, interval, body, line: start.line, column: start.column };
  }

  private parseBreak(): BreakStatement {
    const start = this.advance();
    this.endStatement("break");
    return { kind: "Break", line: start.line, column: start.column };
  }

  private parseWait(): WaitStatement | WaitUntilStatement {
    const start = this.advance();
    const at = { line: start.line, column: start.column };
    if (this.acceptKeyword("until") !== undefined) {
      const form = "wait until CONDITION [timeout Q]";
      const condition = this.parseExpression();
      const timeout = this.acceptKeyword("timeout") === undefined ? null : this.parseExpression();
      this.endStatement(form);
      return { kind: "WaitUntil", condition, timeout, ...at };
    }
    const duration = this.parseExpression();
    this.endStatement("wait Q / wait until CONDITION [timeout Q]");
    return { kind: "Wait", duration, ...at };
  }

  private parseParallel(): ParallelStatement {
    const start = this.advance();
    // break and return would leave while other parts are still running (DECISIONS.md C6).
    const body = this.parseBlock("'parallel'", { canBreak: false, canReturn: false });
    return { kind: "Parallel", body, line: start.line, column: start.column };
  }

  /** Builds the "did you mean ...?" details for a word that is not a statement. */
  private unknownStatementHint(word: string): Record<string, string> {
    if (this.isSymbol("=", 1)) {
      return { word, fix: `To give a name to a value, write: let ${word} = ...` };
    }
    if (word.toLowerCase() === "returnhome") {
      return { word, fix: "Write return_home inside a safety: block, for example: return_home drone when drone.battery < 25%" };
    }
    const hint = STATEMENT_HINTS[word.toLowerCase()];
    if (hint !== undefined) return { word, suggestion: hint };
    const close = closestMatch(word, STATEMENT_WORDS);
    if (close !== undefined && close === word.toLowerCase()) {
      return { word, fix: `Did you mean '${close}'? Keywords are written in lower case.` };
    }
    return { word, suggestion: close ?? "" };
  }

  /** Reads an optional "lang CODE". The code may be any word, like hi, en, or (DECISIONS.md B7). */
  protected parseLang(): string | null {
    if (this.acceptKeyword("lang") === undefined) return null;
    const code = this.peek();
    if (code.kind !== "name" && code.kind !== "keyword") return this.failExpected("a language code such as en or hi");
    this.advance();
    return code.text;
  }

  // -------------------------------------------------------------------------
  // Helpers for tests and tools
  // -------------------------------------------------------------------------

  /** Parses a whole token list as one value, reporting anything left over. */
  parseStandaloneExpression(): Expression | null {
    try {
      const expression = this.parseExpression();
      if (this.peek().kind !== "newline" && this.peek().kind !== "eof") this.failExpected("the end of the value");
      return expression;
    } catch (error) {
      if (error instanceof ParseError) return null;
      throw error;
    }
  }
}

export interface ParseResult {
  readonly program: Program;
  /** Every problem from the lexer and the parser, in the order they appear in the file. */
  readonly diagnostics: Diagnostic[];
}

/** Parses a whole program (or site map) from its source text. */
export function parse(source: string): ParseResult {
  const lexed = lex(source);
  const parser = new Parser(lexed.tokens);
  const program = parser.parseProgram();
  const diagnostics = [...lexed.diagnostics, ...parser.diagnostics].sort(
    (a, b) => a.line - b.line || a.column - b.column,
  );
  return { program, diagnostics };
}

/** Parses source text that holds a single value, such as "10cm + 5mm". */
export function parseExpressionSource(source: string): {
  expression: Expression | null;
  diagnostics: Diagnostic[];
} {
  const lexed = lex(source);
  const parser = new Parser(lexed.tokens);
  const expression = parser.parseStandaloneExpression();
  return { expression, diagnostics: [...lexed.diagnostics, ...parser.diagnostics] };
}
