// Tests working out values while running: units, comparisons, text insertions, built-ins, pose
// helpers, and reading robot values through SENSE (DECISIONS.md D30), using a fake environment.
import { describe, expect, it } from "vitest";
import { formatValue } from "../../src/codegen/instruction.js";
import { toField } from "../../src/codegen/fields.js";
import { Evaluator, RunFailure, type RunEnv } from "../../src/runtime/evaluate.js";
import { ORIGIN, quantityOf, show, type Value } from "../../src/runtime/values.js";
import { parseExpressionSource } from "../../src/parser/parser.js";

/** A fake runner: fixed variables and places, and SENSE answers from a table. */
function fakeEnv(readings: Record<string, Value> = {}, vars: Record<string, Value> = {}) {
  const sensed: string[] = [];
  const env: RunEnv = {
    lookup: (name) => vars[name],
    place: (name) => (name === "lab" ? { kind: "place", name: "lab", pose: { ...ORIGIN, x: 3, y: 4 } } : undefined),
    zone: () => undefined,
    route: () => undefined,
    error: null,
    sense: async (robot, sensor) => {
      sensed.push(`${robot}:${sensor}`);
      const value = readings[sensor];
      if (value === undefined) throw new RunFailure("R703", `no reading for ${sensor}`);
      return value;
    },
    objectRobot: () => "rover",
    robotHas: (_robot, name) => name === "navigation",
    callTask: async () => ({ kind: "nothing" }),
    callExtension: async () => ({ kind: "nothing" }),
    now: () => 42,
  };
  return { env, sensed };
}

async function value(source: string, env: RunEnv = fakeEnv().env): Promise<string> {
  const { expression } = parseExpressionSource(source);
  if (expression === null) throw new Error("did not parse");
  return show(await new Evaluator(env).evaluate(expression));
}

describe("values and operators", () => {
  it.each([
    ["10cm + 5mm", "10.5cm"],
    ["1m - 20cm", "0.8m"],
    ["30s + 2min", "150s"],
    ["25% + 10%", "35%"],
    ["1m == 100cm", "true"],
    ["50cm/s < 1m/s", "true"],
    ["not (2 > 3)", "true"],
    ['"idle" == "busy"', "false"],
    ["to(1.2m, cm)", "120cm"],
    ["round(1.234m, cm)", "123cm"],
    ["len([1, 2, 3])", "3"],
    ["text(5cm)", "5cm"],
    ["now()", "42s"],
    ["distance(pose(0m, 0m, 0m), places.lab)", "5m"],
  ])("works out %s as %s", async (source, expected) => {
    expect(await value(source)).toBe(expected);
  });

  it("fills in text insertions", async () => {
    const env = fakeEnv({}, { d: quantityOf(2, "m"), name: { kind: "text", value: "Asha" } }).env;
    expect(await value('"Hello {name}, {d} to go"', env)).toBe("Hello Asha, 2m to go");
  });

  it("fails a worked-out percent outside 0% to 100% with R705 (D12)", async () => {
    await expect(value("60% + 50%")).rejects.toMatchObject({ code: "R705" });
  });
});

describe("pose helpers", () => {
  it("works out helpers on places and keeps them on objects", async () => {
    const { expression } = parseExpressionSource("places.lab.offset(1m, 0m, 0m)");
    const result = await new Evaluator(fakeEnv().env).evaluate(expression!);
    expect(formatValue(toField(result))).toBe("pose(4,4,0,0,0,0)");
    const cup = await new Evaluator(fakeEnv().env).evaluate(parseExpressionSource("cup.above(10cm)").expression!);
    expect(formatValue(toField(cup))).toBe("cup.above(0.1)");
  });

  it("gives a place its name", async () => {
    expect(await value('"at {places.lab.name}"')).toBe("at lab");
  });
});

describe("reading from robots with SENSE (D30)", () => {
  const rover: Value = { kind: "robot", robot: "rover" };

  it("reads robot properties, actuator properties and object properties", async () => {
    const { env, sensed } = fakeEnv(
      { battery: { kind: "percent", value: 80 }, "tray.loaded": { kind: "bool", value: true }, "mug.fill": { kind: "percent", value: 50 } },
      { rover },
    );
    expect(await value("rover.battery < 25%", env)).toBe("false");
    expect(await value("rover.tray.loaded", env)).toBe("true");
    expect(await value("mug.fill >= 80%", env)).toBe("false");
    expect(sensed).toEqual(["rover:battery", "rover:tray.loaded", "rover:mug.fill"]);
  });

  it("reads a sensor and its reading's parts", async () => {
    const reading: Value = { kind: "reading", value: quantityOf(30, "cm"), max: quantityOf(40, "cm"), min: quantityOf(20, "cm"), mean: quantityOf(30, "cm"), timestamp: 3 };
    const { env } = fakeEnv({ distance_front: reading }, { rover });
    expect(await value('rover.sense("distance_front").max', env)).toBe("40cm");
    expect(await value('rover.sense("distance_front").value < 20cm', env)).toBe("false");
    expect(await value('rover.sense("distance_front").timestamp', env)).toBe("3s");
  });

  it("answers has() from the manifest without asking the robot", async () => {
    const { env, sensed } = fakeEnv({}, { rover });
    expect(await value('rover.has("navigation")', env)).toBe("true");
    expect(await value('rover.has("flight")', env)).toBe("false");
    expect(sensed).toEqual([]);
  });

  it("passes on a failed reading", async () => {
    await expect(value("rover.battery", fakeEnv({}, { rover }).env)).rejects.toMatchObject({ code: "R703" });
  });
});
