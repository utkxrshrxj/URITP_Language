// Tests building each instruction from worked-out values, in SI units (Guidebook §9.2),
// and writing conditions the robot checks by itself, like pour ... until.
import { describe, expect, it } from "vitest";
import * as codegen from "../../src/codegen/codegen.js";
import { conditionText } from "../../src/codegen/condition.js";
import { formatInstruction, word } from "../../src/codegen/instruction.js";
import { parseExpressionSource } from "../../src/parser/parser.js";
import { ORIGIN, quantityOf, type Value } from "../../src/runtime/values.js";

const tool: Value = { kind: "part", robot: "arm", part: "tool" };
const base: Value = { kind: "part", robot: "rover", part: "base" };
const cup: Value = { kind: "object", name: "cup", helpers: [{ name: "above", args: [0.1] }] };
const written = (i: Parameters<typeof formatInstruction>[0]): string => formatInstruction(i);

describe("instructions", () => {
  it("builds the Guidebook's MOVE example", () => {
    expect(written(codegen.move(tool, cup, quantityOf(0.2, "m/s"), quantityOf(5, "mm"), null, []))).toBe(
      "MOVE frame=tool target=cup.above(0.1) speed=0.2 tolerance=0.005",
    );
  });

  it("builds a move to a place with a route and zones to avoid", () => {
    const place: Value = { kind: "place", name: "lab", pose: { ...ORIGIN, x: 5, y: 2 } };
    const zone: Value = { kind: "zone", name: "icu", corners: [{ x: 10, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 6 }] };
    expect(written(codegen.move(base, place, quantityOf(50, "cm/s"), null, { kind: "list", items: [place] }, [zone]))).toBe(
      "MOVE frame=base target=pose(5,2,0,0,0,0) speed=0.5 via=[pose(5,2,0,0,0,0)] avoid=[polygon((10,0),(14,0),(14,6))]",
    );
  });

  it.each([
    [codegen.drive(base, "forward", quantityOf(50, "cm"), quantityOf(0.2, "m/s")), "DRIVE frame=base distance=0.5 speed=0.2"],
    [codegen.drive(base, "backward", quantityOf(50, "cm"), null), "DRIVE frame=base distance=-0.5"],
    [codegen.drive(base, "forward", null, null), "DRIVE frame=base direction=forward"],
    [codegen.turn(base, quantityOf(180, "deg"), quantityOf(90, "deg/s")), "TURN frame=base angle=3.14159265359 speed=1.57079632679"],
    [codegen.grip({ kind: "part", robot: "arm", part: "gripper" }, "close", quantityOf(40, "N")), "ACTUATE actuator=gripper state=closed force=40"],
    [codegen.grip({ kind: "part", robot: "arm", part: "gripper" }, "open", null), "ACTUATE actuator=gripper state=open"],
    [codegen.skill("takeoff", { height: codegen.field(quantityOf(15, "m")) }), "SKILL name=takeoff height=15"],
    [codegen.skill("return_home"), "SKILL name=return_home"],
    [codegen.sense("battery"), "SENSE sensor=battery"],
    [codegen.sense("camera", { save: "roof_3.jpg" }), 'SENSE sensor=camera save="roof_3.jpg"'],
    [codegen.talk("SAY", "Parcel for you", "en"), 'SAY text="Parcel for you" lang=en'],
    [codegen.talk("CONFIRM", "Shall I go?", null), 'CONFIRM text="Shall I go?"'],
    [codegen.wait(120), "WAIT duration=120"],
    [codegen.extension("examplecorp.adaptive_weld", [{ name: "current", value: quantityOf(180, "A") }]), "EXT name=examplecorp.adaptive_weld current=180"],
  ])("writes %j", (instr, line) => {
    expect(written(instr)).toBe(line);
  });

  it("writes a part's name, not its robot", () => {
    expect(codegen.partField(tool)).toEqual(word("tool"));
  });
});

describe("conditionText", () => {
  const lookup = (name: string): Value | undefined =>
    name === "limit" ? { kind: "percent", value: 90 } : name === "rover" ? { kind: "robot", robot: "rover" } : undefined;
  const condition = (source: string): string | null => conditionText(parseExpressionSource(source).expression!, lookup);

  it.each([
    ["mug.fill >= 80%", "mug.fill>=0.8"],
    ["mug.fill >= limit", "mug.fill>=0.9"],
    ["mug.fill >= 80% or not kettle.holding", "mug.fill>=0.8 or not kettle.holding"],
    ["mug.level < 12cm", "mug.level<0.12"],
  ])("writes %s as %s", (source, text) => {
    expect(condition(source)).toBe(text);
  });

  it("refuses what the robot cannot check itself", () => {
    expect(condition("rover.battery < 20%")).toBeNull();
    expect(condition("now() > 30s")).toBeNull();
  });
});
