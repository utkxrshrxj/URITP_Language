// Checks that every example program and site map in examples/ parses with no errors.
// This keeps the examples in step with the grammar as the language grows.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatDiagnostic } from "../src/diagnostics/diagnostic.js";
import { parse } from "../src/parser/parser.js";

const examplesDir = fileURLToPath(new URL("../examples", import.meta.url));
const files = readdirSync(examplesDir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".uritp"))
  .sort();

describe("examples", () => {
  it("has the six example programs and their site maps", () => {
    expect(files.filter((f) => !f.endsWith("site.uritp"))).toHaveLength(6);
    expect(files.filter((f) => f.endsWith("site.uritp"))).toHaveLength(5);
  });

  it.each(files)("%s parses with no errors", (file) => {
    const { program, diagnostics } = parse(readFileSync(join(examplesDir, file), "utf8"));
    expect(diagnostics.map((d) => formatDiagnostic(d))).toEqual([]);
    expect(program.statements.length).toBeGreaterThan(0);
  });

  it("site maps hold only define lines", () => {
    for (const file of files.filter((f) => f.endsWith("site.uritp"))) {
      const { program } = parse(readFileSync(join(examplesDir, file), "utf8"));
      expect(program.statements.every((s) => s.kind === "Define")).toBe(true);
    }
  });
});
