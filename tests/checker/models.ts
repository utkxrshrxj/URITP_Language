// Small made-up robot models for checker tests: a rover, an arm, a drone, a humanoid and a dog.
// They belong to no company; real manifests arrive in Phase 4.
import type { CheckOptions } from "../../src/checker/checker.js";
import type { RobotModel } from "../../src/checker/robot-model.js";

const model = (name: string, parts: Partial<RobotModel>): RobotModel => ({
  name,
  frames: {},
  actuators: {},
  sensors: {},
  profiles: ["core"],
  extensions: {},
  ...parts,
});

export const MODELS: Readonly<Record<string, RobotModel>> = {
  rover: model("Test rover", {
    frames: { base: { type: "pose2d" } },
    actuators: { tray: { states: ["empty", "loaded"] } },
    sensors: {
      distance_front: { kind: "distance", dimension: "Length" },
      camera: { kind: "rgb", dimension: null },
    },
    profiles: ["core", "navigation", "speech", "vision"],
  }),
  arm: model("Test arm", {
    frames: { tool: { type: "pose6d" } },
    actuators: { gripper: { states: ["open", "closed"] } },
    sensors: { camera: { kind: "rgb", dimension: null }, force: { kind: "wrench", dimension: "Force" } },
    profiles: ["core", "manipulation", "vision"],
  }),
  drone: model("Test drone", {
    frames: { base: { type: "pose6d" } },
    sensors: { camera: { kind: "rgb", dimension: null } },
    profiles: ["core", "flight", "vision"],
  }),
  helper: model("Test humanoid", {
    frames: { base: { type: "pose2d" }, left_hand: { type: "pose6d" }, right_hand: { type: "pose6d" } },
    actuators: { left_hand: { states: ["open", "closed"] }, right_hand: { states: ["open", "closed"] } },
    profiles: ["core", "navigation", "legged", "manipulation", "speech"],
  }),
  dog: model("Test quadruped", {
    frames: { base: { type: "pose2d" } },
    sensors: { thermal: { kind: "thermal", dimension: "Temperature" }, camera: { kind: "rgb", dimension: null } },
    profiles: ["core", "navigation", "legged", "vision"],
  }),
  welder: model("Test welding arm", {
    frames: { tool: { type: "pose6d" } },
    profiles: ["core", "manipulation", "tooling"],
    extensions: { "examplecorp.adaptive_weld": { params: [{ name: "seam", type: "Route" }, { name: "current", type: "Quantity<Current>" }] } },
  }),
};

/** Check options that give each test robot its model by its program name. */
export const WITH_TEST_ROBOTS: CheckOptions = { robots: (name) => MODELS[name] };
