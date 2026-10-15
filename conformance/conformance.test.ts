// Runs the URITP conformance test set (Guidebook §9.3) against every driver in drivers/, found by
// folder so no company is named here, and checks the set really catches a careless driver.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import type { Instruction } from "../src/codegen/instruction.js";
import type { TaskUpdate } from "../src/runtime/robot-port.js";
import { RecordingTransport, type Driver } from "../drivers/shared/driver.js";
import type { CreateDriver } from "../drivers/shared/plain-driver.js";
import { formatResults, runConformance } from "./suite.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const driverFolders = readdirSync(join(root, "drivers"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "shared")
  .map((entry) => entry.name)
  .sort();

/** The manifest that sits in manifests/<folder>/ next to each driver. */
function manifestFor(folder: string): string {
  const dir = join(root, "manifests", folder);
  const file = readdirSync(dir).find((f) => f.endsWith(".uritp"));
  if (file === undefined) throw new Error(`no manifest in manifests/${folder}`);
  return readFileSync(join(dir, file), "utf8");
}

async function createDriverIn(folder: string): Promise<CreateDriver> {
  const module = (await import(pathToFileURL(join(root, "drivers", folder, "index.ts")).href)) as { createDriver: CreateDriver };
  return module.createDriver;
}

describe("conformance (§9.3)", () => {
  it("finds the three company drivers", () => {
    expect(driverFolders).toHaveLength(3);
  });

  it.each(driverFolders)("drivers/%s passes all ten rules", async (folder) => {
    const results = await runConformance({ name: folder, manifest: manifestFor(folder), createDriver: await createDriverIn(folder) });
    expect(results.map((r) => r.rule)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(formatResults(folder, results)).not.toContain("FAIL");
  });
});

describe("the conformance set catches a careless driver", () => {
  /** A driver that says "succeeded" to everything at once and ignores STOP and its limits. */
  const careless: CreateDriver = (options) => {
    const driver: Driver = {
      info: { mode: "simulator", model: options.model, stoppingTime: 0.5, repeatability: 0.001, zones: {} },
      transport: new RecordingTransport(),
      run: async (_instr: Instruction, update: (u: TaskUpdate) => void) => {
        update({ state: "succeeded" });
      },
      stop: async () => {},
    };
    return driver;
  };

  it("fails it on the lifecycle, refusals, stop, safety, units and native code", async () => {
    const results = await runConformance({ name: "careless", manifest: manifestFor(driverFolders[0] ?? ""), createDriver: careless });
    const failed = results.filter((r) => !r.passed).map((r) => r.rule);
    expect(failed).toEqual(expect.arrayContaining([3, 4, 5, 6, 7, 9, 10]));
    expect(formatResults("careless", results)).toContain("FAIL  rule 3: Task lifecycle");
  });
});
