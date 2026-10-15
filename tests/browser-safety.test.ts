// Keeps the compiler core, the drivers and the conformance set free of Node-only code, so they can
// run in a browser. Only the command line (src/cli) may use Node.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));

/** Every TypeScript file under a folder, except tests and the command line. */
function sourceFiles(folder: string): string[] {
  return readdirSync(join(root, folder), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(folder, f))
    .filter((f) => !f.startsWith(join("src", "cli")));
}

/** Things that exist in Node but not in a browser. */
const NODE_ONLY = [
  { name: "process", pattern: /\bprocess\s*\./ },
  { name: "Buffer", pattern: /\bBuffer\s*\./ },
  { name: "require()", pattern: /\brequire\s*\(/ },
  { name: "__dirname or __filename", pattern: /\b__(dirname|filename)\b/ },
  { name: "a node: import", pattern: /from\s+["']node:/ },
  { name: "a Node built-in import", pattern: /from\s+["'](fs|path|os|child_process|net|http|url)["']/ },
];

describe("browser safety", () => {
  const files = ["src", "drivers", "conformance"].flatMap(sourceFiles);

  it("finds the files to check", () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.startsWith(join("src", "cli")))).toBe(false);
  });

  it.each(files)("%s uses nothing that only exists in Node", (file) => {
    const text = readFileSync(join(root, file), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");
    for (const { name, pattern } of NODE_ONLY) expect(pattern.test(text), `${file} uses ${name}`).toBe(false);
  });
});
