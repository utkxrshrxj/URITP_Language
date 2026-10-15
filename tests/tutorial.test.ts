// Keeps docs/TUTORIAL.md honest: every program it shows must match its file in docs/tutorial/, and
// every uritp command it shows is run, with its output compared to the output the tutorial prints.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli/args.js";
import { runCli } from "../src/cli/cli.js";
import { realClock } from "../src/runtime/clock.js";
import type { CreateDriver } from "../drivers/shared/plain-driver.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const tutorial = readFileSync(join(root, "docs", "TUTORIAL.md"), "utf8");

/** One fenced block of the tutorial, with the file it says it shows, if any. */
interface Block {
  readonly lang: string;
  readonly text: string;
  readonly file: string | null;
  readonly line: number;
}

/** The fenced blocks of a Markdown text. A block right after "<!-- file: PATH -->" shows that file. */
function blocksOf(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let file: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const marker = /^<!-- file: (\S+) -->$/.exec(line);
    if (marker !== null) {
      file = marker[1] as string;
      continue;
    }
    const fence = /^```(\w*)$/.exec(line);
    if (fence === null) {
      if (line.trim() !== "") file = null;
      continue;
    }
    const start = i;
    const body: string[] = [];
    for (i++; i < lines.length && lines[i] !== "```"; i++) body.push(lines[i] as string);
    blocks.push({ lang: fence[1] as string, text: body.join("\n"), file, line: start + 1 });
    file = null;
  }
  return blocks;
}

const blocks = blocksOf(tutorial);
const COMMAND = "npm run uritp -- ";

/** Every uritp command, with the output shown in the text block right after it (if there is one). */
const commands = blocks.flatMap((block, index) => {
  if (block.lang !== "bash" || !block.text.startsWith(COMMAND)) return [];
  const next = blocks[index + 1];
  const output = next !== undefined && next.lang === "text" ? next.text : null;
  return [{ command: block.text, output, line: block.line }];
});

async function loadDriver(folder: string): Promise<CreateDriver | null> {
  const entry = join(root, "drivers", folder, "index.ts");
  if (!existsSync(entry)) return null;
  return ((await import(pathToFileURL(entry).href)) as { createDriver: CreateDriver }).createDriver;
}

/** Runs one command line the way the real uritp does, but with simulated time running fast. */
async function run(command: string): Promise<{ code: number; output: string }> {
  const printed: string[] = [];
  const code = await runCli(parseArgs(command.slice(COMMAND.length).split(/\s+/)), {
    print: (text) => printed.push(text),
    readFile: (path) => {
      try {
        return readFileSync(join(root, path), "utf8");
      } catch {
        return null;
      }
    },
    loadDriver,
    clock: (speed) => realClock({ speed: speed * 1000 }),
  });
  return { code, output: printed.join("\n") };
}

describe("docs/TUTORIAL.md", () => {
  const shown = blocks.filter((b) => b.file !== null);

  it.each(shown.map((b) => [b.file, b] as const))("shows %s exactly as it is", (_, block) => {
    expect(block.text + "\n").toBe(readFileSync(join(root, block.file as string), "utf8"));
  });

  it("shows every program in docs/tutorial/", () => {
    const files = readdirSync(join(root, "docs", "tutorial"), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".uritp"))
      .map((f) => `docs/tutorial/${f}`);
    expect(files.filter((f) => !shown.some((b) => b.file === f))).toEqual([]);
  });

  it("says which file every URITP program it shows comes from", () => {
    expect(blocks.filter((b) => b.lang === "uritp" && b.file === null).map((b) => b.line)).toEqual([]);
  });

  it("writes each uritp command alone in its block", () => {
    for (const block of blocks.filter((b) => b.lang === "bash" && b.text.includes(COMMAND))) {
      expect(block.text.split("\n")).toHaveLength(1);
    }
  });

  it.each(commands.map((c) => [c.line, c] as const))("the command on line %i prints what the tutorial says", async (_, c) => {
    const { code, output } = await run(c.command);
    if (c.output === null) expect(code).toBe(0);
    else expect(output).toBe(c.output);
  });
});
