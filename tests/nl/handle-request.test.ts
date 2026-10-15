// Tests that the checker is always the gatekeeper for spoken and typed requests: a program from
// either translator runs only if it passes every check, and a wrong or unsafe one never moves a robot.
import { describe, expect, it } from "vitest";
import { realClock } from "../../src/runtime/clock.js";
import { AiTranslator, type CreateMessage } from "../../src/nl/ai-translator.js";
import { handleRequest, type RequestOutcome } from "../../src/nl/handle-request.js";
import { RuleBasedTranslator } from "../../src/nl/rule-based.js";
import type { Translator } from "../../src/nl/translator.js";
import { FakeRobot } from "../runtime/fake-robot.js";

const lines = (...source: string[]): string => source.join("\n");
const ROVER_MANIFEST = {
  name: "rover.uritp",
  source: lines(
    'manifest "Test rover":',
    "    uritp 0.1",
    "    frame base: pose2d max_speed 0.5m/s",
    "    sensor distance_front: ultrasonic dimension Length",
    "    profiles [core, navigation]",
    "    safety max_speed 0.3m/s",
    "    safety forbidden_zone zones.icu",
  ),
};
const SITE = {
  name: "site.uritp",
  source: lines(
    "define place kitchen = pose(4m, 1m, 0m)",
    "define place ward = pose(12m, 3m, 0m)",
    "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m), pose(10m, 6m, 0m))",
  ),
};
const HEADER = 'robot rover = connect("lab:rover")';

/** A pretend AI that always writes the given program, whatever it is asked. */
function aiWriting(program: string): Translator {
  const create: CreateMessage = async () =>
    ({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({ understood: true, program, explanation: "as asked", language: "en" }) }],
    }) as never;
  return new AiTranslator({ create });
}

async function request(text: string, translator: Translator): Promise<{ outcome: RequestOutcome; robot: FakeRobot }> {
  const clock = realClock({ speed: 1000 });
  const robot = new FakeRobot(clock);
  const outcome = await handleRequest({
    text,
    translator,
    robots: { rover: { address: "lab:rover", manifest: ROVER_MANIFEST, port: robot } },
    siteMaps: [SITE],
    clock,
  });
  return { outcome, robot };
}

const codes = (outcome: RequestOutcome): string[] => (outcome.stage === "not-understood" ? [] : outcome.diagnostics.map((d) => d.code));

describe("requests that pass every check run", () => {
  it("runs an offline Hinglish request", async () => {
    const { outcome, robot } = await request("rasoi mein jao", new RuleBasedTranslator());
    expect(outcome).toMatchObject({ stage: "ran", language: "hinglish", result: { state: "succeeded" } });
    expect(robot.sent).toEqual(["MOVE frame=base target=pose(4,1,0,0,0,0)"]);
  });

  it("runs a correct program from the AI", async () => {
    const { outcome, robot } = await request("drive a bit", aiWriting(lines(HEADER, "drive rover.base forward by 50cm speed 0.2m/s")));
    expect(outcome.stage).toBe("ran");
    expect(robot.sent).toEqual(["DRIVE frame=base distance=0.5 speed=0.2"]);
  });
});

describe("wrong or unsafe programs are rejected before anything moves", () => {
  it.each([
    ["a speed over the safety limit", lines(HEADER, "drive rover.base forward by 1m speed 3m/s"), "E502"],
    ["a target in a forbidden zone", lines(HEADER, "move rover.base to places.ward"), "E501"],
    ["a place that does not exist", lines(HEADER, "move rover.base to places.moon"), "E209"],
    ["a command the robot has no profile for", lines(HEADER, "takeoff rover to 10m"), "E401"],
    ["native code", lines(HEADER, 'native("python", "import os")'), "E405"],
    ["a part the robot does not have", lines(HEADER, 'capture rover.camera save as "a.jpg"'), "E205"],
    ["a robot that is not connected", lines(HEADER, 'robot drone = connect("x")', "takeoff drone to 10m"), "E201"],
    ["a bare number for a distance", lines(HEADER, "drive rover.base forward by 50"), "E304"],
    ["broken syntax", "move rover base kitchen please", "E120"],
  ])("rejects %s (%s)", async (_what, program, code) => {
    const { outcome, robot } = await request("anything", aiWriting(program));
    expect(outcome.stage).toBe("rejected");
    expect(codes(outcome)).toContain(code);
    expect(robot.sent).toEqual([]);
  });

  it("rejects an offline request the robot cannot do, with the checker's reason", async () => {
    const { outcome, robot } = await request("photo lo", new RuleBasedTranslator());
    expect(outcome.stage).toBe("rejected");
    expect(codes(outcome)).toEqual(["E205"]);
    expect(robot.sent).toEqual([]);
  });

  it("does not run anything when the request is not understood", async () => {
    const { outcome, robot } = await request("dance for me", new RuleBasedTranslator());
    expect(outcome).toEqual({ stage: "not-understood", reason: 'I did not understand "dance for me".', language: "en" });
    expect(robot.sent).toEqual([]);
  });

  it("does not run anything when a manifest has problems", async () => {
    const clock = realClock({ speed: 1000 });
    const robot = new FakeRobot(clock);
    const outcome = await handleRequest({
      text: "rasoi mein jao",
      translator: new RuleBasedTranslator(),
      robots: { rover: { address: "lab:rover", manifest: { name: "rover.uritp", source: 'manifest "R":\n    uritp 0.1' }, port: robot } },
      siteMaps: [SITE],
      clock,
    });
    expect(outcome.stage).toBe("rejected");
    expect(robot.sent).toEqual([]);
  });
});
