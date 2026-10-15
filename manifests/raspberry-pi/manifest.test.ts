// Company: Raspberry Pi
// Checks the Raspberry Pi rover manifest and that programs are accepted or rejected against it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkProgram } from "../../src/checker/check-program.js";
import { checkManifest } from "../../src/checker/manifest.js";

const manifest = { name: "pi-rover.uritp", source: readFileSync(new URL("pi-rover.uritp", import.meta.url), "utf8") };
const lines = (...source: string[]): string => source.join("\n");
const site = {
  name: "site.uritp",
  source: lines(
    "define place dock = pose(0.5m, 0.5m, 0m)",
    "define place desk_14 = pose(6m, 3m, 0m)",
    "define zone stairs = polygon(pose(8m, 0m, 0m), pose(10m, 0m, 0m), pose(10m, 2m, 0m), pose(8m, 2m, 0m))",
    "define route corridor = [places.dock, places.desk_14]",
  ),
};

function codes(...statements: string[]): string[] {
  const program = { name: "main.uritp", source: lines('robot rover = connect("pi:rover-1")', ...statements) };
  return checkProgram({ program, manifests: { rover: manifest }, siteMaps: [site] }).diagnostics.map((d) => d.code);
}

describe("Raspberry Pi rover manifest", () => {
  it("is a valid manifest with the navigation and vision profiles", () => {
    const { model, diagnostics } = checkManifest(manifest.source, manifest.name);
    expect(diagnostics).toEqual([]);
    expect(model?.profiles).toEqual(["core", "navigation", "vision"]);
  });

  it("accepts a patrol that drives, senses and takes photos", () => {
    expect(
      codes(
        "for point in route.corridor:",
        "    move rover.base to point speed 0.2m/s",
        "        avoid zones.stairs",
        '    if rover.sense("distance_front").value < 30cm:',
        '        capture rover.camera save as "blocked_{point.name}.jpg"',
        "turn rover.base by 90deg",
        "drive rover.base forward by 50cm speed 0.1m/s",
      ),
    ).toEqual([]);
  });

  it("rejects the office delivery example: it cannot speak and has no tray", () => {
    expect(codes('say "Please place the parcel on my tray"', "wait until rover.tray.loaded timeout 2min")).toEqual(["E401", "E206"]);
  });

  it("rejects a speed above its safety limit", () => {
    expect(codes("drive rover.base forward by 1m speed 0.4m/s")).toEqual(["E502"]);
  });

  it("rejects gripping, which needs manipulation", () => {
    expect(codes("pick box using rover")).toEqual(["E401"]);
  });
});
