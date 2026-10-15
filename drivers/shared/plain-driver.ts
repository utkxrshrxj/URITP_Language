// A simulated driver that names no robot maker: it writes each instruction exactly as Guidebook
// §9.2 does. The command line uses it for compile, and for robots with no company driver.

import { formatInstruction, type Instruction } from "../../src/codegen/instruction.js";
import { SimulatedDriver, type DriverOptions } from "./base-driver.js";
import type { Driver } from "./driver.js";

export class PlainSimulatedDriver extends SimulatedDriver {
  constructor(options: DriverOptions) {
    // Illustrative values for a robot nobody has measured.
    super(options, { stoppingTime: 0.5, repeatability: 0.001 });
  }

  protected translate(instr: Instruction): string[] {
    return [formatInstruction(instr)];
  }

  protected stopLine(): string {
    return "STOP";
  }
}

/** Every driver folder exports createDriver with this shape, so tools can find drivers by folder. */
export type CreateDriver = (options: DriverOptions) => Driver;

export const createDriver: CreateDriver = (options) => new PlainSimulatedDriver(options);
