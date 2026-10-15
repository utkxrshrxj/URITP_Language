// Tests the task lifecycle check (Guidebook §2 and §9.3 rule 3): accepted, running, then exactly
// one of succeeded, failed or cancelled. Anything else counts as a failure.
import { describe, expect, it } from "vitest";
import { instruction } from "../../src/codegen/instruction.js";
import { lifecycleProblem, runTask, type RobotPort, type TaskUpdate } from "../../src/runtime/robot-port.js";

/** A robot that reports the given updates for every instruction. */
const robot = (...updates: TaskUpdate[]): RobotPort => ({
  run: async (_instr, update) => {
    for (const u of updates) update(u);
  },
  stop: async () => {},
});
const STOP = instruction("STOP");

describe("lifecycleProblem", () => {
  it.each([
    [["accepted", "running", "succeeded"]],
    [["accepted", "running", "failed"]],
    [["accepted", "running", "cancelled"]],
    [["failed"]],
    [["accepted", "cancelled"]],
  ] as const)("accepts %j", (states) => {
    expect(lifecycleProblem(states)).toBeNull();
  });

  it.each([
    [[], "never reported a final state"],
    [["accepted", "running"], "never reported a final state"],
    [["accepted", "running", "succeeded", "failed"], "more than one final state"],
    [["running", "accepted", "succeeded"], "instead of accepted, running and one final state"],
    [["succeeded"], "instead of"],
    [["accepted", "succeeded"], "instead of"],
  ] as const)("rejects %j", (states, problem) => {
    expect(lifecycleProblem(states)).toContain(problem);
  });
});

describe("runTask", () => {
  it("returns the final state and output", async () => {
    const outcome = await runTask(
      robot({ state: "accepted" }, { state: "running" }, { state: "succeeded", output: { kind: "reading", value: 0.4 } }),
      STOP,
    );
    expect(outcome).toMatchObject({ state: "succeeded", rejected: false, output: { kind: "reading", value: 0.4 } });
  });

  it("passes on the robot's reason for a failure", async () => {
    const outcome = await runTask(robot({ state: "accepted" }, { state: "running" }, { state: "failed", reason: "path blocked" }), STOP);
    expect(outcome).toMatchObject({ state: "failed", reason: "path blocked", rejected: false });
  });

  it("marks a straight refusal as rejected (§9.3 rule 4)", async () => {
    const outcome = await runTask(robot({ state: "failed", reason: "E401 no flight profile" }), STOP);
    expect(outcome).toMatchObject({ state: "failed", rejected: true });
  });

  it("turns a broken lifecycle into a failure", async () => {
    const outcome = await runTask(robot({ state: "succeeded" }), STOP);
    expect(outcome.state).toBe("failed");
    expect(outcome.brokenLifecycle).toContain("instead of");
  });

  it("turns a robot that throws into a failure", async () => {
    const port: RobotPort = { run: async () => Promise.reject(new Error("cable unplugged")), stop: async () => {} };
    expect(await runTask(port, STOP)).toMatchObject({ state: "failed", reason: "cable unplugged", brokenLifecycle: "the robot stopped answering" });
  });
});
