// Tests what every driver refuses before doing anything (Guidebook §9.3 rules 4 and 6): missing
// profiles and parts, speeds and forces over the limits, unreachable targets and forbidden zones.
import { describe, expect, it } from "vitest";
import type { RobotModel } from "../../src/checker/robot-model.js";
import { instruction, num, text, word, type FieldValue } from "../../src/codegen/instruction.js";
import { checkInstruction, refusalText } from "../../drivers/shared/checks.js";
import type { DriverInfo } from "../../drivers/shared/driver.js";

const ARM: RobotModel = {
  name: "Test arm",
  frames: { tool: { type: "pose6d", reach: { value: 850, unit: "mm" }, maxSpeed: { value: 1, unit: "m/s" } } },
  actuators: { gripper: { states: ["open", "closed"], maxForce: { value: 100, unit: "N" } } },
  sensors: { force: { kind: "wrench", dimension: "Force" } },
  profiles: ["core", "manipulation"],
  extensions: {},
  safety: { maxSpeed: { value: 0.25, unit: "m/s" }, forbiddenZones: [{ kind: "named", name: "operator" }] },
};
const ROVER: RobotModel = {
  name: "Test rover",
  frames: { base: { type: "pose2d", maxSpeed: { value: 0.5, unit: "m/s" } } },
  actuators: {},
  sensors: { camera: { kind: "rgb", dimension: null }, distance_front: { kind: "ultrasonic", dimension: "Length" } },
  profiles: ["core", "navigation", "vision"],
  extensions: {},
  safety: { maxSpeed: { value: 0.3, unit: "m/s" }, forbiddenZones: [] },
};
const info = (model: RobotModel): DriverInfo => ({
  mode: "simulator",
  model,
  stoppingTime: 0.5,
  repeatability: 0.0001,
  zones: { operator: [{ x: -1, y: -1 }, { x: -0.5, y: -1 }, { x: -0.5, y: 1 }, { x: -1, y: 1 }] },
});
const pose = (x: number, y: number, z: number, roll = 0): FieldValue => ({ kind: "pose", pose: { x, y, z, roll, pitch: 0, yaw: 0 } });

function refusal(model: RobotModel, ...args: Parameters<typeof instruction>): string | null {
  const result = checkInstruction(info(model), instruction(...args));
  return result === null ? null : refusalText(result);
}

describe("checkInstruction", () => {
  it("accepts what the robot can do exactly", () => {
    expect(refusal(ARM, "MOVE", { frame: word("tool"), target: pose(0.4, 0, 0.3), speed: num(0.2) })).toBeNull();
    expect(refusal(ARM, "ACTUATE", { actuator: word("gripper"), state: word("closed"), force: num(40) })).toBeNull();
    expect(refusal(ROVER, "DRIVE", { frame: word("base"), distance: num(1) })).toBeNull();
    expect(refusal(ROVER, "SENSE", { sensor: word("camera"), save: text("a.jpg") })).toBeNull();
    expect(refusal(ROVER, "SENSE", { sensor: word("cup.pose") })).toBeNull();
  });

  it("refuses a speed over the safety limit, as the Guidebook's E502", () => {
    expect(refusal(ARM, "MOVE", { frame: word("tool"), target: pose(0.4, 0, 0.3), speed: num(3) })).toBe(
      "E502 speed 3m/s exceeds safety limit 0.25m/s for 'Test arm'",
    );
  });

  it("refuses what needs a profile the robot lacks", () => {
    expect(refusal(ARM, "DRIVE", { frame: word("tool"), distance: num(1) })).toBe(
      "E401 'drive' requires profile 'navigation'; Test arm supports [core, manipulation]",
    );
    expect(refusal(ARM, "SAY", { text: text("hi") })).toMatch(/^E401 'say' requires profile 'speech'/);
    expect(refusal(ARM, "SKILL", { name: word("takeoff"), height: num(2) })).toMatch(/^E401 'takeoff'/);
  });

  it("refuses parts the robot does not have", () => {
    expect(refusal(ROVER, "MOVE", { frame: word("tool"), target: pose(1, 1, 0) })).toBe("E409 'Test rover' has no frame 'tool'");
    expect(refusal(ARM, "SENSE", { sensor: word("lidar") })).toBe("E409 'Test arm' has no sensor 'lidar'");
  });

  it("refuses a target beyond the arm's reach (E421)", () => {
    expect(refusal(ARM, "MOVE", { frame: word("tool"), target: pose(1.2, 0, 0) })).toBe(
      "E421 the target is 1.2m away, beyond the reach of frame 'tool' of 'Test arm' (850mm)",
    );
  });

  it("refuses a floor target that is lifted or tilted for a rover (E422)", () => {
    expect(refusal(ROVER, "MOVE", { frame: word("base"), target: pose(1, 1, 0.5) })).toMatch(/^E422/);
    expect(refusal(ROVER, "MOVE", { frame: word("base"), target: pose(1, 1, 0, Math.PI) })).toMatch(/^E422/);
  });

  it("refuses a target inside a forbidden zone, even if the checker missed it (§9.3 rule 6)", () => {
    expect(refusal(ARM, "MOVE", { frame: word("tool"), target: pose(-0.7, 0, 0.2) })).toBe(
      "E501 this target is inside the forbidden zone 'operator' of 'Test arm'",
    );
  });

  it("refuses a tolerance finer than the robot can keep (E423)", () => {
    expect(refusal(ARM, "MOVE", { frame: word("tool"), target: pose(0.4, 0, 0.3), tolerance: num(0.00001) })).toMatch(/^E423/);
  });

  it("refuses a grip state, force or extension that does not exist", () => {
    expect(refusal(ARM, "ACTUATE", { actuator: word("gripper"), state: word("half") })).toMatch(/^E408/);
    expect(refusal(ARM, "ACTUATE", { actuator: word("gripper"), state: word("closed"), force: num(150) })).toMatch(/^E407/);
    expect(refusal(ARM, "EXT", { name: word("acme.cut") })).toBe("E402 no connected robot has the extension 'acme.cut'");
    expect(refusal(ARM, "NATIVE", { language: text("urscript"), code: text("x") })).toMatch(/^E405/);
  });

  it("finds objects only with vision or manipulation (D39)", () => {
    const cart: RobotModel = { ...ROVER, profiles: ["core", "navigation"] };
    const cup: FieldValue = { kind: "object", name: "cup", helpers: [] };
    expect(refusal(ARM, "SENSE", { sensor: word("cup.fill") })).toBeNull();
    expect(refusal(ROVER, "MOVE", { frame: word("base"), target: cup })).toBeNull();
    expect(refusal(cart, "SENSE", { sensor: word("cup.fill") })).toMatch(/^E401 'finding objects' requires profile 'vision or manipulation'/);
    expect(refusal(cart, "MOVE", { frame: word("base"), target: cup })).toMatch(/^E401 'finding objects'/);
  });

  it("always accepts STOP, WAIT and STATUS", () => {
    for (const name of ["STOP", "WAIT", "STATUS"] as const) expect(refusal(ARM, name)).toBeNull();
  });
});
