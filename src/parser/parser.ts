// Reads the tokens of a program and builds its syntax tree, following spec/GRAMMAR.md.
// It is a hand-written "recursive descent" parser: one method per grammar rule.

import { makeDiagnostic, type Diagnostic, type DiagnosticArgs } from "../diagnostics/diagnostic.js";
import { lex } from "../lexer/lexer.js";
import { describeToken, type Token } from "../lexer/tokens.js";
import type { Argument, BinaryOperator, Expression, TextLiteral } from "./ast.js";

/** Thrown to give up on the current statement after an error has been recorded. */
class ParseError extends Error {}

const COMPARISON_OPERATORS = ["==", "!=", "<", "<=", ">", ">="];

export class Parser {
  private position = 0;
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
