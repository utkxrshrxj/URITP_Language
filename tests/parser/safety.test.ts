// Tests safety: blocks and their rules, the native escape hatch, and define lines for site maps.
import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/parser.js";
import { codes, kinds, lines, parseClean } from "./helpers.js";
import { show } from "./show.js";

describe("safety", () => {
  it("reads every kind of rule", () => {
    const source = lines(
      'robot drone = connect("field:drone-7")',
      "safety:",
      "    return_home drone when drone.battery < 25%",
      "    land drone at places.launch_pad when drone.battery < 10%",
      "    stop drone when drone.state == \"error\"",
      '    alert "Battery low" when drone.battery < 30%',
      "takeoff drone to 15m",
    );
    const program = parseClean(source);
    expect(kinds(program)).toEqual(["Robot", "Safety", "Takeoff"]);
    const safety = program.statements[1];
    if (safety?.kind !== "Safety") throw new Error("not safety");
    expect(safety.rules.map((r) => [r.action, r.robot && show(r.robot), r.at && show(r.at), show(r.condition)])).toEqual([
      ["return_home", "drone", null, "(< drone.battery 25%)"],
      ["land", "drone", "places.launch_pad", "(< drone.battery 10%)"],
      ["stop", "drone", null, '(== drone.state "error")'],
      ["alert", null, null, "(< drone.battery 30%)"],
    ]);
    expect(safety.rules[3]?.message?.parts).toEqual([{ kind: "literal", text: "Battery low" }]);
  });

  it("explains the when block from example iii (DECISIONS.md A9)", () => {
    const source = lines("safety:", "    when drone.battery < 25%:", "        returnhome");
    const d = parse(source).diagnostics;
    expect(d).toHaveLength(1);
    expect(d[0]?.args["fix"]).toBe("Write the action first, for example: return_home drone when drone.battery < 25%");
  });

  it("suggests return_home for returnhome (DECISIONS.md A3)", () => {
    const d = parse(lines("safety:", "    returnhome drone when drone.battery < 25%")).diagnostics;
    expect(d[0]).toMatchObject({ code: "E131", args: { word: "returnhome", suggestion: "return_home" } });
  });

  it("rejects an action that is not a safety action", () => {
    expect(codes(lines("safety:", "    move d.base to places.x when x"))).toEqual(["E131"]);
  });

  it("needs 'when'", () => {
    expect(parse(lines("safety:", "    stop drone")).diagnostics[0]?.args["expected"]).toBe("'when'");
  });

  it("keeps reading rules after a broken one", () => {
    const source = lines("safety:", "    stop when", "    stop d when d.battery < 5%");
    const { program, diagnostics } = parse(source);
    expect(diagnostics).toHaveLength(1);
    const safety = program.statements[0];
    expect(safety?.kind === "Safety" && safety.rules).toHaveLength(1);
  });

  it("is only allowed at the top level", () => {
    expect(codes(lines("task f():", "    safety:", "        stop d when x"))).toEqual(["E127"]);
  });
});

describe("native", () => {
  it("reads the escape hatch", () => {
    const statement = parseClean('native("urscript", "set_tcp(p[0,0,0.12,0,0,0])")').statements[0];
    expect(statement).toMatchObject({ kind: "Native", language: { parts: [{ text: "urscript" }] } });
  });

  it("needs fixed text", () => {
    expect(codes('native("urscript", "move({x})")')).toEqual(["E130"]);
  });
});

describe("define", () => {
  it("reads the site map example from Guidebook §6", () => {
    const source = lines(
      "define place kitchen = pose(4.2m, 1.0m, 0m, yaw=90deg)",
      "define place door    = pose(0m, 3.5m, 0m)",
      "define zone icu      = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m),",
      "    pose(14m, 6m, 0m), pose(10m, 6m, 0m))",
      "define route night_patrol = [places.kitchen, places.door]",
    );
    const program = parseClean(source);
    expect(program.statements.map((s) => (s.kind === "Define" ? `${s.what} ${s.name}` : s.kind))).toEqual([
      "place kitchen",
      "place door",
      "zone icu",
      "route night_patrol",
    ]);
  });

  it("needs place, zone or route", () => {
    expect(parse("define spot x = 1").diagnostics[0]?.args["expected"]).toBe("'place', 'zone' or 'route'");
  });
});
