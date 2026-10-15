// Company: Universal Robots
// Checks the Universal Robots arm manifest and that programs are accepted or rejected against it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkProgram } from "../../src/checker/check-program.js";
import { checkManifest } from "../../src/checker/manifest.js";

const manifest = { name: "ur-arm.uritp", source: readFileSync(new URL("ur-arm.uritp", import.meta.url), "utf8") };
const lines = (...source: string[]): string => source.join("\n");

function codes(...statements: string[]): string[] {
  const program = { name: "main.uritp", source: lines('robot arm = connect("ur:arm-1")', ...statements) };
  return checkProgram({ program, manifests: { arm: manifest } }).diagnostics.map((d) => d.code);
}

describe("Universal Robots arm manifest", () => {
  it("is a valid manifest with the manipulation profile", () => {
    const { model, diagnostics } = checkManifest(manifest.source, manifest.name);
    expect(diagnostics).toEqual([]);
    expect(model?.profiles).toEqual(["core", "manipulation"]);
    expect(model?.frames["tool"]?.type).toBe("pose6d");
  });

  it("accepts a pick and place within its limits", () => {
    expect(
      codes(
        "task pick_and_place(obj, dest):",
        "    move arm.tool to obj.above(10cm) speed 0.2m/s",
        "    grip arm.gripper close force 40N",
        "    move arm.tool to dest.above(10cm) speed 0.2m/s",
        "    grip arm.gripper open",
        "    on fail:",
        "        log error.code, error.reason",
        "pick_and_place(cup, tray)",
      ),
    ).toEqual([]);
  });

  it("rejects a speed above its safety limit", () => {
    expect(codes("move arm.tool to cup speed 0.5m/s")).toEqual(["E502"]);
  });

  it("rejects a grip force above the gripper's limit", () => {
    expect(codes("grip arm.gripper close force 150N")).toEqual(["E407"]);
  });

  it("rejects driving and speaking, which an arm cannot do", () => {
    expect(codes("drive arm.tool forward by 1m")).toEqual(["E401"]);
    expect(codes('say "done"')).toEqual(["E401"]);
  });

  it("rejects native URScript (D20)", () => {
    expect(codes('native("urscript", "set_tcp(p[0,0,0.12,0,0,0])")')).toEqual(["E405", "W602"]);
  });
});
