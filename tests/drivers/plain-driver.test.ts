// Tests the plain simulated driver, which writes each instruction exactly as §9.2 does and is
// used by compile and for robots that have no company driver.
import { describe, expect, it } from "vitest";
import type { RobotModel } from "../../src/checker/robot-model.js";
import { instruction, num, word } from "../../src/codegen/instruction.js";
import { realClock } from "../../src/runtime/clock.js";
import { runTask } from "../../src/runtime/robot-port.js";
import { createDriver } from "../../drivers/shared/plain-driver.js";

const MODEL: RobotModel = {
  name: "Test rover",
  frames: { base: { type: "pose2d" } },
  actuators: {},
  sensors: {},
  profiles: ["core", "navigation"],
  extensions: {},
};

describe("plain simulated driver", () => {
  it("writes each instruction exactly as §9.2 does", async () => {
    const driver = createDriver({ model: MODEL, clock: realClock({ speed: 1000 }) });
    await runTask(driver, instruction("DRIVE", { frame: word("base"), distance: num(0.5), speed: num(0.2) }));
    await driver.stop();
    expect(driver.transport.lines).toEqual(["DRIVE frame=base distance=0.5 speed=0.2", "STOP"]);
    expect(driver.info.mode).toBe("simulator");
  });
});
