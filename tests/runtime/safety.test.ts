// Tests safety rules while running (Guidebook §5, D37): they are checked before each instruction
// and every short interval, fire when their condition becomes true, and end the program safely.
import { describe, expect, it } from "vitest";
import { motions, reading, type Response } from "./fake-robot.js";
import { lines, run } from "./run-helpers.js";

const SITE = lines(
  "define place launch_pad = pose(0m, 0m, 0m)",
  "define place roof_north = pose(20m, 30m, 0m)",
  "define place roof_east = pose(35m, 15m, 0m)",
  "define place roof_south = pose(20m, 0m, 0m)",
  "define route roof_inspect = [places.roof_north, places.roof_east, places.roof_south]",
);

/** A drone whose battery drops by `drop` percent with every motion, starting full. */
function drone(drop: number): (line: string) => Response {
  let battery = 1;
  return (line) => {
    if (line === "SENSE sensor=battery") return reading(battery);
    if (!line.startsWith("SENSE")) battery -= drop / 100;
    return { duration: 1 };
  };
}

const EXAMPLE_III = lines(
  'robot drone = connect("field:drone-7")',
  "safety:",
  "    return_home drone when drone.battery < 25%",
  "takeoff drone to 15m",
  "for point in route.roof_inspect:",
  "    move drone.base to point.at_height(10m)",
  '    capture drone.camera save as "roof_{point.id}.jpg"',
  "land drone at places.launch_pad",
);

describe("safety rules", () => {
  it("lets example iii finish when the battery stays high", async () => {
    const { result, robots } = await run(EXAMPLE_III, { robots: { drone: drone(5) }, site: SITE });
    expect(result.state).toBe("succeeded");
    expect(motions(robots["drone"]!)).toEqual([
      "SKILL name=takeoff height=15",
      "MOVE frame=base target=pose(20,30,10,0,0,0)",
      "MOVE frame=base target=pose(35,15,10,0,0,0)",
      "MOVE frame=base target=pose(20,0,10,0,0,0)",
      "SKILL name=land at=pose(0,0,0,0,0,0)",
    ]);
    expect(robots["drone"]!.sent.filter((l) => l.includes("save="))).toEqual([
      'SENSE sensor=camera save="roof_roof_north.jpg"',
      'SENSE sensor=camera save="roof_roof_east.jpg"',
      'SENSE sensor=camera save="roof_roof_south.jpg"',
    ]);
  });

  it("sends the drone home when the battery drops below 25%, and cancels the program", async () => {
    const { result, robots } = await run(EXAMPLE_III, { robots: { drone: drone(30) }, site: SITE });
    expect(result).toMatchObject({ state: "cancelled", reason: "safety rule on line 3: return_home drone", error: null });
    const sent = motions(robots["drone"]!);
    expect(sent[sent.length - 1]).toBe("SKILL name=return_home");
    expect(sent).not.toContain("SKILL name=land at=pose(0,0,0,0,0,0)");
    expect(robots["drone"]!.stops).toBeGreaterThanOrEqual(1);
  });

  it("fires before the first instruction when the condition is already true", async () => {
    const { result, robots } = await run(EXAMPLE_III, { robots: { drone: (line) => (line === "SENSE sensor=battery" ? reading(0.1) : {}) }, site: SITE });
    expect(result.state).toBe("cancelled");
    expect(motions(robots["drone"]!)).toEqual(["SKILL name=return_home"]);
  });

  it("stops the robot and cancels the program for a stop rule", async () => {
    const source = lines('robot rover = connect("x")', "safety:", '    stop rover when rover.state == "error"', "drive rover.base forward by 1m", "drive rover.base forward by 1m");
    let drives = 0;
    const { result, robots } = await run(source, {
      robots: { rover: (line) => (line === "SENSE sensor=state" ? reading(drives >= 1 ? "error" : "idle") : (drives++, { duration: 1 })) },
    });
    expect(result).toMatchObject({ state: "cancelled", reason: "safety rule on line 3: stop rover" });
    expect(motions(robots["rover"]!)).toEqual(["DRIVE frame=base distance=1"]);
  });

  it("stops every robot for a stop rule that names no robot (D44)", async () => {
    const source = lines(
      'robot rover = connect("x")',
      'robot drone = connect("y")',
      "safety:",
      "    stop when rover.battery < 50%",
      "drive rover.base forward by 1m",
      "takeoff drone to 5m",
    );
    const { result, robots } = await run(source, { robots: { rover: drone(60), drone: () => ({}) } });
    expect(result).toMatchObject({ state: "cancelled", reason: "safety rule on line 4: stop" });
    expect(motions(robots["drone"]!)).toEqual([]);
    expect(robots["rover"]!.stops).toBeGreaterThanOrEqual(1);
    expect(robots["drone"]!.stops).toBeGreaterThanOrEqual(1);
  });

  it("sends the one flying robot home for a return_home rule that names no robot (D44)", async () => {
    const source = lines('robot drone = connect("x")', "safety:", "    return_home when drone.battery < 50%", "takeoff drone to 15m", "move drone.base to places.roof_north");
    const { result, robots } = await run(source, { robots: { drone: drone(60) }, site: SITE });
    expect(result.reason).toBe("safety rule on line 3: return_home drone");
    const sent = motions(robots["drone"]!);
    expect(sent[sent.length - 1]).toBe("SKILL name=return_home");
  });

  it("lands at a place for a land rule", async () => {
    const source = lines('robot drone = connect("x")', "safety:", "    land drone at places.launch_pad when drone.battery < 50%", "takeoff drone to 15m", "move drone.base to places.roof_north");
    const { robots } = await run(source, { robots: { drone: drone(60) }, site: SITE });
    const sent = motions(robots["drone"]!);
    expect(sent[sent.length - 1]).toBe("SKILL name=land at=pose(0,0,0,0,0,0)");
  });

  it("raises an alert once when it becomes true, and lets the program go on", async () => {
    const source = lines(
      'robot rover = connect("x")',
      "safety:",
      '    alert "Battery below 50%" when rover.battery < 50%',
      "repeat 4 times:",
      "    drive rover.base forward by 1m",
    );
    let battery = 0.7;
    const { result, alerts } = await run(source, {
      robots: { rover: (line) => (line === "SENSE sensor=battery" ? reading(battery) : ((battery -= 0.1), { duration: 1 })) },
    });
    expect(result.state).toBe("succeeded");
    expect(alerts).toEqual(["Battery below 50%"]);
  });

  it("gives an alert with no message the rule's line (D44)", async () => {
    const source = lines('robot rover = connect("x")', "safety:", "    alert when rover.battery < 50%", "drive rover.base forward by 1m");
    const { alerts } = await run(source, { robots: { rover: (line) => (line === "SENSE sensor=battery" ? reading(0.4) : {}) } });
    expect(alerts).toEqual(["safety rule on line 3"]);
  });

  it("stops the program when a rule cannot be checked (D37)", async () => {
    const source = lines('robot rover = connect("x")', "safety:", "    stop rover when rover.battery < 10%", "drive rover.base forward by 1m");
    const { result, robots } = await run(source, { robots: { rover: (line) => (line === "SENSE sensor=battery" ? { fail: "sensor offline" } : {}) } });
    expect(result.state).toBe("cancelled");
    expect(result.reason).toBe("the safety rule on line 3 could not be checked: sense failed: sensor offline");
    expect(motions(robots["rover"]!)).toEqual([]);
  });
});
