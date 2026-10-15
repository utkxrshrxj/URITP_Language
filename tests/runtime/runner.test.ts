// Tests running programs: the instructions each robot receives (in SI units), loops, conditions,
// tasks, waits, on fail with R7xx errors, STOP, confirm, parallel blocks and extensions.
import { describe, expect, it } from "vitest";
import { motions, reading, type Response } from "./fake-robot.js";
import { lines, run } from "./run-helpers.js";

const ok = (): Response => ({});
const SITE = lines(
  "define place dock = pose(0.5m, 0.5m, 0m)",
  "define place lab = pose(5m, 2m, 0m, yaw=90deg)",
  "define route patrol = [places.dock, places.lab]",
);

const EXAMPLE_I = lines(
  'robot arm = connect("sim:panda")',
  "task pick_and_place(obj, dest):",
  "    move arm.tool to obj.above(10cm)",
  "    grip arm.gripper close",
  "    move arm.tool to dest.above(10cm) speed 0.2m/s",
  "    grip arm.gripper open",
  "    on fail:",
  '        say "I couldn\'t complete that"',
  "pick_and_place(cup, tray)",
);

describe("instructions in SI units (§9.2)", () => {
  it("runs example i and sends the arm only instructions", async () => {
    const { result, robots } = await run(EXAMPLE_I, { robots: { arm: ok } });
    expect(result.state).toBe("succeeded");
    expect(robots["arm"]!.sent).toEqual([
      "MOVE frame=tool target=cup.above(0.1)",
      "ACTUATE actuator=gripper state=closed",
      "MOVE frame=tool target=tray.above(0.1) speed=0.2",
      "ACTUATE actuator=gripper state=open",
    ]);
    expect(result.trace.filter((t) => t.kind === "instruction").every((t) => t.kind === "instruction" && t.state === "succeeded")).toBe(true);
  });

  it("sends places as poses and works out helpers in metres and radians", async () => {
    const source = lines('robot rover = connect("x")', "move rover.base to places.lab.offset(1m, 0m, 0m) speed 50cm/s", "turn rover.base by 90deg");
    const { robots } = await run(source, { robots: { rover: ok }, site: SITE });
    expect(robots["rover"]!.sent).toEqual([
      "MOVE frame=base target=pose(6,2,0,0,0,1.57079632679) speed=0.5",
      "TURN frame=base angle=1.57079632679",
    ]);
  });
});

describe("loops, conditions and variables", () => {
  it("runs a for loop over a route and fills in text", async () => {
    const source = lines('robot rover = connect("x")', "for p in route.patrol:", "    move rover.base to p", '    say "At {p.name}"');
    const { robots } = await run(source, { robots: { rover: ok }, site: SITE });
    expect(robots["rover"]!.sent).toEqual([
      "MOVE frame=base target=pose(0.5,0.5,0,0,0,0)",
      'SAY text="At dock"',
      "MOVE frame=base target=pose(5,2,0,0,0,1.57079632679)",
      'SAY text="At lab"',
    ]);
  });

  it("repeats a number of times and leaves a loop with break", async () => {
    const source = lines('robot rover = connect("x")', "let gap = 10cm", "repeat 5 times:", "    drive rover.base forward by gap", '    if rover.sense("distance_front").value < 20cm:', "        break");
    let distance = 0.5;
    const { robots } = await run(source, {
      robots: {
        rover: (line) => {
          if (!line.startsWith("SENSE")) return {};
          distance -= 0.1;
          return reading(distance);
        },
      },
    });
    expect(motions(robots["rover"]!)).toEqual(Array(4).fill("DRIVE frame=base distance=0.1"));
  });

  it("uses a reading to decide, as in example iv", async () => {
    const source = lines('robot dog = connect("x")', 'if dog.sense("thermal").max > 80deg_c:', '    alert "Hot spot"', 'else:', '    log "All fine"');
    const hot = await run(source, { robots: { dog: () => ({ output: { kind: "reading", value: 60, max: 95 } }) } });
    expect(hot.alerts).toEqual(["Hot spot"]);
    const cool = await run(source, { robots: { dog: () => ({ output: { kind: "reading", value: 60, max: 70 } }) } });
    expect(cool.logs).toEqual(["All fine"]);
  });

  it("runs tasks with parameters and return values", async () => {
    const source = lines('robot rover = connect("x")', "task half(d):", "    return d - 1cm", "drive rover.base forward by half(21cm)");
    const { robots } = await run(source, { robots: { rover: ok } });
    expect(robots["rover"]!.sent).toEqual(["DRIVE frame=base distance=0.2"]);
  });

  it("stops repeat forever after 30 minutes, as example iv now does", async () => {
    const source = lines('robot rover = connect("x")', "repeat forever:", "    wait 10min", "    if now() >= 30min:", "        break");
    const { result, robots } = await run(source, { robots: { rover: (line) => ({ duration: line.startsWith("WAIT") ? 600 : 0 }) } });
    expect(result.state).toBe("succeeded");
    expect(robots["rover"]!.sent).toEqual(Array(3).fill("WAIT duration=600"));
  });
});

describe("waiting (D32)", () => {
  it("sends wait as WAIT when one robot is connected", async () => {
    const { robots } = await run(lines('robot rover = connect("x")', "wait 2min"), { robots: { rover: ok } });
    expect(robots["rover"]!.sent).toEqual(["WAIT duration=120"]);
  });

  it("waits in the runner when several robots are connected", async () => {
    const { robots } = await run(lines('robot rover = connect("x")', 'robot arm = connect("y")', "wait 1s"), { robots: { rover: ok, arm: ok } });
    expect(robots["rover"]!.sent).toEqual([]);
    expect(robots["arm"]!.sent).toEqual([]);
  });

  it("checks wait until again and again until it is true", async () => {
    let checks = 0;
    const source = lines('robot rover = connect("x")', "wait until rover.tray.loaded timeout 2min", "drive rover.base forward by 1m");
    const { result, robots } = await run(source, { robots: { rover: (line) => (line === "SENSE sensor=tray.loaded" ? reading(++checks >= 3) : {}) } });
    expect(result.state).toBe("succeeded");
    expect(robots["rover"]!.sent).toEqual([...Array(3).fill("SENSE sensor=tray.loaded"), "DRIVE frame=base distance=1"]);
  });

  it("fails with R702 when the timeout passes", async () => {
    const source = lines('robot rover = connect("x")', "wait until rover.tray.loaded timeout 2s");
    const { result } = await run(source, { robots: { rover: () => reading(false) } });
    expect(result).toMatchObject({ state: "failed", error: { code: "R702", line: 2 } });
  });
});

describe("failures and on fail (Guidebook §8, D15)", () => {
  const source = lines(
    'robot rover = connect("office:rover-2")',
    "move rover.base to places.lab",
    "move rover.base to places.dock",
    "on fail:",
    "    log error.code, error.reason",
    '    say "I could not reach the lab: {error.reason}"',
  );
  const blocked = (line: string): Response => (line.includes("pose(5,") ? { fail: "path blocked at places.corridor_2" } : {});

  it("runs on fail with error.code and error.reason, skipping the rest of the block", async () => {
    const { result, robots, logs } = await run(source, { robots: { rover: blocked }, site: SITE });
    expect(result.state).toBe("succeeded");
    expect(logs).toEqual(["R703, move failed: path blocked at places.corridor_2"]);
    expect(robots["rover"]!.sent).toEqual([
      "MOVE frame=base target=pose(5,2,0,0,0,1.57079632679)",
      'SAY text="I could not reach the lab: move failed: path blocked at places.corridor_2"',
    ]);
  });

  it("stops the robots and fails the program when nothing handles the failure", async () => {
    const { result, robots } = await run(lines('robot rover = connect("x")', "move rover.base to places.lab"), { robots: { rover: blocked }, site: SITE });
    expect(result).toMatchObject({ state: "failed", error: { code: "R703", reason: "move failed: path blocked at places.corridor_2", line: 2 } });
    expect(robots["rover"]!.stops).toBe(1);
  });

  it("gives R701 when the robot refuses an instruction", async () => {
    const { result } = await run(lines('robot rover = connect("x")', "turn rover.base by 90deg"), { robots: { rover: () => ({ reject: "E401 cannot turn" }) } });
    expect(result.error).toMatchObject({ code: "R701", reason: "turn was refused by 'rover': E401 cannot turn" });
  });

  it("gives R704 when the robot breaks the task lifecycle", async () => {
    const { result } = await run(lines('robot rover = connect("x")', "turn rover.base by 90deg"), { robots: { rover: () => ({ brokenLifecycle: true }) } });
    expect(result.error?.code).toBe("R704");
  });

  it("passes a failure in on fail out to the next block", async () => {
    const nested = lines('robot rover = connect("x")', "if true:", "    turn rover.base by 1deg", "    on fail:", "        turn rover.base by 2deg", 'log "after"', "on fail:", '    log "outer {error.code}"');
    const { logs } = await run(nested, { robots: { rover: () => ({ fail: "stuck" }) } });
    expect(logs).toEqual(["outer R703"]);
  });
});

describe("STOP (Guidebook §5, §9.3 rule 5, D15)", () => {
  it("lets the program go on after its own stop statement", async () => {
    const source = lines(
      'robot rover = connect("x")',
      'robot arm = connect("y")',
      "parallel:",
      "    drive rover.base forward",
      "    if true:",
      "        wait 1s",
      "        stop rover",
      'log "after"',
    );
    const { result, logs, robots } = await run(source, { robots: { rover: () => ({ hang: true }), arm: ok } });
    expect(result.state).toBe("succeeded");
    expect(logs).toEqual(["after"]);
    expect(robots["rover"]!.sent).toEqual(["DRIVE frame=base direction=forward"]);
  });

  it("cancels the whole program on an emergency stop from outside", async () => {
    const source = lines('robot rover = connect("x")', "drive rover.base forward by 10m", 'log "never"');
    const { result, robots, logs } = await run(source, {
      robots: { rover: () => ({ duration: 60 }) },
      whileRunning: async (runner) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        await runner.stop("emergency stop button");
      },
    });
    expect(result).toMatchObject({ state: "cancelled", reason: "emergency stop button", error: null });
    expect(robots["rover"]!.stops).toBe(1);
    expect(logs).toEqual([]);
  });

  it("does not let on fail run after a cancel", async () => {
    const source = lines('robot rover = connect("x")', "drive rover.base forward by 10m", "on fail:", '    log "on fail ran"');
    const { result, logs } = await run(source, {
      robots: { rover: () => ({ duration: 60 }) },
      whileRunning: async (runner) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        await runner.stop();
      },
    });
    expect(result.state).toBe("cancelled");
    expect(logs).toEqual([]);
  });
});

describe("talking to people", () => {
  it("cancels the program when the answer to confirm is no", async () => {
    const source = lines('robot rover = connect("x")', 'confirm "Shall I go?"', "drive rover.base forward by 1m");
    const { result, robots } = await run(source, { robots: { rover: (line) => (line.startsWith("CONFIRM") ? { output: { kind: "confirmed", yes: false } } : {}) } });
    expect(result.state).toBe("cancelled");
    expect(motions(robots["rover"]!)).toEqual(['CONFIRM text="Shall I go?"']);
  });

  it("goes on when the answer is yes, and uses an answer from ask", async () => {
    const source = lines('robot rover = connect("x")', 'confirm "Shall I go?" lang hi', 'let name = ask "Who is it for?"', 'say "Parcel for {name}"');
    const { robots } = await run(source, {
      robots: {
        rover: (line) =>
          line.startsWith("CONFIRM") ? { output: { kind: "confirmed", yes: true } } : line.startsWith("ASK") ? { output: { kind: "answer", text: "Asha" } } : {},
      },
    });
    expect(robots["rover"]!.sent).toEqual(['CONFIRM text="Shall I go?" lang=hi', 'ASK text="Who is it for?"', 'SAY text="Parcel for Asha"']);
  });
});

describe("parallel (D33)", () => {
  it("runs statements at the same time", async () => {
    const source = lines('robot rover = connect("x")', 'robot arm = connect("y")', "parallel:", "    drive rover.base forward by 1m", "    grip arm.gripper open");
    const { result, robots } = await run(source, { robots: { rover: () => ({ duration: 1 }), arm: () => ({ duration: 1 }) } });
    expect(result.state).toBe("succeeded");
    expect(robots["rover"]!.sent).toHaveLength(1);
    expect(robots["arm"]!.sent).toHaveLength(1);
  });

  it("stops the other parts when one fails, then fails", async () => {
    const source = lines('robot rover = connect("x")', 'robot arm = connect("y")', "parallel:", "    drive rover.base forward by 5m", "    grip arm.gripper open");
    const { result, robots } = await run(source, { robots: { rover: () => ({ hang: true }), arm: () => ({ fail: "jammed" }) } });
    expect(result.error).toMatchObject({ code: "R703", reason: "actuate failed: jammed" });
    expect(robots["rover"]!.stops).toBeGreaterThanOrEqual(1);
  });
});

describe("more instructions", () => {
  it("captures a photo with SENSE ... save (D36)", async () => {
    const source = lines('robot drone = connect("x")', "for point in route.patrol:", '    capture drone.camera save as "roof_{point.name}.jpg"');
    const { robots } = await run(source, { robots: { drone: ok }, site: SITE });
    expect(robots["drone"]!.sent).toEqual(['SENSE sensor=camera save="roof_dock.jpg"', 'SENSE sensor=camera save="roof_lab.jpg"']);
  });

  it("sends a vendor extension as EXT with the manifest's parameter names", async () => {
    const source = lines(
      'robot welder = connect("x")',
      'if welder.has("examplecorp.adaptive_weld"):',
      "    examplecorp.adaptive_weld(route.seam, current=180A)",
      "else:",
      "    weld along route.seam speed 5mm/s current 180A",
    );
    const { robots } = await run(source, { robots: { welder: ok }, site: "define route seam = [pose(0m, 0m, 0m), pose(1m, 0m, 0m)]" });
    expect(robots["welder"]!.sent).toEqual(["EXT name=examplecorp.adaptive_weld seam=[pose(0,0,0,0,0,0),pose(1,0,0,0,0,0)] current=180"]);
  });

  it("pours until a condition the robot checks itself, with SI numbers (D36)", async () => {
    const source = lines('robot helper = connect("x")', "pour from kettle into mug until mug.fill >= 80%");
    const { robots } = await run(source, { robots: { helper: ok } });
    expect(robots["helper"]!.sent).toEqual(["SKILL name=pour from=kettle into=mug until=mug.fill>=0.8"]);
  });

  it("takes off and lands, as in example iii", async () => {
    const source = lines('robot drone = connect("x")', "takeoff drone to 15m", "land drone at places.dock");
    const { robots } = await run(source, { robots: { drone: ok }, site: SITE });
    expect(robots["drone"]!.sent).toEqual(["SKILL name=takeoff height=15", "SKILL name=land at=pose(0.5,0.5,0,0,0,0)"]);
  });
});
