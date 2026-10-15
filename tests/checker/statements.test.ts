// Tests that each statement gets the right kind of value in each slot (TYPES_AND_UNITS.md section 4),
// plus conditions, loops, on fail with error, safety rules and language codes.
import { describe, expect, it } from "vitest";
import type { CheckOptions } from "../../src/checker/checker.js";
import { checked, codes, firstMessage, lines } from "./helpers.js";
import { WITH_TEST_ROBOTS } from "./models.js";

const SITE = lines(
  "define place dock = pose(0m, 0m, 0m)",
  "define place lab = pose(5m, 2m, 0m)",
  "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m))",
  "define route patrol = [places.dock, places.lab]",
  "define route seam = [pose(0m, 0m, 0m), pose(1m, 0m, 0m)]",
);
const OPTIONS: CheckOptions = { ...WITH_TEST_ROBOTS, siteMaps: [{ name: "site.uritp", source: SITE }] };
const ROBOTS = lines(
  'robot rover = connect("office:rover-2")',
  'robot arm = connect("sim:arm")',
  'robot drone = connect("field:drone-7")',
  'robot helper = connect("home:humanoid")',
);

/** Checks statements after the four test robots are connected. */
const run = (...statements: string[]): string[] => codes(lines(ROBOTS, ...statements), OPTIONS);

/**
 * Checks statements with only one robot connected. Statements that name no robot, like say,
 * run on the one robot that can (DECISIONS.md D27), so they are tested this way.
 */
const runWith = (robot: string, ...statements: string[]): string[] =>
  codes(lines(`robot ${robot} = connect("x")`, ...statements), OPTIONS);

describe("motion", () => {
  it.each([
    "move rover.base to places.lab",
    "move rover.base to places.lab speed 0.5m/s tolerance 2cm via route.patrol avoid zones.icu",
    "move arm.tool to cup.above(10cm) speed 0.2m/s",
    "move arm.tool to pose(0.3m, 0m, 0.2m)",
    "drive rover.base forward by 50cm speed 0.2m/s",
    "turn rover.base by 90deg speed 30deg/s",
    "takeoff drone to 15m",
    "land drone at places.dock",
    "stop rover",
  ])("accepts %s", (statement) => {
    expect(run(statement)).toEqual([]);
  });

  it("reports a missing frame as E203, like the Guidebook example", () => {
    const d = checked(lines(ROBOTS, "move rover.tool to places.lab"), OPTIONS);
    expect(d).toEqual([expect.objectContaining({ code: "E203", line: 5, args: expect.objectContaining({ robot: "rover", name: "tool" }) })]);
  });

  it("rejects a bare number for speed and suggests m/s", () => {
    expect(checked(lines(ROBOTS, "move rover.base to places.lab speed 3"), OPTIONS)[0]).toMatchObject({
      code: "E304",
      args: { expected: "Speed", suggestion: "3m/s" },
    });
  });

  it("rejects the wrong kind of quantity", () => {
    expect(firstMessage(lines(ROBOTS, "move rover.base to places.lab speed 3m"), OPTIONS)).toContain(
      "expected Speed for speed, got Length",
    );
    expect(run("turn rover.base by 90deg speed 1m/s")).toEqual(["E306"]);
    expect(run("turn rover.base by 90cm")).toEqual(["E306"]);
  });

  it("rejects moving something that is not a frame", () => {
    expect(run("move rover to places.lab")).toEqual(["E306"]);
  });

  it("rejects a number as a target", () => {
    expect(run("move rover.base to 5")).toEqual(["E306"]);
  });

  it("needs a robot for takeoff, land and stop", () => {
    expect(run("stop rover.base")).toEqual(["E306"]);
  });
});

describe("manipulation", () => {
  it.each([
    "grip arm.gripper close force 20N",
    "pick box_231 using arm onto rover.base",
    "place kettle on places.lab using helper.left_hand",
    "grip helper.right_hand close",
    "move helper.right_hand to mug.handle",
  ])("accepts %s", (statement) => {
    expect(run(statement)).toEqual([]);
  });

  it("reports a missing actuator as E204", () => {
    expect(run("grip rover.gripper close")).toEqual(["E204"]);
  });

  it("rejects a frame that is not an actuator", () => {
    expect(run("grip arm.tool close")).toEqual(["E306"]);
  });

  it("checks pour, weld and spray slots", () => {
    expect(runWith("helper", "pour from kettle into mug until mug.fill >= 80%")).toEqual([]);
    expect(runWith("welder", "weld along route.seam speed 5mm/s current 180A")).toEqual([]);
    expect(runWith("welder", "weld along route.seam speed 5mm/s current 180")).toEqual(["E304"]);
  });
});

describe("sensing and talking", () => {
  it.each([
    'capture rover.camera save as "photo.jpg"',
    'log rover.battery, rover.state',
    'alert "Battery at {rover.battery}"',
  ])("accepts %s", (statement) => {
    expect(run(statement)).toEqual([]);
  });

  it.each(['say "Parcel for you" lang en', 'confirm "Shall I go?" lang hi', 'let room = ask "Which room?"'])(
    "accepts %s on a robot that can speak",
    (statement) => {
      expect(runWith("rover", statement)).toEqual([]);
    },
  );

  it("reports a missing sensor as E205", () => {
    expect(run('capture rover.lidar save as "x.jpg"')).toEqual(["E205"]);
  });

  it("checks insertions in file names", () => {
    expect(run('capture rover.camera save as "{nobody}.jpg"')).toEqual(["E202"]);
  });

  it("rejects a language code that is not one (E316)", () => {
    expect(runWith("rover", 'say "hello" lang english')).toEqual(["E316"]);
  });
});

describe("control flow", () => {
  it("needs true or false in conditions (E307)", () => {
    expect(run("if rover.battery:", "    stop rover")).toEqual(["E307"]);
    expect(run("wait until 5", "stop rover")).toEqual(["E307"]);
  });

  it("gives the loop variable the type of the route's items", () => {
    expect(run("for p in route.patrol:", '    log "At {p.name}"', "    move rover.base to p")).toEqual([]);
  });

  it("knows that poses in a route have no name (D7)", () => {
    expect(run("for p in route.seam:", '    log "At {p.name}"')).toEqual(["E211"]);
  });

  it("rejects looping over something that is not a list", () => {
    expect(run("for p in rover.battery:", "    stop rover")).toEqual(["E306"]);
  });

  it("keeps the loop variable inside the loop, and never takes it for an object (D4)", () => {
    expect(run("for p in route.patrol:", "    stop rover", "move rover.base to p")).toEqual(["E202"]);
    expect(firstMessage(lines(ROBOTS, "for p in route.patrol:", "    stop rover", "move rover.base to p"), OPTIONS)).toBe(
      "'p' is not defined / 'p' is defined on line 5, but only inside its own block, so it cannot be used here.",
    );
  });

  it("rejects rebinding the loop variable in the same block", () => {
    expect(run("for p in route.patrol:", "    let p = 1")).toEqual(["E207"]);
  });

  it("checks repeat counts (E312) and intervals", () => {
    expect(run("repeat 3 times:", "    stop rover")).toEqual([]);
    expect(run("repeat 2.5 times:", "    stop rover")).toEqual(["E312"]);
    expect(run("repeat every 10:", "    stop rover")).toEqual(["E304"]);
  });

  it("checks waits", () => {
    expect(run("wait 2s", "wait until rover.tray.loaded timeout 2min")).toEqual([]);
    expect(run("wait 2")).toEqual(["E304"]);
  });

  it("checks each part of a parallel block", () => {
    expect(run("parallel:", "    move rover.base to places.lab", "    move arm.tool to places.nowhere")).toEqual(["E209"]);
  });
});

describe("on fail and error (Guidebook §8)", () => {
  it("lets on fail use error.code and error.reason", () => {
    const source = lines(
      "move rover.base to places.lab",
      "on fail:",
      "    log error.code, error.reason",
      '    alert "I could not reach the lab: {error.reason}"',
      "    move rover.base to places.dock",
    );
    expect(run(source)).toEqual([]);
  });

  it("lets a task's on fail use the task's inputs, and a loop's on fail its variable (D42)", () => {
    const source = lines(
      "task go(spot):",
      "    move rover.base to spot",
      "    on fail:",
      '        alert "I could not reach {spot.name}"',
      "        log spot.name",
      "for spot in route.patrol:",
      "    move rover.base to spot",
      "    on fail:",
      "        log spot.name",
      "go(places.lab)",
    );
    expect(run(source)).toEqual([]);
  });

  it("keeps a block's own lets out of its on fail, since they may not have run (D42)", () => {
    const source = lines(
      "task go(spot):",
      "    let there = spot",
      "    move rover.base to there",
      "    on fail:",
      "        log there.name",
      "go(places.lab)",
    );
    expect(run(source)).toEqual(["E202"]);
  });

  it("rejects error outside on fail (E216)", () => {
    expect(run("log error.reason")).toEqual(["E216"]);
  });
});

describe("safety rules", () => {
  it("accepts the rules from the examples", () => {
    const source = lines(
      "safety:",
      "    return_home drone when drone.battery < 25%",
      "    land drone at places.dock when drone.battery < 10%",
      '    alert "Low battery" when drone.battery < 30%',
      '    stop drone when drone.state == "error"',
    );
    expect(run(source)).toEqual([]);
  });

  it("checks the condition and the robot", () => {
    expect(run("safety:", "    stop drone when drone.battery < 25")).toEqual(["E305"]);
    expect(run("safety:", "    stop drone.base when true")).toEqual(["E306"]);
  });
});
