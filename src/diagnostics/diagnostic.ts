// Describes one problem found in a program (an error or a warning) and turns it into readable text.
// A problem stores only its code, position and details; the words come from a message table.

import { ENGLISH, type MessageTable } from "./messages-en.js";

/** Extra details that fill in the blanks of a message, like the unit that was misspelled. */
export type DiagnosticArgs = Readonly<Record<string, string>>;

export interface Diagnostic {
  /** Code such as "E101". The letter gives the stage; W codes are warnings (Guidebook §8). */
  readonly code: string;
  readonly severity: "error" | "warning";
  /** 1-based line and column where the problem starts. */
  readonly line: number;
  readonly column: number;
  readonly args: DiagnosticArgs;
  /** The file the problem is in, when it is not the main program (an import or a site map). */
  readonly file?: string;
}

export function makeDiagnostic(
  code: string,
  line: number,
  column: number,
  args: DiagnosticArgs = {},
): Diagnostic {
  const severity = code.startsWith("W") ? "warning" : "error";
  return { code, severity, line, column, args };
}

/** The same diagnostic, marked as coming from another file. */
export function inFile(diagnostic: Diagnostic, file: string): Diagnostic {
  return { ...diagnostic, file };
}

/** The message and the suggested fix for a diagnostic, in the language of the table. */
export function explain(
  diagnostic: Diagnostic,
  table: MessageTable = ENGLISH,
): { message: string; fix: string } {
  const entry = table.messages[diagnostic.code];
  if (entry === undefined) {
    return { message: `unknown problem ${diagnostic.code}`, fix: "" };
  }
  return { message: entry.message(diagnostic.args), fix: entry.fix(diagnostic.args) };
}

/**
 * Formats a diagnostic the way Guidebook §8 shows it:
 *   E101 (line 4): expected ':' after the 'if' condition
 *     Fix: Add ':' at the end of the line.
 * A problem in another file names it: E209 (site.uritp, line 3): ...
 */
export function formatDiagnostic(diagnostic: Diagnostic, table: MessageTable = ENGLISH): string {
  const { message, fix } = explain(diagnostic, table);
  const line = `${table.lineLabel} ${diagnostic.line}`;
  const where = diagnostic.file === undefined ? line : `${diagnostic.file}, ${line}`;
  const first = `${diagnostic.code} (${where}): ${message}`;
  return fix === "" ? first : `${first}\n  ${table.fixLabel}: ${fix}`;
}
