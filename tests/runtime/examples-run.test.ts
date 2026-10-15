// Runs all six example programs end to end with fake robots, and checks the instructions each
// robot receives, so the examples stay runnable as well as correct.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { motions, reading, type Response } from "./fake-robot.js";
import { run } from "./run-helpers.js";

/** Reads an example program and, if it has one, the site map next to it. */
function example(folder: string): { source: string; site?: string } {
  const dir = fileURLToPath(new URL(`../../examples/${folder}/`, import.meta.url));
  const source = readFileSync(`${dir}${programFile[folder]}`, "utf8");
  const sitePath = `${dir}site.uritp`;
  return existsSync(sitePath) ? { source, site: readFileSync(sitePath, "utf8") } : { source };
}

const programFile: Record<string, string> = {
  "01-pick-and-place": "pick_and_place.uritp",
  "02-office-delivery-rover": "delivery.uritp",
  "03-roof-inspection-drone": "inspection.uritp",
  "04-night-patrol-quadruped": "patrol.uritp",
  "05-kitchen-humanoid": "tea.uritp",
  "06-welding-arm-extension": "welding.uritp",
};
const ok = (): Response => ({});

describe("example programs run", () => {
  it("i: pick and place", async () => {
    const { source } = example("01-pick-and-place");
    const { result, robots } = await run(source, { robots: { arm: ok } });
    expect(result.state).toBe("succeeded");
    expect(robots["arm"]!.sent).toHaveLength(4);
  });

  it("ii: office delivery, waiting for the tray", async () => {
    const { source, site } = example("02-office-delivery-rover");
    let loaded = false;
    const rover = (line: string): Response => {
      if (line === "SENSE sensor=tray.loaded") {
        loaded = !loaded; // loaded on the first check, emptied on the next
        return reading(loaded);
      }
      return {};
    };
    const { result, robots } = await run(source, { robots: { rover }, ...(site === undefined ? {} : { site }) });
    expect(result.state).toBe("succeeded");
    expect(motions(robots["rover"]!)).toEqual([
      "MOVE frame=base target=pose(2,1,0,0,0,0)",
      'SAY text="Please place the parcel on my tray"',
      "MOVE frame=base target=pose(18,7.5,0,0,0,1.57079632679) speed=0.8",
      'SAY text="Parcel for you"',
      "MOVE frame=base target=pose(0.5,0.5,0,0,0,0)",
    ]);
  });

  it("iii: roof inspection", async () => {
    const { source, site } = example("03-roof-inspection-drone");
    const { result } = await run(source, { robots: { drone: (line) => (line === "SENSE sensor=battery" ? reading(0.9) : {}) }, ...(site === undefined ? {} : { site }) });
    expect(result.state).toBe("succeeded");
  });

  it("iv: night patrol for 30 minutes, with a hot spot", async () => {
    const { source, site } = example("04-night-patrol-quadruped");
    const dog = (line: string): Response =>
      line === 'SENSE sensor=thermal' ? { output: { kind: "reading", value: 40, max: 95 } } : { duration: line.startsWith("MOVE") ? 120 : 0 };
    const { result, alerts } = await run(source, { robots: { dog }, ...(site === undefined ? {} : { site }) });
    expect(result.state).toBe("succeeded");
    expect(alerts[0]).toBe("Hot spot at press_line");
  });

  it("v: tea in the kitchen", async () => {
    const { source, site } = example("05-kitchen-humanoid");
    const { result, robots } = await run(source, { robots: { helper: ok }, ...(site === undefined ? {} : { site }) });
    expect(result.state).toBe("succeeded");
    expect(robots["helper"]!.sent).toContain("SKILL name=pour from=kettle into=mug until=mug.fill>=0.8");
  });

  it("vi: welding with the vendor extension", async () => {
    const { source, site } = example("06-welding-arm-extension");
    const { result, robots } = await run(source, { robots: { welder: ok }, ...(site === undefined ? {} : { site }) });
    expect(result.state).toBe("succeeded");
    expect(robots["welder"]!.sent[1]).toMatch(/^EXT name=examplecorp.adaptive_weld seam=\[/);
  });
});
