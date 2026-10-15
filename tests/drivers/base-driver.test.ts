// Tests the shared simulated driver with a plain test driver: the task lifecycle, refusals, exact
// motion on the program's clock, finding objects, safety at run time, and STOP.
import { describe, expect, it } from "vitest";
import type { RobotModel } from "../../src/checker/robot-model.js";
import { formatInstruction, instruction, num, text, word, type FieldValue, type Instruction } from "../../src/codegen/instruction.js";
import { realClock } from "../../src/runtime/clock.js";
import { lifecycleProblem, runTask } from "../../src/runtime/robot-port.js";
import { SimulatedDriver, type DriverOptions } from "../../drivers/shared/base-driver.js";

/** A driver that writes each instruction as it is, so the shared behaviour can be tested alone. */
class TestDriver extends SimulatedDriver {
  constructor(options: DriverOptions) {
    super(options, { stoppingTime: 0.5, repeatability: 0.0001 });
  }
  protected translate(instr: Instruction): string[] {
    return [formatInstruction(instr)];
  }
  protected stopLine(): string {
    return "HALT";
  }
}

const ROVER: RobotModel = {
  name: "Test rover",
  frames: { base: { type: "pose2d", maxSpeed: { value: 0.5, unit: "m/s" } } },
  actuators: { tray: { states: ["empty", "loaded"] } },
  sensors: { camera: { kind: "rgb", dimension: null }, distance_front: { kind: "ultrasonic", dimension: "Length" } },
  profiles: ["core", "navigation", "vision"],
  extensions: {},
  safety: { maxSpeed: { value: 0.4, unit: "m/s" }, forbiddenZones: [{ kind: "named", name: "stairs" }] },
};
const STAIRS = [{ x: 4, y: -1 }, { x: 5, y: -1 }, { x: 5, y: 1 }, { x: 4, y: 1 }];
const pose = (x: number, y: number): FieldValue => ({ kind: "pose", pose: { x, y, z: 0, roll: 0, pitch: 0, yaw: 0 } });

function driver(simulator: DriverOptions["simulator"] = {}) {
  const clock = realClock({ speed: 1000 });
  return { clock, robot: new TestDriver({ model: ROVER, zones: { stairs: STAIRS }, simulator, clock }) };
}

describe("simulated driver", () => {
  it("follows the task lifecycle and records each line it sends", async () => {
    const { robot } = driver();
    const outcome = await runTask(robot, instruction("MOVE", { frame: word("base"), target: pose(2, 0) }));
    expect(outcome.state).toBe("succeeded");
    expect(lifecycleProblem(outcome.states)).toBeNull();
    expect(robot.transport.lines).toEqual(["MOVE frame=base target=pose(2,0,0,0,0,0)"]);
    expect(robot.world.pose("base")).toMatchObject({ x: 2, y: 0 });
  });

  it("takes distance divided by speed on the program's clock", async () => {
    const { robot, clock } = driver();
    const start = clock.now();
    await runTask(robot, instruction("DRIVE", { frame: word("base"), distance: num(3), speed: num(0.3) }));
    expect(clock.now() - start).toBeGreaterThanOrEqual(9.9);
  });

  it("refuses straight away, without accepting, and sends nothing", async () => {
    const { robot } = driver();
    const outcome = await runTask(robot, instruction("DRIVE", { frame: word("base"), distance: num(1), speed: num(2) }));
    expect(outcome).toMatchObject({ state: "failed", rejected: true });
    expect(outcome.reason).toMatch(/^E502/);
    expect(robot.transport.lines).toEqual([]);
  });

  it("refuses to start without the corners of a zone its manifest forbids", () => {
    expect(() => new TestDriver({ model: ROVER })).toThrow("the manifest forbids zone 'stairs'");
  });

  it("finds a known object and fails to find an unknown one", async () => {
    const { robot } = driver({ objects: { cup: { pose: { x: 1, y: 1, z: 0.8, roll: 0, pitch: 0, yaw: 0 } } } });
    const found = await runTask(robot, instruction("MOVE", { frame: word("base"), target: { kind: "object", name: "cup", helpers: [] } }));
    expect(found.state).toBe("succeeded");
    expect(robot.world.pose("base")).toMatchObject({ x: 1, y: 1, z: 0 });
    const lost = await runTask(robot, instruction("MOVE", { frame: word("base"), target: { kind: "object", name: "mug", helpers: [] } }));
    expect(lost).toMatchObject({ state: "failed", reason: "could not find 'mug'", rejected: false });
  });

  it("fails when an object turns out to be in a forbidden zone (§9.3 rule 6)", async () => {
    const { robot } = driver({ objects: { box: { pose: { x: 4.5, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 } } } });
    const outcome = await runTask(robot, instruction("MOVE", { frame: word("base"), target: { kind: "object", name: "box", helpers: [] } }));
    expect(outcome.reason).toMatch(/^E501/);
  });

  it("never takes a different path: a straight line through a zone fails", async () => {
    const { robot } = driver();
    const outcome = await runTask(robot, instruction("MOVE", { frame: word("base"), target: pose(8, 0) }));
    expect(outcome).toMatchObject({ state: "failed", reason: "no straight path to the target stays out of zone 'stairs'" });
    const around = await runTask(robot, instruction("MOVE", { frame: word("base"), target: pose(8, 3), via: { kind: "list", items: [pose(0, 3)] } }));
    expect(around.state).toBe("succeeded");
  });

  it("answers SENSE from the simulated world", async () => {
    let distance = 1.5;
    const { robot } = driver({ readings: { distance_front: () => (distance -= 0.5) }, battery: 0.8 });
    expect((await runTask(robot, instruction("SENSE", { sensor: word("distance_front") }))).output).toEqual({ kind: "reading", value: 1 });
    expect((await runTask(robot, instruction("SENSE", { sensor: word("battery") }))).output).toEqual({ kind: "reading", value: 0.8 });
    expect((await runTask(robot, instruction("SENSE", { sensor: word("tray.loaded") }))).output).toEqual({ kind: "reading", value: false });
  });

  it("saves a photo for capture", async () => {
    const { robot } = driver();
    await runTask(robot, instruction("SENSE", { sensor: word("camera"), save: text("roof.jpg") }));
    expect(robot.world.photos).toEqual(["roof.jpg"]);
  });

  it("obeys STOP from any state, within its stopping time (§9.3 rule 5)", async () => {
    // Real time here: the stopping time is in real seconds, and a fast clock would magnify any delay.
    const clock = realClock();
    const robot = new TestDriver({ model: ROVER, zones: { stairs: STAIRS }, clock });
    const task = runTask(robot, instruction("DRIVE", { frame: word("base"), direction: word("forward") }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const before = clock.now();
    await robot.stop();
    const outcome = await task;
    expect(outcome.state).toBe("cancelled");
    expect(lifecycleProblem(outcome.states)).toBeNull();
    expect(clock.now() - before).toBeLessThanOrEqual(robot.info.stoppingTime);
    expect(robot.transport.lines).toContain("HALT");
  });

  it("is always in simulator mode", () => {
    expect(driver().robot.info.mode).toBe("simulator");
  });
});
