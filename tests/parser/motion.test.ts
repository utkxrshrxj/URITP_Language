// Tests the motion and manipulation statements of Guidebook §5:
// move, drive, turn, takeoff, land, stop, grip, pick, place, pour, weld and spray.
import { describe, expect, it } from "vitest";
import type { Statement } from "../../src/parser/ast.js";
import { parse } from "../../src/parser/parser.js";
import { codes, lines, parseClean } from "./helpers.js";
import { show } from "./show.js";

/** Parses one statement and shows each of its value fields, like { frame: "arm.tool", speed: "0.2m/s" }. */
function fields(source: string): Record<string, unknown> {
  const statement = parseClean(source).statements[0] as Statement;
  const result: Record<string, unknown> = { kind: statement.kind };
  for (const [key, value] of Object.entries(statement)) {
    if (key === "kind" || key === "line" || key === "column") continue;
    if (Array.isArray(value)) result[key] = value.map(show);
    else if (value !== null && typeof value === "object") result[key] = show(value);
    else result[key] = value;
  }
  return result;
}

describe("move", () => {
  it("reads a frame and a target", () => {
    expect(fields("move arm.tool to obj.above(10cm)")).toEqual({
      kind: "Move", frame: "arm.tool", target: "obj.above(10cm)",
      speed: null, tolerance: null, via: null, avoid: [],
    });
  });

  it("reads every clause, in any order (DECISIONS.md C2)", () => {
    expect(fields("move r.base to places.lab tolerance 1cm avoid zones.a speed 0.5m/s via route.r avoid zones.b")).toEqual({
      kind: "Move", frame: "r.base", target: "places.lab", speed: "0.5m/s",
      tolerance: "1cm", via: "route.r", avoid: ["zones.a", "zones.b"],
    });
  });

  it("reads avoid on a continuation line", () => {
    const source = lines("move rover.base to places.ward_3 speed 0.5m/s", "    avoid zones.icu");
    expect(fields(source)).toMatchObject({ avoid: ["zones.icu"] });
  });

  it("rejects a clause given twice", () => {
    expect(codes("move a.base to b speed 1m/s speed 2m/s")).toEqual(["E124"]);
  });

  it("explains the comma from example ii (DECISIONS.md A7)", () => {
    const d = parse("move rover.base to places.desk_14, speed 0.8m/s").diagnostics;
    expect(d).toHaveLength(1);
    expect(d[0]?.args["fix"]).toBe("Remove the comma before 'speed'. Clauses follow each other without commas.");
  });

  it("explains a missing 'to'", () => {
    const d = parse("move arm.tool cup").diagnostics[0];
    expect(d).toMatchObject({ code: "E120", args: { expected: "'to'", found: "'cup'" } });
  });
});

describe("drive, turn, takeoff, land and stop", () => {
  it.each([
    ["drive rover.base forward", { kind: "Drive", frame: "rover.base", direction: "forward", distance: null, speed: null }],
    ["drive rover.base backward speed 0.2m/s by 50cm", { kind: "Drive", direction: "backward", distance: "50cm", speed: "0.2m/s" }],
    ["turn rover.base by 90deg", { kind: "Turn", frame: "rover.base", angle: "90deg", speed: null }],
    ["turn dog.base by -45deg speed 30deg/s", { kind: "Turn", angle: "(- 45deg)", speed: "30deg/s" }],
    ["takeoff drone to 15m", { kind: "Takeoff", robot: "drone", height: "15m" }],
    ["land drone", { kind: "Land", robot: "drone", at: null }],
    ["land drone at places.launch_pad", { kind: "Land", at: "places.launch_pad" }],
    ["stop rover", { kind: "Stop", robot: "rover" }],
  ])("reads %s", (source, expected) => {
    expect(fields(source)).toMatchObject(expected);
  });

  it("needs a direction for drive", () => {
    expect(parse("drive rover.base by 1m").diagnostics[0]?.args["expected"]).toBe("'forward' or 'backward'");
  });

  it("explains takeoff drone(15m) from example iii (DECISIONS.md A6)", () => {
    const d = parse("takeoff drone(15m)").diagnostics;
    expect(d).toHaveLength(1);
    expect(d[0]?.args["fix"]).toBe("Write: takeoff drone to 15m");
  });
});

describe("manipulation", () => {
  it.each([
    ["grip arm.gripper close", { kind: "Grip", actuator: "arm.gripper", action: "close", force: null }],
    ["grip arm.gripper open force 20N", { kind: "Grip", action: "open", force: "20N" }],
    ["pick box_231 using arm", { kind: "Pick", object: "box_231", robot: "arm", onto: null }],
    ["pick box_231 using arm onto rover.tray", { kind: "Pick", onto: "rover.tray" }],
    ["place kettle on places.counter_spot_a using helper.left_hand", { kind: "Place", object: "kettle", target: "places.counter_spot_a", frame: "helper.left_hand" }],
    ["pour from kettle into mug until mug.fill >= 80%", { kind: "Pour", from: "kettle", into: "mug", until: "(>= mug.fill 80%)" }],
    ["weld along route.seam speed 5mm/s current 180A", { kind: "Weld", path: "route.seam", speed: "5mm/s", current: "180A" }],
    ["spray bot.nozzle on field.row(4) amount 250ml", { kind: "Spray", actuator: "bot.nozzle", target: "field.row(4)", amount: "250ml" }],
  ])("reads %s", (source, expected) => {
    expect(fields(source)).toMatchObject(expected);
  });

  it("needs open or close for grip", () => {
    expect(parse("grip arm.gripper shut").diagnostics[0]?.args["expected"]).toBe("'open' or 'close'");
  });

  it("gives the syntax when a part is missing", () => {
    const d = parse("weld along route.seam current 180A").diagnostics[0];
    expect(d?.args).toMatchObject({ expected: "'speed'", form: "weld along PATH speed Q current Q" });
  });
});
