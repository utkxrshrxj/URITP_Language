// Test helpers for the checker: parse and check a program, then list the problems found.
// The program must parse cleanly, so a test never confuses a syntax error with a type error.
import { expect } from "vitest";
import { check, type CheckOptions } from "../../src/checker/checker.js";
import type { Diagnostic } from "../../src/diagnostics/diagnostic.js";
import { explain } from "../../src/diagnostics/diagnostic.js";
import { parse } from "../../src/parser/parser.js";

export const lines = (...source: string[]): string => source.join("\n");

export function checked(source: string, options: CheckOptions = {}): Diagnostic[] {
  const parsed = parse(source);
  expect(parsed.diagnostics).toEqual([]);
  return check(parsed.program, options).diagnostics;
}

export function codes(source: string, options: CheckOptions = {}): string[] {
  return checked(source, options).map((d) => d.code);
}

/** The first problem as "message / fix", the way a person reads it. */
export function firstMessage(source: string, options: CheckOptions = {}): string {
  const first = checked(source, options)[0];
  if (first === undefined) return "no problems";
  const { message, fix } = explain(first);
  return `${message} / ${fix}`;
}
