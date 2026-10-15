// Cuts one line of a program into tokens: names, keywords, numbers, units, percents and symbols.
// Indentation is handled separately (in lexer.ts); this file only looks at a single line.

import { makeDiagnostic, type Diagnostic } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import { isUnit, UNIT_MISSPELLINGS, UNIT_NAMES } from "../stdlib/units.js";
import { isKeyword } from "./keywords.js";
import type { Token } from "./tokens.js";

const TWO_CHAR_SYMBOLS = ["==", "!=", "<=", ">="];
const ONE_CHAR_SYMBOLS = "()[],:.=+-<>";

/** Extra advice for characters people often type by habit from other languages. */
const CHARACTER_ADVICE: Readonly<Record<string, string>> = {
  ";": "Statements end at the end of the line, so ';' is not needed.",
  "'": 'Text is written in double quotes, like "hello".',
  "*": "URITP has no '*' operator.",
  "/": "URITP has no '/' operator. A unit like m/s is written right after its number, like 0.5m/s.",
  "&": "Write 'and' instead.",
  "|": "Write 'or' instead.",
  "!": "Write 'not' instead, or '!=' for 'is not equal to'.",
};

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= "0" && c <= "9";
const isLetter = (c: string | undefined): boolean =>
  c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_");
const isNamePart = (c: string | undefined): boolean => isLetter(c) || isDigit(c);
const isNonAscii = (c: string | undefined): boolean => c !== undefined && c.charCodeAt(0) > 127;

/** Picks the unit to suggest for a misspelled one, or "" if none is close. */
function suggestUnit(unit: string): string {
  const known = UNIT_MISSPELLINGS[unit] ?? UNIT_MISSPELLINGS[unit.toLowerCase()];
  if (known !== undefined) return known;
  const sameButCase = UNIT_NAMES.find((u) => u.toLowerCase() === unit.toLowerCase());
  if (sameButCase !== undefined) return sameButCase;
  return closestMatch(unit, UNIT_NAMES) ?? "";
}

/**
 * Tokenizes the part of `line` that starts at index `start` (just after the indentation).
 * Problems are added to `diagnostics`; the lexer always carries on so it can report more than one.
 */
export function tokenizeLine(
  line: string,
  lineNumber: number,
  start: number,
  diagnostics: Diagnostic[],
): Token[] {
  const tokens: Token[] = [];
  let i = start;

  const error = (code: string, index: number, args: Record<string, string> = {}): void => {
    diagnostics.push(makeDiagnostic(code, lineNumber, index + 1, args));
  };

  /** Reads a unit (letters and _, plus an optional /letters) starting at index `from`. */
  const readUnit = (from: number): string => {
    let j = from;
    while (isLetter(line[j])) j++;
    if (line[j] === "/" && isLetter(line[j + 1])) {
      j++;
      while (isLetter(line[j])) j++;
    }
    return line.slice(from, j);
  };

  const readNumber = (): void => {
    const begin = i;
    while (isDigit(line[i])) i++;
    if (line[i] === "." && isDigit(line[i + 1])) {
      i++;
      while (isDigit(line[i])) i++;
    } else if (line[i] === ".") {
      // "5." with nothing after the point is not a number (DECISIONS.md B3).
      error("E116", begin, { number: line.slice(begin, i + 1) });
      i++;
    }
    const raw = line.slice(begin, i).replace(/\.$/, "");
    const value = Number(raw);
    const column = begin + 1;

    // A unit glued to the number: 10cm, 0.2m/s.
    if (isLetter(line[i])) {
      const unitStart = i;
      const unit = readUnit(i);
      if (isUnit(unit)) {
        i += unit.length;
        tokens.push({ kind: "quantity", text: raw + unit, value, unit, line: lineNumber, column });
        return;
      }
      if (isKeyword(unit)) {
        // "3times": the number is fine, only the space is missing.
        error("E110", unitStart, { unit, number: raw, keyword: unit });
        tokens.push({ kind: "number", text: raw, value, line: lineNumber, column });
        return; // the keyword itself is read as the next token
      }
      error("E110", unitStart, { unit, number: raw, suggestion: suggestUnit(unit) });
      i += unit.length;
      tokens.push({ kind: "number", text: raw, value, line: lineNumber, column });
      return;
    }

    // A percent glued to the number: 25%.
    if (line[i] === "%") {
      i++;
      tokens.push({ kind: "percent", text: `${raw}%`, value, line: lineNumber, column });
      return;
    }

    // "10 cm" or "25 %": a unit after a space (DECISIONS.md B4).
    let k = i;
    while (line[k] === " ") k++;
    if (k > i && line[k] === "%") {
      error("E111", k, { number: raw, unit: "%" });
      i = k + 1;
      tokens.push({ kind: "percent", text: `${raw}%`, value, line: lineNumber, column });
      return;
    }
    if (k > i && isLetter(line[k])) {
      const unit = readUnit(k);
      const after = line[k + unit.length];
      const usedAsName = isNamePart(after) || after === "(" || after === "." || after === "=";
      if (isUnit(unit) && !usedAsName) {
        error("E111", k, { number: raw, unit });
        i = k + unit.length;
        tokens.push({ kind: "quantity", text: raw + unit, value, unit, line: lineNumber, column });
        return;
      }
    }
    tokens.push({ kind: "number", text: raw, value, line: lineNumber, column });
  };

  while (i < line.length) {
    const c = line[i] as string;

    if (c === " ") {
      i++;
    } else if (c === "\t") {
      error("E102", i);
      i++;
    } else if (c === "#") {
      break; // a comment runs to the end of the line
    } else if (isDigit(c)) {
      readNumber();
    } else if (c === "." && isDigit(line[i + 1]) && !followsValue(tokens)) {
      // ".5" is not a number; it should be written 0.5.
      const begin = i;
      i++;
      while (isDigit(line[i])) i++;
      const raw = line.slice(begin, i);
      error("E116", begin, { number: raw });
      tokens.push({ kind: "number", text: raw, value: Number(raw), line: lineNumber, column: begin + 1 });
    } else if (isLetter(c)) {
      const begin = i;
      while (isNamePart(line[i])) i++;
      const word = line.slice(begin, i);
      const kind = isKeyword(word) ? "keyword" : "name";
      tokens.push({ kind, text: word, line: lineNumber, column: begin + 1 });
    } else if (isNonAscii(c)) {
      // Names use ASCII letters only (DECISIONS.md B1); read the whole run as one problem.
      const begin = i;
      while (isNonAscii(line[i])) i++;
      error("E115", begin, {
        char: line.slice(begin, i),
        fix: "Names use the letters a-z, A-Z, digits and _ only. Any language can be used inside text and comments.",
      });
    } else if (TWO_CHAR_SYMBOLS.includes(line.slice(i, i + 2))) {
      tokens.push({ kind: "symbol", text: line.slice(i, i + 2), line: lineNumber, column: i + 1 });
      i += 2;
    } else if (ONE_CHAR_SYMBOLS.includes(c)) {
      tokens.push({ kind: "symbol", text: c, line: lineNumber, column: i + 1 });
      i++;
    } else {
      error("E115", i, { char: c, fix: CHARACTER_ADVICE[c] ?? "" });
      i++;
    }
  }
  return tokens;
}

/** True if the last token is something a "." can follow, like a name or a closing bracket. */
function followsValue(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1];
  if (last === undefined) return false;
  return last.kind === "name" || (last.kind === "symbol" && (last.text === ")" || last.text === "]"));
}
