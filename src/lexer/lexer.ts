// Turns a whole program into tokens, including the invisible NEWLINE, INDENT and DEDENT markers.
// It follows the indentation rules of spec/GRAMMAR.md section 1.3: 4 spaces per level, no tabs.

import { makeDiagnostic, type Diagnostic } from "../diagnostics/diagnostic.js";
import { tokenizeLine } from "./line.js";
import type { PlainToken, Token } from "./tokens.js";

export interface LexResult {
  readonly tokens: Token[];
  readonly diagnostics: Diagnostic[];
}

export function lex(source: string): LexResult {
  const diagnostics: Diagnostic[] = [];
  const tokens: Token[] = [];
  const text = source.startsWith("﻿") ? source.slice(1) : source; // skip a byte-order mark
  const lines = text.split(/\r?\n/);

  /** Depths of the blocks that are open right now; the whole file is depth 0. */
  const blocks: number[] = [0];
  /** Indentation of the first line of the statement being read, or null before the first one. */
  let statementIndent: number | null = null;
  /** Whether the last line we read ended with ':' and so opens a block. */
  let opensBlock = false;
  /** Indentation of the last line we read; a block must be 4 spaces deeper than its ':' line. */
  let lastIndent = 0;
  /** Where the last line we read ended, for placing NEWLINE tokens. */
  let lastLine = 1;
  let lastColumn = 1;

  const marker = (kind: PlainToken["kind"], line: number, column: number): void => {
    tokens.push({ kind, text: "", line, column });
  };
  const error = (code: string, line: number, column: number, args: Record<string, string> = {}): void => {
    diagnostics.push(makeDiagnostic(code, line, column, args));
  };
  const top = (): number => blocks[blocks.length - 1] ?? 0;

  /** Closes blocks until we are back at `indent`, producing one DEDENT per block. */
  const dedentTo = (indent: number, line: number): void => {
    while (blocks.length > 1 && top() > indent) {
      blocks.pop();
      marker("dedent", line, indent + 1);
    }
    if (top() !== indent) error("E106", line, indent + 1);
  };

  lines.forEach((raw, index) => {
    const lineNumber = index + 1;

    // Measure the indentation. A tab counts as 4 so we can carry on after reporting it.
    let start = 0;
    let indent = 0;
    let tabColumn = 0;
    while (raw[start] === " " || raw[start] === "\t") {
      if (raw[start] === "\t" && tabColumn === 0) tabColumn = start + 1;
      indent += raw[start] === "\t" ? 4 : 1;
      start++;
    }

    const lineTokens = tokenizeLine(raw, lineNumber, start, diagnostics);
    if (lineTokens.length === 0) return; // blank line or comment only: ignored entirely

    if (tabColumn > 0) {
      error("E102", lineNumber, tabColumn);
    } else if (indent % 4 !== 0) {
      error("E103", lineNumber, 1, { spaces: String(indent) });
    }
    indent -= indent % 4;

    const last = lineTokens[lineTokens.length - 1];
    const endsWithColon = last?.kind === "symbol" && last.text === ":";

    if (opensBlock) {
      // The line above ended with ':', so this line should start a block 4 spaces deeper.
      marker("newline", lastLine, lastColumn);
      if (indent > top()) {
        // Normally the ':' line is at the top depth. After an E107 it is a continuation line,
        // so a block 4 spaces deeper than that line is accepted too, to avoid a second error.
        if (indent !== top() + 4 && indent !== lastIndent + 4) error("E105", lineNumber, 1);
        blocks.push(indent);
        marker("indent", lineNumber, indent + 1);
      } else {
        dedentTo(indent, lineNumber); // no block at all: the parser reports E104
      }
      statementIndent = indent;
    } else if (statementIndent !== null && indent > statementIndent) {
      // Deeper than the statement above but not after ':': a continuation line.
      if (indent !== statementIndent + 4) error("E105", lineNumber, 1);
      if (endsWithColon) error("E107", lineNumber, (last?.column ?? 1));
    } else {
      // A new statement at the same depth or further out.
      if (statementIndent !== null) marker("newline", lastLine, lastColumn);
      if (indent > top()) {
        error("E105", lineNumber, 1); // e.g. the very first line is indented
      } else if (indent < top()) {
        dedentTo(indent, lineNumber);
      }
      statementIndent = indent;
    }

    tokens.push(...lineTokens);
    opensBlock = endsWithColon;
    lastIndent = indent;
    lastLine = lineNumber;
    lastColumn = raw.length + 1;
  });

  // End of file: finish the last statement and close every open block.
  if (statementIndent !== null) marker("newline", lastLine, lastColumn);
  while (blocks.length > 1) {
    blocks.pop();
    marker("dedent", lastLine, lastColumn);
  }
  marker("eof", lastLine, lastColumn);
  return { tokens, diagnostics };
}
