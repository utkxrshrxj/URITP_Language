// Test helpers for parsing whole programs: join lines, list error codes, and require a clean parse.
import { expect } from "vitest";
import type { Program } from "../../src/parser/ast.js";
import { parse } from "../../src/parser/parser.js";

/** Joins lines with \n so programs in tests are easy to read. */
export const lines = (...source: string[]): string => source.join("\n");

/** Parses and fails the test if there is any error. */
export function parseClean(source: string): Program {
  const { program, diagnostics } = parse(source);
  expect(diagnostics).toEqual([]);
  return program;
}

/** The codes of all problems found, in order. */
export function codes(source: string): string[] {
  return parse(source).diagnostics.map((d) => d.code);
}

/** The kind of each top-level statement, like ["Robot", "Task", "CallStatement"]. */
export function kinds(program: Program): string[] {
  return program.statements.map((s) => s.kind);
}
