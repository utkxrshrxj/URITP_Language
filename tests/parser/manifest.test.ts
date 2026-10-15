// Tests reading manifest files (Guidebook §9.1): every kind of entry, keywords used as names,
// bare numbers kept for the checker, and syntax errors with clear fixes.
import { describe, expect, it } from "vitest";
import { parseManifest } from "../../src/parser/manifest.js";

const lines = (...source: string[]): string => source.join("\n");

/** The Guidebook's example manifest from §9.1. */
const EXAMPLE = lines(
  'manifest "ExampleCorp X7 Arm":',
  "    uritp 0.1",
  "    frame tool: pose6d reach 0.85m max_speed 1.5m/s payload 5kg",
  "    actuator gripper: states [open, closed] max_force 140N",
  "    sensor camera: rgb",
  "    sensor force: wrench",
  "    profiles [core, manipulation, vision]",
  "    extension examplecorp.adaptive_weld(seam: Route, current: Quantity<Current>)",
  "    safety max_speed 1.5m/s",
);

function parsedClean(source: string) {
  const { manifest, diagnostics } = parseManifest(source);
  expect(diagnostics).toEqual([]);
  if (manifest === null) throw new Error("no manifest");
  return manifest;
}

describe("parseManifest", () => {
  it("reads the Guidebook's example manifest", () => {
    const manifest = parsedClean(EXAMPLE);
    expect(manifest.name).toBe("ExampleCorp X7 Arm");
    expect(manifest.entries.map((e) => e.kind)).toEqual([
      "uritp", "frame", "actuator", "sensor", "sensor", "profiles", "extension", "safety_max_speed",
    ]);
  });

  it("reads a frame with its options", () => {
    const frame = parsedClean(EXAMPLE).entries[1];
    expect(frame).toMatchObject({
      kind: "frame",
      name: "tool",
      frameType: { name: "pose6d" },
      options: [
        { name: "reach", value: { raw: "0.85m" } },
        { name: "max_speed", value: { raw: "1.5m/s" } },
        { name: "payload", value: { raw: "5kg" } },
      ],
    });
  });

  it("accepts keywords as state and sensor names (DECISIONS.md B7)", () => {
    const entries = parsedClean(EXAMPLE).entries;
    expect(entries[2]).toMatchObject({ kind: "actuator", states: ["open", "closed"], maxForce: { raw: "140N" } });
    expect(entries[4]).toMatchObject({ kind: "sensor", name: "force", sensorKind: "wrench", dimension: null });
  });

  it("reads extension parameter types such as Quantity<Current>", () => {
    expect(parsedClean(EXAMPLE).entries[6]).toMatchObject({
      kind: "extension",
      vendor: "examplecorp",
      feature: "adaptive_weld",
      params: [{ name: "seam", type: "Route" }, { name: "current", type: "Quantity<Current>" }],
    });
  });

  it("reads a sensor dimension and a forbidden zone", () => {
    const manifest = parsedClean(
      lines(
        'manifest "Rover":',
        "    sensor distance_front: ultrasonic dimension Length",
        "    safety forbidden_zone zones.icu",
        "    safety forbidden_zone polygon(pose(0m, 0m, 0m), pose(1m, 0m, 0m), pose(1m, 1m, 0m))",
      ),
    );
    expect(manifest.entries).toMatchObject([
      { kind: "sensor", dimension: { name: "Length" } },
      { kind: "safety_forbidden_zone", zone: { kind: "Member", name: "icu" } },
      { kind: "safety_forbidden_zone", zone: { kind: "Call" } },
    ]);
  });

  it("keeps a bare number so the checker can suggest a unit", () => {
    const manifest = parsedClean(lines('manifest "R":', "    safety max_speed 1.5"));
    expect(manifest.entries[0]).toMatchObject({ kind: "safety_max_speed", value: { kind: "Number", raw: "1.5" } });
  });
});

describe("manifest syntax errors", () => {
  it("suggests the right entry word (E132)", () => {
    const { diagnostics } = parseManifest(lines('manifest "R":', "    sensors camera: rgb"));
    expect(diagnostics[0]).toMatchObject({ code: "E132", args: { word: "sensors", suggestion: "sensor" } });
  });

  it("needs the manifest line first", () => {
    expect(parseManifest("uritp 0.1").diagnostics[0]).toMatchObject({ code: "E120", args: { expected: "'manifest'" } });
  });

  it("needs ':' after the name", () => {
    expect(parseManifest(lines('manifest "R"', "    uritp 0.1")).diagnostics[0]?.code).toBe("E101");
  });

  it("keeps reading after a broken entry", () => {
    const { manifest, diagnostics } = parseManifest(
      lines('manifest "R":', "    frame : pose2d", "    profiles [core, navigation]"),
    );
    expect(diagnostics).toHaveLength(1);
    expect(manifest?.entries.map((e) => e.kind)).toEqual(["profiles"]);
  });

  it("rejects a frame option given twice", () => {
    expect(parseManifest(lines('manifest "R":', "    frame base: pose2d max_speed 1m/s max_speed 2m/s")).diagnostics[0]?.code).toBe("E124");
  });

  it("rejects anything after the manifest block", () => {
    const { diagnostics } = parseManifest(lines('manifest "R":', "    uritp 0.1", "move r.base to x"));
    expect(diagnostics[0]).toMatchObject({ code: "E120", args: { expected: "the end of the file" } });
  });
});
