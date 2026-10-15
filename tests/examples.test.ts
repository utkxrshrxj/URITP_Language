// Checks that every example program and site map in examples/ parses and passes the checker.
// This keeps the examples in step with the language as it grows.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { check } from "../src/checker/checker.js";
import { formatDiagnostic } from "../src/diagnostics/diagnostic.js";
import { parse } from "../src/parser/parser.js";
import { WITH_TEST_ROBOTS } from "./checker/models.js";

const examplesDir = fileURLToPath(new URL("../examples", import.meta.url));
const files = readdirSync(examplesDir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".uritp"))
  .sort();

describe("examples", () => {
  it("has the six Guidebook example programs and their site maps", () => {
    const guidebook = files.filter((f) => /^\d\d-/.test(f));
    expect(guidebook.filter((f) => !f.endsWith("site.uritp"))).toHaveLength(6);
    expect(guidebook.filter((f) => f.endsWith("site.uritp"))).toHaveLength(5);
  });

  it("has a ready-to-run program for each kind of robot", () => {
    expect(files.filter((f) => f.startsWith("try-") && !f.endsWith("site.uritp"))).toHaveLength(3);
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

  const programs = files.filter((f) => !f.endsWith("site.uritp"));

  it.each(programs)("%s passes the name, type and unit checks", (file) => {
    const { program } = parse(readFileSync(join(examplesDir, file), "utf8"));
    const sitePath = join(examplesDir, dirname(file), "site.uritp");
    const siteMaps = existsSync(sitePath) ? [{ name: "site.uritp", source: readFileSync(sitePath, "utf8") }] : [];
    const { diagnostics } = check(program, { ...WITH_TEST_ROBOTS, siteMaps });
    expect(diagnostics.map((d) => formatDiagnostic(d))).toEqual([]);
  });
});
