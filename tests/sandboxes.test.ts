// Checks every program in sandboxes/ with this URITP's checker, against the playground robots'
// manifests in sandboxes/robots/, so the programs stay valid here as the language changes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args.js";
import { runCli } from "../src/cli/cli.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const WORLDS = ["kitchen", "town", "warehouse", "farm", "factory"];
const programs = WORLDS.flatMap((world) =>
  readdirSync(join(root, "sandboxes", world))
    .filter((f) => /^\d\d-.*\.uritp$/.test(f))
    .map((f) => `sandboxes/${world}/${f}`),
);

/** Runs `uritp check` on a program, with the manifest of each playground robot it connects to. */
async function check(path: string): Promise<string> {
  const source = readFileSync(join(root, path), "utf8");
  const robots = [...source.matchAll(/connect\("play:([a-z]+)"\)/g)].flatMap((m) => ["--robot", `sandboxes/robots/play_${m[1]}.uritp`]);
  const printed: string[] = [];
  await runCli(parseArgs(["check", path, ...robots]), {
    print: (text) => printed.push(text),
    readFile: (file) => {
      try {
        return readFileSync(join(root, file), "utf8");
      } catch {
        return null;
      }
    },
    loadDriver: async () => null,
  });
  return printed.join("\n");
}

describe("sandboxes", () => {
  it.each(WORLDS)("has at least ten programs for the %s", (world) => {
    expect(programs.filter((p) => p.startsWith(`sandboxes/${world}/`)).length).toBeGreaterThanOrEqual(10);
  });

  it.each(programs)("%s passes the checker", async (path) => {
    expect(await check(path)).toBe("No problems found.");
  });

  it.each(programs)("%s starts with a comment, its world and its robots", (path) => {
    const [comment, ...rest] = readFileSync(join(root, path), "utf8").split("\n");
    expect(comment).toMatch(/^# \S/);
    const world = path.split("/")[1];
    expect(rest.find((l) => !l.startsWith("#"))).toBe(`import "${world}.uritp"`);
  });
});
