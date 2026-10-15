// Checks every manifest file in manifests/: it must be a valid manifest, start with a
// "Company:" line, and say that its values are illustrative (no company is named here).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../src/checker/manifest.js";
import { formatDiagnostic } from "../src/diagnostics/diagnostic.js";

const manifestsDir = fileURLToPath(new URL("../manifests", import.meta.url));
let files: string[] = [];
try {
  files = readdirSync(manifestsDir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".uritp")).sort();
} catch {
  files = []; // no manifests folder yet
}

describe("manifest files", () => {
  it("are all valid, marked with their company, and honest about their values", () => {
    for (const file of files) {
      const source = readFileSync(join(manifestsDir, file), "utf8");
      const { diagnostics } = checkManifest(source, file);
      expect(diagnostics.map((d) => formatDiagnostic(d)), file).toEqual([]);
      expect(source.split("\n")[0], file).toMatch(/^# Company: \S/);
      expect(source, file).toContain("replace with datasheet values");
    }
  });
});
