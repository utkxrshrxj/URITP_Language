// Tests safety checks (E5xx) and limits (E406 to E408): speeds and forces against the manifest,
// grip states, and targets inside forbidden zones. Nothing that breaks them may run.
import { describe, expect, it } from "vitest";
import type { CheckOptions } from "../../src/checker/checker.js";
import type { RobotModel } from "../../src/checker/robot-model.js";
import { checked, codes, firstMessage, lines } from "./helpers.js";
import { MODELS } from "./models.js";

const SITE = lines(
  "define place lab = pose(5m, 2m, 0m)",
  "define place ward = pose(12m, 3m, 0m)",
  "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m), pose(10m, 6m, 0m))",
  "define route through_icu = [places.lab, places.ward]",
  "define route safe = [places.lab]",
);

const ARM: RobotModel = {
  ...MODELS["arm"]!,
  frames: { tool: { type: "pose6d", maxSpeed: { value: 1, unit: "m/s" } } },
  actuators: { gripper: { states: ["open", "closed"], maxForce: { value: 140, unit: "N" } } },
  safety: { maxSpeed: { value: 1.5, unit: "m/s" }, forbiddenZones: [] },
};
const ROVER: RobotModel = {
  ...MODELS["rover"]!,
  frames: { base: { type: "pose2d", maxSpeed: { value: 1, unit: "m/s" } } },
  safety: { maxSpeed: { value: 0.5, unit: "m/s" }, forbiddenZones: [{ kind: "named", name: "icu" }] },
};
const OPTIONS: CheckOptions = {
  robots: (name) => (name === "arm" ? ARM : name === "rover" ? ROVER : undefined),
  siteMaps: [{ name: "site.uritp", source: SITE }],
};
const arm = (...statements: string[]): string => lines('robot arm = connect("sim:arm")', ...statements);
const rover = (...statements: string[]): string => lines('robot rover = connect("office:rover")', ...statements);

describe("speed limits", () => {
  it("gives the Guidebook's E502 message for a speed above the safety limit", () => {
    expect(firstMessage(arm("move arm.tool to places.lab speed 3m/s"), OPTIONS)).toBe(
      "speed 3m/s exceeds safety limit 1.5m/s for 'arm' / Use a speed of at most 1.5m/s. A program can never switch safety limits off (Guidebook §9.3 rule 6).",
    );
  });

  it("rejects a speed above what the frame can do (E406)", () => {
    expect(checked(arm("move arm.tool to places.lab speed 1.2m/s"), OPTIONS)[0]).toMatchObject({
      code: "E406",
      args: { speed: "1.2m/s", limit: "1m/s", frame: "tool" },
    });
  });

  it("compares across units", () => {
    expect(codes(arm("move arm.tool to places.lab speed 90cm/s"), OPTIONS)).toEqual([]);
    expect(codes(rover("move rover.base to places.lab speed 2km/h"), OPTIONS)).toEqual(["E502"]);
  });

  it("uses fixed values of names", () => {
    expect(codes(arm("let fast = 2m/s", "move arm.tool to places.lab speed fast"), OPTIONS)).toEqual(["E502"]);
  });

  it("checks drive speeds", () => {
    expect(codes(rover("drive rover.base forward by 1m speed 0.6m/s"), OPTIONS)).toEqual(["E502"]);
    expect(codes(rover("drive rover.base forward by 1m speed 0.4m/s"), OPTIONS)).toEqual([]);
  });

  it("checks speeds inside tasks with each call's fixed values", () => {
    const source = arm("task go(s):", "    move arm.tool to places.lab speed s", "go(0.5m/s)", "go(3m/s)");
    expect(checked(source, OPTIONS)).toEqual([
      expect.objectContaining({ code: "E502", line: 3, args: expect.objectContaining({ speed: "3m/s" }) }),
    ]);
  });
});

describe("grip", () => {
  it("rejects a force above max_force (E407)", () => {
    expect(codes(arm("grip arm.gripper close force 200N"), OPTIONS)).toEqual(["E407"]);
    expect(codes(arm("grip arm.gripper close force 100N"), OPTIONS)).toEqual([]);
  });

  it("rejects a state the actuator does not have (E408)", () => {
    expect(firstMessage(rover("grip rover.tray close"), { ...OPTIONS, robots: () => ({ ...ROVER, profiles: ["core", "manipulation"] }) })).toBe(
      "actuator 'tray' of 'rover' has no state 'closed' / Its states are: empty, loaded. grip ... open needs the state open, and grip ... close needs closed.",
    );
  });
});

describe("forbidden zones", () => {
  it("rejects a target inside a forbidden zone (E501)", () => {
    expect(checked(rover("move rover.base to places.ward"), OPTIONS)[0]).toMatchObject({
      code: "E501",
      args: { zone: "icu", robot: "rover" },
    });
    expect(codes(rover("move rover.base to places.lab"), OPTIONS)).toEqual([]);
  });

  it("works out positions from helpers", () => {
    expect(codes(rover("move rover.base to places.lab.offset(7m, 0m, 0m)"), OPTIONS)).toEqual(["E501"]);
  });

  it("checks the points of a via route", () => {
    expect(codes(rover("move rover.base to places.lab via route.through_icu"), OPTIONS)).toEqual(["E501"]);
    expect(codes(rover("move rover.base to places.lab via route.safe"), OPTIONS)).toEqual([]);
  });

  it("rejects a forbidden zone the site map does not define (E503)", () => {
    const options: CheckOptions = { ...OPTIONS, siteMaps: [{ name: "site.uritp", source: "define place lab = pose(5m, 2m, 0m)" }] };
    expect(checked(rover("move rover.base to places.lab"), options)).toEqual([
      expect.objectContaining({ code: "E503", line: 1, args: { zone: "icu", robot: "rover" } }),
    ]);
  });

  it("uses zones written as polygons in the manifest", () => {
    const options: CheckOptions = {
      ...OPTIONS,
      robots: () => ({ ...ROVER, safety: { forbiddenZones: [{ kind: "polygon", corners: [{ x: 4, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 3 }, { x: 4, y: 3 }] }] } }),
    };
    expect(checked(rover("move rover.base to places.lab"), options)[0]).toMatchObject({ code: "E501", args: { zone: "" } });
  });

  it("leaves objects to the robot, since their position is only known while running", () => {
    expect(codes(rover("move rover.base to cup"), OPTIONS)).toEqual([]);
  });
});
