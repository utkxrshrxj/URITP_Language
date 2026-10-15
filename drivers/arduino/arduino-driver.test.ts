// Company: Arduino
// Tests the simulated Arduino rover driver: its serial text lines, refusals, STOP, and a whole
// "drive until close" program run from its manifest.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../../src/checker/manifest.js";
import { instruction, num, word } from "../../src/codegen/instruction.js";
import { realClock } from "../../src/runtime/clock.js";
import { lifecycleProblem, runTask } from "../../src/runtime/robot-port.js";
import { runProgram } from "../../src/runtime/run-program.js";
import { ArduinoDriver } from "./arduino-driver.js";
import { driveLine, shortestTurn, turnLine } from "./serial-protocol.js";

const manifestSource = readFileSync(new URL("../../manifests/arduino/arduino-rover.uritp", import.meta.url), "utf8");
const model = checkManifest(manifestSource).model!;
const lines = (...source: string[]): string => source.join("\n");

function rover(readings: Record<string, number | (() => number)> = {}) {
  const clock = realClock({ speed: 1000 });
  return { clock, driver: new ArduinoDriver({ model, clock, simulator: { readings } }) };
}

describe("serial protocol", () => {
  it("writes whole millimetres and hundredths of a degree", () => {
    expect(driveLine(0.5, "forward", 0.1)).toBe("F 500 100");
    expect(driveLine(-0.25, "forward", 0.1)).toBe("B 250 100");
    expect(driveLine(null, "backward", 0.05)).toBe("B - 50");
    expect(turnLine(Math.PI / 2, 0.5)).toBe("L 9000 2865");
    expect(turnLine(-Math.PI / 4, 0.5)).toBe("R 4500 2865");
  });

  it("turns the short way round", () => {
    expect(shortestTurn(0, (3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 9);
  });
});

describe("Arduino rover driver", () => {
  it("drives a distance and follows the task lifecycle", async () => {
    const { driver } = rover();
    const outcome = await runTask(driver, instruction("DRIVE", { frame: word("base"), distance: num(0.5), speed: num(0.1) }));
    expect(lifecycleProblem(outcome.states)).toBeNull();
    expect(driver.transport.lines).toEqual(["F 500 100"]);
    expect(driver.world.pose("base")).toMatchObject({ x: 0.5, y: 0 });
  });

  it("moves to a pose by turning, driving straight and turning again", async () => {
    const { driver } = rover();
    await runTask(driver, instruction("MOVE", { frame: word("base"), target: { kind: "pose", pose: { x: 1, y: 1, z: 0, roll: 0, pitch: 0, yaw: 0 } }, speed: num(0.1) }));
    expect(driver.transport.lines).toEqual(["L 4500 2865", "F 1414 100", "R 4500 2865"]);
    expect(driver.world.pose("base")).toMatchObject({ x: 1, y: 1, yaw: 0 });
  });

  it("asks for readings with Q lines", async () => {
    const { driver } = rover({ distance_front: 0.312 });
    const outcome = await runTask(driver, instruction("SENSE", { sensor: word("distance_front") }));
    expect(outcome.output).toEqual({ kind: "reading", value: 0.312 });
    expect(driver.transport.lines).toEqual(["Q DF"]);
  });

  it("refuses photos, objects and speeds it cannot do", async () => {
    const { driver } = rover();
    const photo = await runTask(driver, instruction("SENSE", { sensor: word("camera"), save: { kind: "text", value: "a.jpg" } }));
    expect(photo.reason).toMatch(/^E401 'capture' requires profile 'vision'/);
    const cup = await runTask(driver, instruction("MOVE", { frame: word("base"), target: { kind: "object", name: "cup", helpers: [] } }));
    expect(cup.reason).toMatch(/^E401 'finding objects' requires profile 'vision or manipulation'/);
    const fast = await runTask(driver, instruction("DRIVE", { frame: word("base"), distance: num(1), speed: num(0.3) }));
    expect(fast.reason).toMatch(/^E502/);
    expect(driver.transport.lines).toEqual([]);
  });

  it("stops with S", async () => {
    const { driver } = rover();
    const task = runTask(driver, instruction("DRIVE", { frame: word("base"), direction: word("forward") }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await driver.stop();
    expect((await task).state).toBe("cancelled");
    expect(driver.transport.lines).toEqual(["F - 200", "S"]);
  });

  it("runs a drive-until-close program checked against its manifest", async () => {
    let distance = 0.5;
    const { driver, clock } = rover({ distance_front: () => (distance -= 0.05) });
    const program = {
      name: "main.uritp",
      source: lines(
        'robot rover = connect("serial:/dev/ttyACM0")',
        "repeat 20 times:",
        '    if rover.sense("distance_front").value < 20cm:',
        "        break",
        "    drive rover.base forward by 5cm speed 0.1m/s",
        "turn rover.base by 180deg",
      ),
    };
    const { result } = await runProgram({ program, manifests: { rover: { name: "arduino-rover.uritp", source: manifestSource } }, robots: { rover: driver }, clock });
    expect(result?.state).toBe("succeeded");
    const motion = driver.transport.lines.filter((line) => !line.startsWith("Q"));
    expect(motion).toEqual([...Array(6).fill("F 50 100"), "L 18000 2865"]);
  });
});
