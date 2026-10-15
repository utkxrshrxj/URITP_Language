// A simulated world for one robot: where its frames are, its gripper states, its battery and the
// objects it can find. Every instruction is carried out exactly, never "close enough".

import type { Corner } from "../../src/checker/robot-model.js";
import { applyHelper } from "../../src/codegen/fields.js";
import { field, type FieldValue, type Instruction, type PoseSI } from "../../src/codegen/instruction.js";
import type { TaskOutput } from "../../src/runtime/robot-port.js";
import { toSI } from "../../src/stdlib/quantity.js";
import { checkTarget, forbiddenZones, refusalText } from "./checks.js";
import type { DriverInfo } from "./driver.js";
import { crossesZone, pathLength } from "./paths.js";

/** An object the simulated robot can find, with its position and properties. */
export interface SimulatedObject {
  readonly pose: PoseSI;
  /** How full it is, from 0 to 1 (D14). */
  readonly fill?: number;
  readonly id?: string;
}

export type SimulatedReading = number | boolean | string;

export interface SimulatorSettings {
  /** Where each frame starts. Frames not listed start at the origin. */
  readonly start?: Readonly<Record<string, PoseSI>>;
  /** Objects the robot can find. Any other object cannot be found, and the task fails. */
  readonly objects?: Readonly<Record<string, SimulatedObject>>;
  /** What each sensor reads, in SI units; a function is asked again for every reading. */
  readonly readings?: Readonly<Record<string, SimulatedReading | (() => SimulatedReading)>>;
  /** The battery level from 0 to 1, and how much it drops per metre moved. */
  readonly battery?: number;
  readonly batteryDrainPerMetre?: number;
  /** What a person answers to CONFIRM and ASK. */
  readonly answers?: { readonly confirm?: boolean; readonly ask?: string };
  /** Speeds used when an instruction gives none: metres and radians per second. */
  readonly defaultSpeed?: number;
  readonly defaultTurnSpeed?: number;
  /** Seconds a skill, gripper move or speech takes on its own. */
  readonly actionTime?: number;
}

/** What carrying out one instruction will do, worked out before it starts. */
export interface Plan {
  /** Seconds it takes on the program's clock; Infinity means until stopped. */
  readonly duration: number;
  /** Set if the task fails while running, with the reason. */
  readonly failure?: string;
  readonly output?: TaskOutput;
  /** The exact pose the frame will end at, when the instruction moves one. */
  readonly target?: PoseSI;
  /** Makes the result true in the world once the task has finished. */
  readonly apply: () => void;
}

const ORIGIN: PoseSI = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 };
const nothing = (): void => {};
const numberOf = (value: FieldValue | undefined): number | null => (value?.kind === "number" ? value.value : null);
const wordOf = (value: FieldValue | undefined): string => (value?.kind === "word" ? value.value : "");

export class SimulatedWorld {
  private readonly poses = new Map<string, PoseSI>();
  private readonly states = new Map<string, string>();
  private readonly objects = new Map<string, SimulatedObject>();
  private battery: number;
  /** Files saved by capture, and everything said, for tests and logs. */
  readonly photos: string[] = [];
  readonly spoken: string[] = [];

  constructor(
    private readonly info: DriverInfo,
    private readonly settings: SimulatorSettings = {},
  ) {
    for (const frame of Object.keys(info.model.frames)) this.poses.set(frame, settings.start?.[frame] ?? ORIGIN);
    for (const [name, actuator] of Object.entries(info.model.actuators)) this.states.set(name, actuator.states[0] ?? "");
    for (const [name, object] of Object.entries(settings.objects ?? {})) this.objects.set(name, object);
    this.battery = settings.battery ?? 1;
  }

  /** Where a frame is now. */
  pose(frame: string): PoseSI {
    return this.poses.get(frame) ?? ORIGIN;
  }

  /** The state of an actuator now, like "closed". */
  state(actuator: string): string {
    return this.states.get(actuator) ?? "";
  }

  /** How full an object is now, from 0 to 1. */
  fill(object: string): number {
    return this.objects.get(object)?.fill ?? 0;
  }

  /** Works out what an instruction will do. It changes nothing until the plan is applied. */
  plan(instr: Instruction): Plan {
    const get = (key: string): FieldValue | undefined => field(instr, key);
    switch (instr.name) {
      case "MOVE":
        return this.planMove(wordOf(get("frame")), get("target"), numberOf(get("speed")), get("via"), get("avoid"));
      case "DRIVE":
        return this.planDrive(wordOf(get("frame")), numberOf(get("distance")), numberOf(get("speed")));
      case "TURN": {
        const frame = wordOf(get("frame"));
        const angle = numberOf(get("angle")) ?? 0;
        const speed = this.turnSpeedFor(numberOf(get("speed")));
        const start = this.pose(frame);
        return { duration: Math.abs(angle) / speed, apply: () => this.poses.set(frame, { ...start, yaw: start.yaw + angle }) };
      }
      case "ACTUATE": {
        const actuator = wordOf(get("actuator"));
        const state = wordOf(get("state"));
        return { duration: this.actionTime(), apply: () => this.states.set(actuator, state) };
      }
      case "SKILL":
        return this.planSkill(instr);
      case "SENSE":
        return this.planSense(wordOf(get("sensor")), get("save"), get("analyse"));
      case "SAY":
      case "CONFIRM":
      case "ASK": {
        const said = get("text")?.kind === "text" ? (get("text") as { value: string }).value : "";
        const output: TaskOutput | undefined =
          instr.name === "CONFIRM"
            ? { kind: "confirmed", yes: this.settings.answers?.confirm ?? true }
            : instr.name === "ASK"
              ? { kind: "answer", text: this.settings.answers?.ask ?? "" }
              : undefined;
        return { duration: this.actionTime(), ...(output === undefined ? {} : { output }), apply: () => this.spoken.push(said) };
      }
      case "WAIT":
        return { duration: numberOf(get("duration")) ?? 0, apply: nothing };
      case "EXT":
        return { duration: this.actionTime(), apply: nothing };
      case "STATUS":
        return { duration: 0, output: { kind: "reading", value: "idle" }, apply: nothing };
      default:
        return { duration: 0, apply: nothing };
    }
  }

  /** The turning speed to use, in radians per second: the one given, or the default. */
  turnSpeedFor(given: number | null): number {
    return given ?? this.settings.defaultTurnSpeed ?? 0.5;
  }

  private actionTime(): number {
    return this.settings.actionTime ?? 0.5;
  }

  /** The speed to use: the one given, or the default, never above the robot's limits. */
  speedFor(frame: string, given: number | null): number {
    if (given !== null) return given;
    const limits = [this.settings.defaultSpeed ?? 0.2];
    const frameLimit = this.info.model.frames[frame]?.maxSpeed;
    const safety = this.info.model.safety?.maxSpeed;
    if (frameLimit !== undefined) limits.push(toSI(frameLimit));
    if (safety !== undefined) limits.push(toSI(safety));
    return Math.min(...limits);
  }

  /** Finds a target: a pose as it is, or an object the robot can see, with its helpers applied. */
  private resolve(frame: string, target: FieldValue | undefined): { pose: PoseSI } | { failure: string } {
    if (target?.kind === "pose") return { pose: target.pose };
    if (target?.kind !== "object") return { failure: "the target is not a pose or an object" };
    const object = this.objects.get(target.name);
    if (object === undefined) return { failure: `could not find '${target.name}'` };
    let value: Parameters<typeof applyHelper>[0] = { kind: "pose", pose: object.pose };
    for (const helper of target.helpers) {
      const next = applyHelper(value, helper.name, helper.args);
      if (next === null) return { failure: `cannot work out .${helper.name} of '${target.name}'` };
      value = next;
    }
    const pose = value.kind === "pose" ? value.pose : object.pose;
    // A frame on the floor goes to where the object is on the floor plan.
    return this.info.model.frames[frame]?.type === "pose2d" ? { pose: { ...pose, z: 0, roll: 0, pitch: 0 } } : { pose };
  }

  /** The zones a path must stay out of: the ones the instruction avoids, and the forbidden ones. */
  private blockingZones(avoid: FieldValue | undefined): { name: string; corners: readonly Corner[] }[] {
    const zones = forbiddenZones(this.info);
    if (avoid?.kind === "list") {
      for (const item of avoid.items) if (item.kind === "zone") zones.push({ name: "", corners: item.corners });
    }
    return zones;
  }

  private planMove(frame: string, targetField: FieldValue | undefined, speed: number | null, via: FieldValue | undefined, avoid: FieldValue | undefined): Plan {
    const target = this.resolve(frame, targetField);
    if ("failure" in target) return { duration: 0, failure: target.failure, apply: nothing };
    // Safety is checked again with the real target, since an object's place is only known now (§9.3 rule 6).
    const problem = checkTarget(this.info, frame, target.pose);
    if (problem !== null) return { duration: 0, failure: refusalText(problem), apply: nothing };

    const start = this.pose(frame);
    const waypoints = via?.kind === "list" ? via.items.flatMap((i) => (i.kind === "pose" ? [i.pose] : [])) : [];
    const path = [start, ...waypoints, target.pose];
    if (this.info.model.frames[frame]?.type === "pose2d") {
      for (const zone of this.blockingZones(avoid)) {
        for (let i = 1; i < path.length; i++) {
          if (crossesZone(path[i - 1] as PoseSI, path[i] as PoseSI, zone.corners)) {
            const name = zone.name === "" ? "a zone to avoid" : `zone '${zone.name}'`;
            return { duration: 0, failure: `no straight path to the target stays out of ${name}`, apply: nothing };
          }
        }
      }
    }
    const length = pathLength(path);
    return {
      duration: length / this.speedFor(frame, speed),
      target: target.pose,
      apply: () => {
        this.poses.set(frame, target.pose);
        this.drain(length);
      },
    };
  }

  private planDrive(frame: string, distance: number | null, speed: number | null): Plan {
    const start = this.pose(frame);
    if (distance === null) return { duration: Infinity, apply: nothing }; // until stopped
    const end = { ...start, x: start.x + distance * Math.cos(start.yaw), y: start.y + distance * Math.sin(start.yaw) };
    for (const zone of forbiddenZones(this.info)) {
      if (crossesZone(start, end, zone.corners)) {
        return { duration: 0, failure: refusalText({ code: "E501", args: { zone: zone.name, robot: this.info.model.name } }), apply: nothing };
      }
    }
    return {
      duration: Math.abs(distance) / this.speedFor(frame, speed),
      target: end,
      apply: () => {
        this.poses.set(frame, end);
        this.drain(Math.abs(distance));
      },
    };
  }

  private planSkill(instr: Instruction): Plan {
    const get = (key: string): FieldValue | undefined => field(instr, key);
    const firstFrame = Object.keys(this.info.model.frames)[0] ?? "";
    const firstActuator = Object.keys(this.info.model.actuators)[0] ?? "";
    switch (wordOf(get("name"))) {
      case "pick":
      case "place": {
        const isPick = wordOf(get("name")) === "pick";
        const frame = isPick ? firstFrame : wordOf(get("frame")) || firstFrame;
        const move = this.planMove(frame, isPick ? get("object") : get("target"), null, undefined, undefined);
        if (move.failure !== undefined) return move;
        return {
          duration: move.duration + this.actionTime(),
          ...(move.target === undefined ? {} : { target: move.target }),
          apply: () => {
            move.apply();
            this.states.set(firstActuator, isPick ? "closed" : "open");
          },
        };
      }
      case "pour": {
        const until = get("until");
        const match = until?.kind === "condition" ? /^(\w+)\.fill>=?([\d.]+)$/.exec(until.text) : null;
        if (match === null) return { duration: 0, failure: "the simulator can only pour until OBJECT.fill reaches a level", apply: nothing };
        const [, object = "", level = "0"] = match;
        const found = this.objects.get(object);
        if (found === undefined) return { duration: 0, failure: `could not find '${object}'`, apply: nothing };
        return { duration: this.actionTime() * 4, apply: () => this.objects.set(object, { ...found, fill: Number(level) }) };
      }
      case "takeoff": {
        const height = numberOf(get("height")) ?? 0;
        const start = this.pose(firstFrame);
        return { duration: height / this.speedFor(firstFrame, null), apply: () => this.poses.set(firstFrame, { ...start, z: height }) };
      }
      case "land": {
        const at = get("at");
        const start = this.pose(firstFrame);
        const end = at?.kind === "pose" ? { ...at.pose, z: 0 } : { ...start, z: 0 };
        const length = pathLength([start, end]);
        return { duration: length / this.speedFor(firstFrame, null), target: end, apply: () => this.poses.set(firstFrame, end) };
      }
      case "return_home": {
        const home = this.settings.start?.[firstFrame] ?? ORIGIN;
        const length = pathLength([this.pose(firstFrame), home]);
        return { duration: length / this.speedFor(firstFrame, null), target: home, apply: () => this.poses.set(firstFrame, home) };
      }
      default:
        return { duration: this.actionTime(), apply: nothing };
    }
  }

  private planSense(sensor: string, save: FieldValue | undefined, analyse: FieldValue | undefined): Plan {
    const read = (value: SimulatedReading): Plan => ({ duration: 0.05, output: { kind: "reading", value }, apply: nothing });
    if (save?.kind === "text") {
      const file = save.value;
      return { duration: this.actionTime(), apply: () => this.photos.push(file) };
    }
    if (analyse?.kind === "object") {
      if (!this.objects.has(analyse.name)) return { duration: 0, failure: `could not find '${analyse.name}'`, apply: nothing };
      return { duration: this.actionTime(), output: { kind: "analysis", label: analyse.name, health: "not assessed in the simulator" }, apply: nothing };
    }
    const setting = this.settings.readings?.[sensor];
    if (setting !== undefined) return read(typeof setting === "function" ? setting() : setting);
    if (sensor === "battery") return read(this.battery);
    if (sensor === "state") return read("idle");
    const firstFrame = Object.keys(this.info.model.frames)[0] ?? "";
    if (sensor === "pose") return { duration: 0.05, output: { kind: "reading", value: this.pose(firstFrame) }, apply: nothing };
    const [owner = "", property = ""] = sensor.split(".");
    if (property !== "") {
      if (this.states.has(owner)) {
        const state = this.state(owner);
        return read(property === "holding" ? state === "closed" : state === property);
      }
      const object = this.objects.get(owner);
      if (object === undefined) return { duration: 0, failure: `could not find '${owner}'`, apply: nothing };
      if (property === "pose") return { duration: 0.05, output: { kind: "reading", value: object.pose }, apply: nothing };
      if (property === "fill") return read(object.fill ?? 0);
      if (property === "id") return read(object.id ?? owner);
      return { duration: 0, failure: `cannot read '${property}' of '${owner}'`, apply: nothing };
    }
    return read(0);
  }

  private drain(metres: number): void {
    this.battery = Math.max(0, this.battery - metres * (this.settings.batteryDrainPerMetre ?? 0));
  }
}
