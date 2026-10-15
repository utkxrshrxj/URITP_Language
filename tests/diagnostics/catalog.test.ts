// Keeps spec/ERRORS.md and the English message table in step:
// every code in the table is documented, and every documented E1xx code has a message.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENGLISH } from "../../src/diagnostics/messages-en.js";

const catalog = readFileSync(fileURLToPath(new URL("../../spec/ERRORS.md", import.meta.url)), "utf8");
/** Codes that start a table row in ERRORS.md, like "| E101 |". */
const documented = [...catalog.matchAll(/^\| ([EWR]\d{3}) \|/gm)].map((m) => m[1] as string);
const implemented = Object.keys(ENGLISH.messages);

describe("error catalog", () => {
  it("documents every code that has a message", () => {
    expect(implemented.filter((code) => !documented.includes(code))).toEqual([]);
  });

  it("has a message for every documented syntax code", () => {
    const syntax = documented.filter((code) => code.startsWith("E1"));
    expect(syntax.filter((code) => !implemented.includes(code))).toEqual([]);
  });

  it("lists each code once", () => {
    expect(new Set(documented).size).toBe(documented.length);
  });
});
