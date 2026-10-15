// Company: Raspberry Pi
// Tests the simulated Raspberry Pi rover driver: its command messages, refusals, STOP, and a
// whole patrol program run from its manifest.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../../src/checker/manifest.js";
import { instruction, num, word } from "../../src/codegen/instruction.js";
import { realClock } from "../../src/runtime/clock.js";
import { lifecycleProblem, runTask } from "../../src/runtime/robot-port.js";
import { runProgram } from "../../src/runtime/run-program.js";
import { RaspberryPiDriver } from "./pi-driver.js";

const manifestSource = readFileSync(new URL("../../manifests/raspberry-pi/pi-rover.uritp", import.meta.url), "utf8");
const model = checkManifest(manifestSource).model!;
const lines = (...source: string[]): string => source.join("\n");
const pose = (x: number, y: number, z = 0) => ({ kind: "pose" as const, pose: { x, y, z, roll: 0, pitch: 0, yaw: 0 } });

function rover(readings: Record<string, number> = {}) {
  const clock = realClock({ speed: 1000 });
  return { clock, driver: new RaspberryPiDriver({ model, clock, simulator: { readings } }) };
}

describe("Raspberry Pi rover driver", () => {
  it("drives to a pose with a go_to message and follows the task lifecycle", async () => {
    const { driver } = rover();
    const outcome = await runTask(driver, instruction("MOVE", { frame: word("base"), target: pose(2, 1), speed: num(0.2) }));
    expect(lifecycleProblem(outcome.states)).toBeNull();
    expect(driver.transport.lines).toEqual(['{"service":"motors","command":"go_to","x":2,"y":1,"heading":0,"speed":0.2}']);
    expect(driver.world.pose("base")).toMatchObject({ x: 2, y: 1 });
  });

  it("sends drive, turn, capture and sensor messages", async () => {
    const { driver } = rover({ distance_front: 0.8 });
    await runTask(driver, instruction("DRIVE", { frame: word("base"), distance: num(0.5), speed: num(0.1) }));
    await runTask(driver, instruction("TURN", { frame: word("base"), angle: num(1.5707963267949) }));
    await runTask(driver, instruction("SENSE", { sensor: word("camera"), save: { kind: "text", value: "a.jpg" } }));
    const reading = await runTask(driver, instruction("SENSE", { sensor: word("distance_front") }));
    expect(reading.output).toEqual({ kind: "reading", value: 0.8 });
    expect(driver.transport.lines).toEqual([
      '{"service":"motors","command":"drive","distance":0.5,"speed":0.1}',
      '{"service":"motors","command":"turn","angle":1.57079632679}',
      '{"service":"camera","command":"capture","file":"a.jpg"}',
      '{"service":"sensors","command":"read","sensor":"distance_front"}',
    ]);
    expect(driver.world.photos).toEqual(["a.jpg"]);
  });

  it("refuses what a rover cannot do exactly or must not do", async () => {
    const { driver } = rover();
    expect((await runTask(driver, instruction("MOVE", { frame: word("base"), target: pose(1, 1, 0.5) }))).reason).toMatch(/^E422/);
    expect((await runTask(driver, instruction("DRIVE", { frame: word("base"), distance: num(1), speed: num(0.4) }))).reason).toMatch(/^E502/);
    expect((await runTask(driver, instruction("ACTUATE", { actuator: word("gripper"), state: word("closed") }))).reason).toMatch(/^E401/);
    expect(driver.transport.lines).toEqual([]);
  });

  it("stops the motors on STOP", async () => {
    const { driver } = rover();
    const task = runTask(driver, instruction("DRIVE", { frame: word("base"), direction: word("forward") }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await driver.stop();
    expect((await task).state).toBe("cancelled");
    expect(driver.transport.lines).toEqual(['{"service":"motors","command":"drive","direction":"forward"}', '{"service":"motors","command":"stop"}']);
  });

  it("runs a patrol program checked against its manifest", async () => {
    const { driver, clock } = rover({ distance_front: 2 });
    const site = {
      name: "site.uritp",
      source: lines("define place dock = pose(0.5m, 0.5m, 0m)", "define place desk = pose(3m, 2m, 0m)", "define route corridor = [places.dock, places.desk]"),
    };
    const program = {
      name: "main.uritp",
      source: lines(
        'robot rover = connect("pi:rover-1")',
        "for point in route.corridor:",
        "    move rover.base to point speed 0.2m/s",
        '    if rover.sense("distance_front").value < 30cm:',
        '        capture rover.camera save as "blocked.jpg"',
        '    capture rover.camera save as "at_{point.name}.jpg"',
      ),
    };
    const { result } = await runProgram({ program, manifests: { rover: { name: "pi-rover.uritp", source: manifestSource } }, siteMaps: [site], robots: { rover: driver }, clock });
    expect(result?.state).toBe("succeeded");
    expect(driver.world.photos).toEqual(["at_dock.jpg", "at_desk.jpg"]);
    expect(driver.world.pose("base")).toMatchObject({ x: 3, y: 2 });
  });
});
