// The part of every simulated driver that is the same for all robots: refusing what it cannot do,
// reporting the task lifecycle, stopping at once, and keeping the simulated world up to date.
// A company driver only says how instructions are written in its robot's own language.

import type { Corner, RobotModel } from "../../src/checker/robot-model.js";
import type { Instruction } from "../../src/codegen/instruction.js";
import { CancelSignal, realClock, type Clock } from "../../src/runtime/clock.js";
import type { TaskUpdate } from "../../src/runtime/robot-port.js";
import { checkInstruction, refusalText, type Refusal } from "./checks.js";
import { RecordingTransport, type Driver, type DriverInfo, type Transport } from "./driver.js";
import { SimulatedWorld, type Plan, type SimulatorSettings } from "./simulator.js";

export interface DriverOptions {
  /** The robot's model, from its manifest. */
  readonly model: RobotModel;
  /** Corners of each forbidden zone the manifest names (zones.NAME), from the site map. */
  readonly zones?: Readonly<Record<string, readonly Corner[]>>;
  readonly simulator?: SimulatorSettings;
  readonly clock?: Clock;
  readonly transport?: Transport;
}

export abstract class SimulatedDriver implements Driver {
  readonly info: DriverInfo;
  readonly transport: Transport;
  readonly world: SimulatedWorld;
  protected readonly clock: Clock;
  /** One signal per task in progress, so STOP can cancel them all. */
  private readonly running = new Set<CancelSignal>();

  constructor(options: DriverOptions, limits: { readonly stoppingTime: number; readonly repeatability: number }) {
    const zones = options.zones ?? {};
    // A forbidden zone the driver cannot locate cannot be kept out of, so the driver will not start.
    for (const zone of options.model.safety?.forbiddenZones ?? []) {
      if (zone.kind === "named" && (zones[zone.name]?.length ?? 0) < 3) {
        throw new Error(`the manifest forbids zone '${zone.name}', so the driver needs its corners from the site map`);
      }
    }
    this.info = { mode: "simulator", model: options.model, zones, ...limits };
    this.transport = options.transport ?? new RecordingTransport();
    this.world = new SimulatedWorld(this.info, options.simulator);
    this.clock = options.clock ?? realClock();
  }

  /** The lines in the robot's own language that carry out an instruction. */
  protected abstract translate(instr: Instruction, plan: Plan): string[];

  /** The line in the robot's own language that stops all motion at once. */
  protected abstract stopLine(): string;

  /** Extra reasons this robot must refuse an instruction, beyond the shared ones. */
  protected companyCheck(_instr: Instruction): Refusal | null {
    return null;
  }

  async run(instr: Instruction, update: (u: TaskUpdate) => void): Promise<void> {
    // Refuse straight away what the robot cannot do exactly (§9.3 rule 4) or must not do (rule 6).
    const refusal = checkInstruction(this.info, instr) ?? this.companyCheck(instr);
    if (refusal !== null) {
      update({ state: "failed", reason: refusalText(refusal) });
      return;
    }
    update({ state: "accepted" });
    if (instr.name === "STOP") {
      update({ state: "running" });
      await this.stop();
      update({ state: "succeeded" });
      return;
    }
    const signal = new CancelSignal();
    this.running.add(signal);
    try {
      const plan = this.world.plan(instr);
      update({ state: "running" });
      if (plan.failure !== undefined) {
        update({ state: "failed", reason: plan.failure });
        return;
      }
      for (const line of this.translate(instr, plan)) await this.transport.send(line);
      await this.clock.sleep(plan.duration === Infinity ? 1e9 : plan.duration, signal);
      if (signal.cancelled) {
        update({ state: "cancelled", reason: "stopped" });
        return;
      }
      plan.apply();
      update(plan.output === undefined ? { state: "succeeded" } : { state: "succeeded", output: plan.output });
    } finally {
      this.running.delete(signal);
    }
  }

  /** STOP: halts all motion at once, from any state (§9.3 rule 5). */
  async stop(): Promise<void> {
    await this.transport.send(this.stopLine());
    for (const signal of this.running) signal.cancel("STOP");
  }
}
