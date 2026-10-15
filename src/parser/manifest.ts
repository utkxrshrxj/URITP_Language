// Reads a robot manifest file (Guidebook §9.1, spec/GRAMMAR.md section 3.2) into a tree.
// It only checks how the manifest is written; src/checker/manifest.ts checks what it means.

import type { Diagnostic } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import { lex } from "../lexer/lexer.js";
import type { Expression, NumberLiteral, Position, QuantityLiteral } from "./ast.js";
import { ParseError, Parser } from "./parser.js";

/** A value in a manifest. A bare number is kept so the checker can suggest a unit. */
export type ManifestValue = QuantityLiteral | NumberLiteral;

export interface NamedValue extends Position {
  readonly name: string;
  readonly value: ManifestValue;
}

export interface NameAt extends Position {
  readonly name: string;
}

export type ManifestEntry =
  | ({ readonly kind: "uritp"; readonly version: string } & Position)
  | ({ readonly kind: "frame"; readonly name: string; readonly frameType: NameAt; readonly options: readonly NamedValue[] } & Position)
  | ({ readonly kind: "actuator"; readonly name: string; readonly states: readonly string[]; readonly maxForce: ManifestValue | null } & Position)
  | ({ readonly kind: "sensor"; readonly name: string; readonly sensorKind: string; readonly dimension: NameAt | null } & Position)
  | ({ readonly kind: "profiles"; readonly profiles: readonly NameAt[] } & Position)
  | ({ readonly kind: "extension"; readonly vendor: string; readonly feature: string; readonly params: readonly (NameAt & { readonly type: string })[] } & Position)
  | ({ readonly kind: "safety_max_speed"; readonly value: ManifestValue } & Position)
  | ({ readonly kind: "safety_forbidden_zone"; readonly zone: Expression } & Position);

export interface Manifest extends Position {
  /** The robot model's name, from manifest "NAME". */
  readonly name: string;
  readonly entries: readonly ManifestEntry[];
}

const ENTRY_WORDS = ["uritp", "frame", "actuator", "sensor", "profiles", "extension", "safety"];
const FRAME_OPTIONS = ["reach", "max_speed", "payload"];

class ManifestParser extends Parser {
  parseManifest(): Manifest | null {
    const start = this.peek();
    let name = "";
    try {
      if (start.text !== "manifest") this.failExpected("'manifest'", 'manifest "ROBOT NAME":');
      this.advance();
      const text = this.expectText("the robot model's name in double quotes", 'manifest "ROBOT NAME":');
      this.requireConstantText(text, "manifest name");
      name = text.parts.map((p) => (p.kind === "literal" ? p.text : "")).join("");
      if (!this.isSymbol(":")) this.fail("E101", this.peek(), { after: "the manifest name" });
      this.advance();
      if (this.peek().kind !== "newline") this.failExpected("the end of the line after ':'");
      this.advance();
      if (this.peek().kind !== "indent") this.fail("E104", this.peek());
      this.advance();
    } catch (error) {
      if (error instanceof ParseError) return null;
      throw error;
    }

    const entries: ManifestEntry[] = [];
    while (this.peek().kind !== "dedent" && this.peek().kind !== "eof") {
      try {
        entries.push(this.parseEntry());
      } catch (error) {
        if (!(error instanceof ParseError)) throw error;
        this.synchronize();
      }
    }
    if (this.peek().kind === "dedent") this.advance();
    if (this.peek().kind !== "eof") {
      this.report("E120", this.peek(), {
        expected: "the end of the file",
        found: `'${this.peek().text}'`,
        fix: "A manifest file holds one manifest block and nothing after it.",
      });
    }
    return { name, entries, line: start.line, column: start.column };
  }

  private parseEntry(): ManifestEntry {
    const start = this.peek();
    const at = { line: start.line, column: start.column };
    const word = start.kind === "name" || start.kind === "keyword" ? start.text : "";
    if (!ENTRY_WORDS.includes(word)) {
      this.fail("E132", start, { word: start.text, suggestion: closestMatch(start.text, ENTRY_WORDS) ?? "" });
    }
    this.advance();
    let entry: ManifestEntry;
    switch (word) {
      case "uritp": {
        const version = this.peek();
        if (version.kind !== "number") this.failExpected("a version number like 0.1", "uritp VERSION");
        this.advance();
        entry = { kind: "uritp", version: version.text, ...at };
        break;
      }
      case "frame":
        entry = this.parseFrame(at);
        break;
      case "actuator":
        entry = this.parseActuator(at);
        break;
      case "sensor":
        entry = this.parseSensor(at);
        break;
      case "profiles":
        entry = { kind: "profiles", profiles: this.parseNameList("profiles [LIST]"), ...at };
        break;
      case "extension":
        entry = this.parseExtension(at);
        break;
      default:
        entry = this.parseSafetyEntry(at);
        break;
    }
    this.endStatement(formOf(word));
    return entry;
  }

  private parseFrame(at: Position): ManifestEntry {
    const form = "frame NAME: TYPE [reach Q] [max_speed Q] [payload Q]";
    const name = this.expectName("a frame name", form);
    this.expectSymbol(":", form);
    const type = this.expectWord("a frame type: pose2d, pose3d or pose6d", form);
    const options: NamedValue[] = [];
    while (this.peek().kind === "name" && FRAME_OPTIONS.includes(this.peek().text)) {
      const option = this.advance();
      if (options.some((o) => o.name === option.text)) this.report("E124", option, { clause: option.text });
      options.push({ name: option.text, value: this.expectManifestValue(form), line: option.line, column: option.column });
    }
    return { kind: "frame", name: name.text, frameType: type, options, ...at };
  }

  private parseActuator(at: Position): ManifestEntry {
    const form = "actuator NAME: states [LIST] [max_force Q]";
    const name = this.expectName("an actuator name", form);
    this.expectSymbol(":", form);
    if (this.peek().text !== "states") this.failExpected("'states'", form);
    this.advance();
    const states = this.parseNameList(form).map((s) => s.name);
    let maxForce: ManifestValue | null = null;
    if (this.peek().text === "max_force") {
      this.advance();
      maxForce = this.expectManifestValue(form);
    }
    return { kind: "actuator", name: name.text, states, maxForce, ...at };
  }

  private parseSensor(at: Position): ManifestEntry {
    const form = "sensor NAME: KIND [dimension D]";
    // A sensor may be named with a keyword, like force (DECISIONS.md B7).
    const name = this.expectWord("a sensor name", form);
    this.expectSymbol(":", form);
    const kind = this.expectWord("what the sensor measures, like rgb or thermal", form);
    let dimension: NameAt | null = null;
    if (this.peek().text === "dimension") {
      this.advance();
      dimension = this.expectWord("a dimension such as Length or Temperature", form);
    }
    return { kind: "sensor", name: name.name, sensorKind: kind.name, dimension, ...at };
  }

  private parseExtension(at: Position): ManifestEntry {
    const form = "extension VENDOR.NAME(PARAM: TYPE, ...)";
    const vendor = this.expectName("the vendor name", form);
    this.expectSymbol(".", form);
    const feature = this.expectName("the feature name", form);
    this.expectSymbol("(", form);
    const params: (NameAt & { type: string })[] = [];
    if (!this.isSymbol(")")) {
      do {
        const param = this.expectWord("a parameter name", form);
        this.expectSymbol(":", form);
        params.push({ ...param, type: this.parseTypeName(form) });
      } while (this.acceptSymbol(","));
    }
    this.expectSymbol(")", form);
    return { kind: "extension", vendor: vendor.text, feature: feature.text, params, ...at };
  }

  /** A type such as Route or Quantity<Current>. */
  private parseTypeName(form: string): string {
    const name = this.expectName("a type such as Route or Quantity<Current>", form);
    if (!this.acceptSymbol("<")) return name.text;
    const inner = this.parseTypeName(form);
    this.expectSymbol(">", form);
    return `${name.text}<${inner}>`;
  }

  private parseSafetyEntry(at: Position): ManifestEntry {
    const form = "safety max_speed Q / safety forbidden_zone ZONE";
    const rule = this.peek();
    if (rule.text === "max_speed") {
      this.advance();
      return { kind: "safety_max_speed", value: this.expectManifestValue(form), ...at };
    }
    if (rule.text === "forbidden_zone") {
      this.advance();
      return { kind: "safety_forbidden_zone", zone: this.parseExpression(), ...at };
    }
    return this.failExpected("'max_speed' or 'forbidden_zone'", form);
  }

  /** [a, b, c]: names that may be keywords, like the state open (B7). */
  private parseNameList(form: string): NameAt[] {
    this.expectSymbol("[", form);
    const names: NameAt[] = [];
    if (!this.isSymbol("]")) {
      do {
        names.push(this.expectWord("a name", form));
      } while (this.acceptSymbol(","));
    }
    this.expectSymbol("]", form);
    return names;
  }

  /** A name or a keyword, for places where keywords are allowed as labels. */
  private expectWord(what: string, form: string): NameAt {
    const token = this.peek();
    if (token.kind !== "name" && token.kind !== "keyword") return this.failExpected(what, form);
    this.advance();
    return { name: token.text, line: token.line, column: token.column };
  }

  /** A quantity like 1.5m/s. A bare number is accepted here and reported by the checker with a hint. */
  private expectManifestValue(form: string): ManifestValue {
    const token = this.peek();
    const at = { line: token.line, column: token.column };
    if (token.kind === "quantity") {
      this.advance();
      return { kind: "Quantity", value: token.value, unit: token.unit, raw: token.text, ...at };
    }
    if (token.kind === "number") {
      this.advance();
      return { kind: "Number", value: token.value, raw: token.text, ...at };
    }
    return this.failExpected("a quantity like 1.5m/s", form);
  }
}

function formOf(word: string): string {
  switch (word) {
    case "uritp":
      return "uritp VERSION";
    case "frame":
      return "frame NAME: TYPE [reach Q] [max_speed Q] [payload Q]";
    case "actuator":
      return "actuator NAME: states [LIST] [max_force Q]";
    case "sensor":
      return "sensor NAME: KIND [dimension D]";
    case "profiles":
      return "profiles [LIST]";
    case "extension":
      return "extension VENDOR.NAME(PARAM: TYPE, ...)";
    default:
      return "safety max_speed Q / safety forbidden_zone ZONE";
  }
}

export interface ManifestParseResult {
  /** null when the manifest is too broken to read at all. */
  readonly manifest: Manifest | null;
  readonly diagnostics: Diagnostic[];
}

export function parseManifest(source: string): ManifestParseResult {
  const lexed = lex(source);
  const parser = new ManifestParser(lexed.tokens);
  const manifest = parser.parseManifest();
  const diagnostics = [...lexed.diagnostics, ...parser.diagnostics].sort(
    (a, b) => a.line - b.line || a.column - b.column,
  );
  return { manifest, diagnostics };
}
