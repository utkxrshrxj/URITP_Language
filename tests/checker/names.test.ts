// Tests name checks (E2xx): robots and their parts, site maps with places, zones and routes,
// and imported files.
import { describe, expect, it } from "vitest";
import type { CheckOptions } from "../../src/checker/checker.js";
import { formatDiagnostic } from "../../src/diagnostics/diagnostic.js";
import { checked, codes, firstMessage, lines } from "./helpers.js";
import { WITH_TEST_ROBOTS } from "./models.js";

const rover = 'robot rover = connect("office:rover-2")';

describe("robots", () => {
  it("needs a manifest for every robot", () => {
    const d = checked('robot r = connect("lab:r1")');
    expect(d).toEqual([expect.objectContaining({ code: "E201", args: { robot: "r", address: "lab:r1" } })]);
  });

  it("knows a robot's frames, actuators and sensors", () => {
    const source = lines(rover, "let b = rover.base", "let t = rover.tray.loaded", "let low = rover.battery < 20%");
    expect(codes(source, WITH_TEST_ROBOTS)).toEqual([]);
  });

  it("reports a part the robot does not have (E203 comes when a frame is expected)", () => {
    const source = lines(rover, "let t = rover.tool.above(10cm)");
    expect(codes(source, WITH_TEST_ROBOTS)).toEqual(["E206"]);
  });

  it("suggests a close part name", () => {
    expect(checked(lines(rover, "let b = rover.bse"), WITH_TEST_ROBOTS)[0]).toMatchObject({
      code: "E206",
      args: { suggestion: "base" },
    });
  });

  it("reads a sensor with sense() and types the reading from its dimension (D10)", () => {
    const source = lines(rover, 'let near = rover.sense("distance_front").value < 20cm');
    expect(codes(source, WITH_TEST_ROBOTS)).toEqual([]);
    expect(checked(lines(rover, 'let near = rover.sense("distance_front").value < 20'), WITH_TEST_ROBOTS)[0])
      .toMatchObject({ code: "E304", args: { suggestion: "20cm" } });
  });

  it("gives plain numbers for a sensor without a dimension", () => {
    expect(codes(lines(rover, 'let x = rover.sense("camera").max > 3'), WITH_TEST_ROBOTS)).toEqual([]);
  });

  it("rejects a sensor the robot does not have", () => {
    expect(firstMessage(lines(rover, 'let h = rover.sense("thermal").max'), WITH_TEST_ROBOTS)).toBe(
      "robot 'rover' has no sensor 'thermal' / Its sensors are: distance_front, camera.",
    );
  });

  it("needs fixed text in has() and sense() (DECISIONS.md B6)", () => {
    expect(codes(lines(rover, 'let n = "camera"', "let x = rover.sense(n)"), WITH_TEST_ROBOTS)).toEqual(["E311"]);
    expect(codes(lines(rover, 'let v = rover.has("vision")'), WITH_TEST_ROBOTS)).toEqual([]);
  });

  it("explains has without brackets", () => {
    expect(firstMessage(lines(rover, "let v = rover.has"), WITH_TEST_ROBOTS)).toContain('rover.has("NAME")');
  });

  it("does not let a robot be connected twice under one name", () => {
    expect(codes(lines(rover, rover), WITH_TEST_ROBOTS)).toEqual(["E207"]);
  });
});

describe("site maps (DECISIONS.md D16)", () => {
  const site = lines(
    "define place kitchen = pose(4.2m, 1.0m, 0m, yaw=90deg)",
    "define place door = pose(0m, 3.5m, 0m)",
    "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m))",
    "define route night_patrol = [places.kitchen, places.door]",
  );
  const withSite: CheckOptions = { ...WITH_TEST_ROBOTS, siteMaps: [{ name: "site.uritp", source: site }] };

  it("makes places, zones and routes available", () => {
    const source = lines("let k = places.kitchen", "let z = zones.icu", "let r = route.night_patrol", "let n = len(r)");
    expect(codes(source, withSite)).toEqual([]);
  });

  it("gives places a name (D7)", () => {
    expect(codes('let t = "at {places.kitchen.name}"', withSite)).toEqual([]);
  });

  it("rejects an unknown place and suggests a close one", () => {
    expect(checked("let k = places.kitchn", withSite)[0]).toMatchObject({
      code: "E209",
      args: { kind: "place", name: "kitchn", suggestion: "kitchen" },
    });
  });

  it("rejects places when there is no site map", () => {
    expect(codes("let k = places.kitchen")).toEqual(["E209"]);
  });

  it("lets a program define its own places, but not twice", () => {
    expect(codes(lines("define place a = pose(0m, 0m, 0m)", "let p = places.a"))).toEqual([]);
    expect(codes(lines("define place a = pose(0m, 0m, 0m)", "define place a = pose(1m, 0m, 0m)"))).toEqual(["E207"]);
  });

  it("checks the value of each define", () => {
    expect(codes("define place a = 5cm")).toEqual(["E306"]);
    expect(codes("define zone z = pose(0m, 0m, 0m)")).toEqual(["E306"]);
    expect(codes("define route r = [1cm, 2cm]")).toEqual(["E306"]);
  });

  it("only allows define lines in a site map, and names the file in errors", () => {
    const bad: CheckOptions = { siteMaps: [{ name: "site.uritp", source: 'say "hi"' }] };
    const d = checked("let x = 1", bad);
    expect(d[0]).toMatchObject({ code: "E215", file: "site.uritp" });
    expect(formatDiagnostic(d[0] as never).split("\n")[0]).toBe("E215 (site.uritp, line 1): site.uritp may only contain define lines");
  });

  it("reports syntax errors inside a site map with its file name", () => {
    const bad: CheckOptions = { siteMaps: [{ name: "site.uritp", source: "define place a = pose(0m, 0m, 0m" }] };
    expect(checked("let x = 1", bad)[0]).toMatchObject({ code: "E120", file: "site.uritp" });
  });
});

describe("imports", () => {
  const files: Record<string, string> = {
    "places.uritp": "define place lab = pose(1m, 1m, 0m)",
    "a.uritp": 'import "b.uritp"',
    "b.uritp": 'import "a.uritp"',
    "bad.uritp": "let x = 1",
  };
  const withFiles: CheckOptions = { readFile: (path) => files[path] ?? null };

  it("loads places from an imported file", () => {
    expect(codes(lines('import "places.uritp"', "let l = places.lab"), withFiles)).toEqual([]);
  });

  it("reports a missing file", () => {
    expect(codes('import "nowhere.uritp"', withFiles)).toEqual(["E213"]);
  });

  it("reports files that import each other", () => {
    expect(checked('import "a.uritp"', withFiles)[0]).toMatchObject({
      code: "E214",
      args: { chain: "a.uritp -> b.uritp -> a.uritp" },
    });
  });

  it("only allows define, task and import lines in an imported file", () => {
    expect(checked('import "bad.uritp"', withFiles)[0]).toMatchObject({ code: "E215", file: "bad.uritp" });
  });

  it("loads a file only once", () => {
    expect(codes(lines('import "places.uritp"', 'import "places.uritp"'), withFiles)).toEqual([]);
  });
});

describe("vendor extensions (DECISIONS.md D18)", () => {
  it("finds an extension in the robot's manifest; capability rules are tested in capabilities.test.ts", () => {
    const source = lines(
      'robot welder = connect("x")',
      'if welder.has("examplecorp.adaptive_weld"):',
      "    examplecorp.adaptive_weld(route.seam, current=180A)",
    );
    const site: CheckOptions = {
      ...WITH_TEST_ROBOTS,
      siteMaps: [{ name: "site.uritp", source: "define route seam = [pose(0m, 0m, 0m), pose(1m, 0m, 0m)]" }],
    };
    expect(codes(source, site)).toEqual([]);
  });
});
