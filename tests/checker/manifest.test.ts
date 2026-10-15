// Tests turning manifests into robot models (Guidebook §9.1) and the E41x manifest errors.
// A manifest with any error gives no model, so no program can run against it.
import { describe, expect, it } from "vitest";
import { checkManifest } from "../../src/checker/manifest.js";

const lines = (...source: string[]): string => source.join("\n");
const manifest = (...entries: string[]): string => lines('manifest "Test robot":', ...entries.map((e) => `    ${e}`));
const BASE = ["uritp 0.1", "profiles [core, navigation]"];

function errors(...entries: string[]): string[] {
  return checkManifest(manifest(...entries)).diagnostics.map((d) => d.code);
}

describe("building a model", () => {
  it("builds a model from the Guidebook's example manifest", () => {
    const { model, diagnostics } = checkManifest(
      manifest(
        "uritp 0.1",
        "frame tool: pose6d reach 0.85m max_speed 1.5m/s payload 5kg",
        "actuator gripper: states [open, closed] max_force 140N",
        "sensor camera: rgb",
        "sensor force: wrench",
        "profiles [core, manipulation, vision]",
        "extension examplecorp.adaptive_weld(seam: Route, current: Quantity<Current>)",
        "safety max_speed 1.5m/s",
      ),
    );
    expect(diagnostics).toEqual([]);
    expect(model).toMatchObject({
      name: "Test robot",
      frames: { tool: { type: "pose6d", reach: { value: 0.85, unit: "m" }, maxSpeed: { value: 1.5, unit: "m/s" }, payload: { value: 5, unit: "kg" } } },
      actuators: { gripper: { states: ["open", "closed"], maxForce: { value: 140, unit: "N" } } },
      sensors: { camera: { kind: "rgb", dimension: null }, force: { kind: "wrench", dimension: null } },
      profiles: ["core", "manipulation", "vision"],
      extensions: { "examplecorp.adaptive_weld": { params: [{ name: "seam", type: "Route" }, { name: "current", type: "Quantity<Current>" }] } },
      safety: { maxSpeed: { value: 1.5, unit: "m/s" }, forbiddenZones: [] },
    });
  });

  it("reads forbidden zones by name or as a polygon in metres (D19)", () => {
    const { model } = checkManifest(
      manifest(...BASE, "safety forbidden_zone zones.icu", "safety forbidden_zone polygon(pose(0m, 0m, 0m), pose(200cm, 0m, 0m), pose(2m, 1m, 0m))"),
    );
    expect(model?.safety?.forbiddenZones).toEqual([
      { kind: "named", name: "icu" },
      { kind: "polygon", corners: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }] },
    ]);
  });

  it("names the file in its errors", () => {
    expect(checkManifest(manifest("profiles [core]"), "rover.uritp").diagnostics[0]).toMatchObject({ code: "E410", file: "rover.uritp" });
  });
});

describe("manifest errors", () => {
  it.each([
    [["profiles [core]"], "E410"],
    [["uritp 0.2", "profiles [core]"], "E410"],
    [["uritp 0.1"], "E411"],
    [["uritp 0.1", "profiles [navigation]"], "E411"],
    [["uritp 0.1", "profiles [core, navigaton]"], "E412"],
    [[...BASE, "frame base: pose4d"], "E413"],
    [[...BASE, "frame base: pose2d max_speed 1.5m"], "E414"],
    [[...BASE, "frame base: pose2d", "frame base: pose2d"], "E415"],
    [["uritp 0.1", "uritp 0.1", "profiles [core]"], "E415"],
    [[...BASE, "sensor d: sonar dimension Lenght"], "E416"],
    [[...BASE, "extension acme.cut(path: Path)"], "E417"],
    [[...BASE, "extension Acme.Cut(path: Route)"], "E418"],
    [[...BASE, "extension navigation.boost()"], "E418"],
    [[...BASE, "safety forbidden_zone cup"], "E419"],
  ])("rejects %j with %s", (entries, code) => {
    expect(errors(...entries)).toEqual([code]);
  });

  it("suggests a unit for a bare number", () => {
    const d = checkManifest(manifest(...BASE, "safety max_speed 1.5")).diagnostics[0];
    expect(d).toMatchObject({ code: "E304", args: { expected: "Speed", suggestion: "1.5m/s" } });
  });

  it("suggests a profile and a frame type", () => {
    expect(checkManifest(manifest("uritp 0.1", "profiles [core, navigaton]")).diagnostics[0]?.args["suggestion"]).toBe("navigation");
    expect(checkManifest(manifest(...BASE, "frame base: pose2")).diagnostics[0]?.args["suggestion"]).toBe("pose2d");
  });

  it("gives no model when there is any error", () => {
    expect(checkManifest(manifest("uritp 0.1", "profiles [core]", "frame base: pose4d")).model).toBeNull();
    expect(checkManifest('manifest "R"').model).toBeNull();
  });
});
