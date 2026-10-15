// Tests the check-then-run entry point: a program that fails any check never reaches a robot,
// and one that passes (warnings allowed) runs to the end.
import { describe, expect, it } from "vitest";
import { realClock } from "../../src/runtime/clock.js";
import { runProgram } from "../../src/runtime/run-program.js";
import { FakeRobot } from "./fake-robot.js";

const lines = (...source: string[]): string => source.join("\n");
const ARM = {
  name: "arm.uritp",
  source: lines(
    'manifest "Test arm":',
    "    uritp 0.1",
    "    frame tool: pose6d reach 0.85m max_speed 1m/s",
    "    actuator gripper: states [open, closed] max_force 100N",
    "    profiles [core, manipulation]",
    "    safety max_speed 0.25m/s",
  ),
};

async function go(...statements: string[]) {
  const clock = realClock({ speed: 1000 });
  const arm = new FakeRobot(clock);
  const program = { name: "main.uritp", source: lines('robot arm = connect("lab:arm")', ...statements) };
  const outcome = await runProgram({ program, manifests: { arm: ARM }, robots: { arm }, clock });
  return { ...outcome, arm };
}

describe("runProgram", () => {
  it("runs a program that passes every check", async () => {
    const { result, arm, diagnostics } = await go("move arm.tool to cup.above(10cm) speed 0.2m/s", "grip arm.gripper close force 40N");
    expect(diagnostics).toEqual([]);
    expect(result?.state).toBe("succeeded");
    expect(arm.sent).toEqual(["MOVE frame=tool target=cup.above(0.1) speed=0.2", "ACTUATE actuator=gripper state=closed force=40"]);
  });

  it("rejects an unsafe program before anything moves", async () => {
    const { result, arm, diagnostics } = await go("grip arm.gripper close", "move arm.tool to cup speed 3m/s");
    expect(diagnostics.map((d) => d.code)).toEqual(["E502"]);
    expect(result).toBeNull();
    expect(arm.sent).toEqual([]);
  });

  it("rejects a program with a syntax error before anything moves", async () => {
    const { result, arm } = await go("grip arm.gripper close", "move arm.tool to cup speed 5mms");
    expect(result).toBeNull();
    expect(arm.sent).toEqual([]);
  });
});
