// Feeds the six example programs exactly as they appear in the source PDF to the parser,
// and checks each known mistake gets a clear error and fix (see spec/DECISIONS.md part A).
import { describe, expect, it } from "vitest";
import { explain } from "../src/diagnostics/diagnostic.js";
import { parse } from "../src/parser/parser.js";

const lines = (...source: string[]): string => source.join("\n");

/** Each problem as "CODE line: fix", the way a person would read it. */
function problems(source: string): string[] {
  return parse(source).diagnostics.map((d) => `${d.code} ${d.line}: ${explain(d).fix}`);
}

describe("original example programs", () => {
  it("i: on fail indented too deep, and disp", () => {
    const source = lines(
      'robot arm = connect("sim:panda")',
      "task pick_and_place(obj, dest):",
      "    move arm.tool to obj.above(10cm)",
      "    grip arm.gripper close",
      "    move arm.tool to dest.above(10cm) speed 0.2m/s",
      "    grip arm.gripper open",
      "        on fail:",
      '            disp "I couldn\'t complete that"',
      "pick_and_place(cup, tray)",
    );
    expect(problems(source)).toEqual([
      "E120 7: Line up 'on fail:' with the statements of the block it protects.",
      "E107 7: If this line starts a new statement, line it up with the statement above. A line that opens a block cannot be split over several lines.",
    ]);
  });

  it("ii: disp and a comma before speed", () => {
    const source = lines(
      'robot rover = connect("office:rover-2")',
      "move rover.base to places.mailroom",
      'disp "Please place the parcel on my tray"',
      "wait until rover.tray.loaded timeout 2min",
      "move rover.base to places.desk_14, speed 0.8m/s",
      'disp "Parcel for you"',
      "wait until not rover.tray.loaded timeout 5min",
      "move rover.base to places.dock",
    );
    expect(problems(source)).toEqual([
      "E121 3: Did you mean 'say'?",
      "E120 5: Remove the comma before 'speed'. Clauses follow each other without commas.",
      "E121 6: Did you mean 'say'?",
    ]);
  });

  it("iii: when block, takeoff drone(15m) and save as on its own line", () => {
    const source = lines(
      'robot drone = connect("field:drone-7")',
      "safety:",
      "    when drone.battery < 25%:",
      "        returnhome",
      "takeoff drone(15m)",
      "for point in route.roof_inspect:",
      "    move drone.base to point.at_height(10m)",
      "    capture drone.camera",
      '    save as "roof_{point.id}.jpg"',
      "land drone at places.launch_pad",
    );
    expect(problems(source)).toEqual([
      "E120 3: Write the action first, for example: return_home drone when drone.battery < 25%",
      "E120 5: Write: takeoff drone to 15m",
      'E120 8: Write it as: capture SENSOR save as "FILE"',
      "E120 9: 'save as' belongs to the capture above it. Put it on the same line, or indent it 4 more spaces.",
    ]);
  });

  it("iv: repeat for and cdeg", () => {
    const source = lines(
      'robot dog = connect("plant:quad-1")',
      "repeat for 30min:",
      "    for checkpoint in route.night_patrol:",
      "        move dog.base to checkpoint",
      '        if dog.sense("thermal").max > 80cdeg:',
      '            alert "Hot spot at {checkpoint.name}"',
      "    move dog.base to places.charger",
    );
    expect(problems(source)).toEqual([
      "E120 2: URITP has no 'repeat for'. Use repeat forever: with a check like 'if now() >= 30min: break'.",
      "E110 5: Did you mean 80deg_c?",
    ]);
  });

  it("vi: 5mms", () => {
    const source = lines(
      'robot welder = connect("line3:examplecorp-x7")',
      "else:",
      "    weld along seam speed 5mms current 180A",
    );
    expect(problems(source)).toContain("E110 3: Did you mean 5mm/s?");
  });
});
