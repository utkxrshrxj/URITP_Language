// Company: Universal Robots
// Tests the simulated Universal Robots driver: URScript-style lines, refusals, STOP, a whole
// program run from its manifest, and the ready-to-run arm program run through the command line.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { runCli } from "../../src/cli/cli.js";
import { checkManifest } from "../../src/checker/manifest.js";
import { instruction, num, word } from "../../src/codegen/instruction.js";
import { realClock } from "../../src/runtime/clock.js";
import { lifecycleProblem, runTask } from "../../src/runtime/robot-port.js";
import { runProgram } from "../../src/runtime/run-program.js";
import { UniversalRobotsDriver } from "./ur-driver.js";
import { createDriver } from "./index.js";
import { rotationVector, urPose } from "./urscript.js";

const manifestSource = readFileSync(new URL("../../manifests/universal-robots/ur-arm.uritp", import.meta.url), "utf8");
const model = checkManifest(manifestSource).model!;
const lines = (...source: string[]): string => source.join("\n");
const CUP = { pose: { x: 0.4, y: 0.1, z: 0.05, roll: 0, pitch: 0, yaw: 0 } };
const TRAY = { pose: { x: 0.3, y: -0.3, z: 0.02, roll: 0, pitch: 0, yaw: 0 } };

function arm() {
  const clock = realClock({ speed: 1000 });
  return { clock, driver: new UniversalRobotsDriver({ model, clock, simulator: { objects: { cup: CUP, tray: TRAY } } }) };
}

describe("URScript-style text", () => {
  it("writes a tool pointing down as a rotation of half a turn about x", () => {
    const [rx, ry, rz] = rotationVector(Math.PI, 0, 0);
    expect(rx).toBeCloseTo(Math.PI, 9);
    expect(ry).toBeCloseTo(0, 9);
    expect(rz).toBeCloseTo(0, 9);
  });

  it("writes a yaw as a rotation about z", () => {
    const [rx, ry, rz] = rotationVector(0, 0, Math.PI / 2);
    expect([rx, ry]).toEqual([0, 0]);
    expect(rz).toBeCloseTo(Math.PI / 2, 9);
  });

  it("writes poses with a decimal point, in metres", () => {
    expect(urPose({ x: 0.4, y: 0, z: 0.2, roll: 0, pitch: 0, yaw: 0 })).toBe("p[0.4, 0.0, 0.2, 0.0, 0.0, 0.0]");
  });
});

describe("Universal Robots driver", () => {
  it("moves the tool with movel and follows the task lifecycle", async () => {
    const { driver } = arm();
    const target = { kind: "object" as const, name: "cup", helpers: [{ name: "above", args: [0.1] }] };
    const outcome = await runTask(driver, instruction("MOVE", { frame: word("tool"), target, speed: num(0.2) }));
    expect(outcome.state).toBe("succeeded");
    expect(lifecycleProblem(outcome.states)).toBeNull();
    expect(driver.transport.lines).toEqual(["movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)"]);
  });

  it("opens and closes the gripper with a force", async () => {
    const { driver } = arm();
    await runTask(driver, instruction("ACTUATE", { actuator: word("gripper"), state: word("closed"), force: num(40) }));
    await runTask(driver, instruction("ACTUATE", { actuator: word("gripper"), state: word("open") }));
    expect(driver.transport.lines).toEqual(["gripper_close(force=40.0)", "gripper_open()"]);
    expect(driver.world.state("gripper")).toBe("open");
  });

  it("refuses what the arm cannot do exactly or must not do", async () => {
    const { driver } = arm();
    const far = await runTask(driver, instruction("MOVE", { frame: word("tool"), target: { kind: "pose", pose: { x: 1, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 } } }));
    expect(far.reason).toMatch(/^E421 the target is 1m away, beyond the reach of frame 'tool'/);
    const fast = await runTask(driver, instruction("MOVE", { frame: word("tool"), target: { kind: "object", name: "cup", helpers: [] }, speed: num(0.5) }));
    expect(fast.reason).toMatch(/^E502 speed 0.5m\/s exceeds safety limit 0.25m\/s/);
    const drive = await runTask(driver, instruction("DRIVE", { frame: word("tool"), distance: num(1) }));
    expect(drive.reason).toMatch(/^E401 'drive' requires profile 'navigation'/);
    expect(driver.transport.lines).toEqual([]);
  });

  it("stops with stopl within its stopping time", async () => {
    const { driver } = arm();
    const task = runTask(driver, instruction("WAIT", { duration: num(60) }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await driver.stop();
    expect((await task).state).toBe("cancelled");
    expect(driver.transport.lines).toEqual(["sleep(60.0)", "stopl(3.0)"]);
  });

  it("runs a pick-and-place program checked against its manifest", async () => {
    const { driver, clock } = arm();
    const program = {
      name: "main.uritp",
      source: lines(
        'robot arm = connect("ur:arm-1")',
        "move arm.tool to cup.above(10cm) speed 0.2m/s",
        "grip arm.gripper close force 40N",
        "move arm.tool to tray.above(10cm) speed 0.2m/s",
        "grip arm.gripper open",
      ),
    };
    const { result } = await runProgram({ program, manifests: { arm: { name: "ur-arm.uritp", source: manifestSource } }, robots: { arm: driver }, clock });
    expect(result?.state).toBe("succeeded");
    expect(driver.transport.lines).toEqual([
      "movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)",
      "gripper_close(force=40.0)",
      "movel(p[0.3, -0.3, 0.12, 3.141593, 0.0, 0.0], a=1.2, v=0.2)",
      "gripper_open()",
    ]);
  });

  it("is created through its folder's entry point, as tools find it", () => {
    expect(createDriver({ model })).toBeInstanceOf(UniversalRobotsDriver);
  });
});

describe("the command line", () => {
  it("runs examples/try-arm/pick_and_place.uritp on this driver", async () => {
    const printed: string[] = [];
    const code = await runCli(parseArgs(["run", "examples/try-arm/pick_and_place.uritp", "--robot", "manifests/universal-robots/ur-arm.uritp", "--protocol"]), {
      print: (text) => printed.push(text),
      readFile: (path) => {
        try {
          return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
        } catch {
          return null;
        }
      },
      loadDriver: async (folder) => (folder === "universal-robots" ? createDriver : null),
      clock: (speed) => realClock({ speed: speed * 1000 }),
    });
    const output = printed.join("\n");
    expect(code).toBe(0);
    expect(output).toContain("The program ended: succeeded.");
    expect(output).toContain("  movel(p[0.4, 0.1, 0.15, 3.141593, 0.0, 0.0], a=1.2, v=0.2)");
    expect(output).toContain("  gripper_close(force=40.0)");
  });
});
