// Tests the single entry point that decides whether a program may run: program, manifests and
// site maps together. A program with any error is rejected before anything moves.
import { describe, expect, it } from "vitest";
import { checkProgram } from "../../src/checker/check-program.js";
import { formatDiagnostic } from "../../src/diagnostics/diagnostic.js";

const lines = (...source: string[]): string => source.join("\n");

/** The Guidebook's example manifest from §9.1, used here without any real company. */
const EXAMPLE_ARM = {
  name: "x7.uritp",
  source: lines(
    'manifest "ExampleCorp X7 Arm":',
    "    uritp 0.1",
    "    frame tool: pose6d reach 0.85m max_speed 1.5m/s payload 5kg",
    "    actuator gripper: states [open, closed] max_force 140N",
    "    sensor camera: rgb",
    "    profiles [core, manipulation, vision]",
    "    extension examplecorp.adaptive_weld(seam: Route, current: Quantity<Current>)",
    "    safety max_speed 1.5m/s",
  ),
};
const program = (...source: string[]) => ({ name: "main.uritp", source: lines('robot arm = connect("line3:x7")', ...source) });

describe("checkProgram", () => {
  it("accepts a correct program", () => {
    const result = checkProgram({ program: program("move arm.tool to cup.above(10cm) speed 0.2m/s", "grip arm.gripper close"), manifests: { arm: EXAMPLE_ARM } });
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.program?.statements).toHaveLength(3);
    expect(result.models.get("arm")?.name).toBe("ExampleCorp X7 Arm");
  });

  it("rejects an unsafe program with a clear reason before anything moves", () => {
    const result = checkProgram({ program: program("move arm.tool to cup speed 3m/s"), manifests: { arm: EXAMPLE_ARM } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => formatDiagnostic(d).split("\n")[0])).toEqual([
      "E502 (line 2): speed 3m/s exceeds safety limit 1.5m/s for 'arm'",
    ]);
  });

  it("rejects a command the robot cannot do", () => {
    const result = checkProgram({ program: program("drive arm.tool forward by 1m"), manifests: { arm: EXAMPLE_ARM } });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["E401"]);
  });

  it("lets a program with only warnings run", () => {
    const result = checkProgram({
      program: program("examplecorp.adaptive_weld(route.seam, current=180A)"),
      manifests: { arm: EXAMPLE_ARM },
      siteMaps: [{ name: "site.uritp", source: "define route seam = [pose(0m, 0m, 0m), pose(1m, 0m, 0m)]" }],
    });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["W601"]);
    expect(result.ok).toBe(true);
  });

  it("reports a broken manifest with its file name, and not also as a missing manifest", () => {
    const broken = { name: "x7.uritp", source: lines('manifest "X7":', "    uritp 0.1", "    profiles [navigation]") };
    const result = checkProgram({ program: program("grip arm.gripper close"), manifests: { arm: broken } });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => [d.code, d.file])).toEqual([["E411", "x7.uritp"]]);
  });

  it("rejects a robot with no manifest (D26)", () => {
    const result = checkProgram({ program: program("grip arm.gripper close"), manifests: {} });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["E201"]);
  });

  it("stops after syntax errors, so later checks do not add confusing messages", () => {
    const result = checkProgram({ program: program("move arm.tool to cup speed 5mms"), manifests: { arm: EXAMPLE_ARM } });
    expect(result.diagnostics.map((d) => d.code)).toEqual(["E110"]);
    expect(result.program).toBeNull();
  });
});
