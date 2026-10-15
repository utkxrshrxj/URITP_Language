#!/usr/bin/env node
// The uritp program itself: reads real files, finds company drivers in drivers/<folder>/, stops
// the robots on Ctrl+C, and exits with the command's exit code. Everything else is in cli.ts.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CreateDriver } from "../../drivers/shared/plain-driver.js";
import { parseArgs } from "./args.js";
import { runCli } from "./cli.js";

/** dist/drivers/, next to dist/src/ where this file is built. */
const driversDir = new URL("../../drivers/", import.meta.url);

async function loadDriver(folder: string): Promise<CreateDriver | null> {
  const entry = new URL(`${folder}/index.js`, driversDir);
  if (!existsSync(fileURLToPath(entry))) return null;
  const module = (await import(pathToFileURL(fileURLToPath(entry)).href)) as { createDriver?: CreateDriver };
  return module.createDriver ?? null;
}

const code = await runCli(parseArgs(process.argv.slice(2)), {
  print: (text) => console.log(text),
  readFile: (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  },
  loadDriver,
  onRunStart: (runner) => {
    // Ctrl+C is an emergency stop: every robot stops and the program is cancelled.
    process.once("SIGINT", () => void runner.stop("emergency stop (Ctrl+C)"));
  },
});
process.exitCode = code;
