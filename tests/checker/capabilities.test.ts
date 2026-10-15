// Tests capability checks (E4xx, W6xx): profiles each statement needs, statements that name no
// robot, vendor extensions and their .has() guards, and native code.
import { describe, expect, it } from "vitest";
import type { CheckOptions } from "../../src/checker/checker.js";
import { checked, codes, firstMessage, lines } from "./helpers.js";
import { MODELS, WITH_TEST_ROBOTS } from "./models.js";

const OPTIONS: CheckOptions = {
  ...WITH_TEST_ROBOTS,
  siteMaps: [
    {
      name: "site.uritp",
      source: lines(
        "define place lab = pose(5m, 2m, 0m)",
        "define zone icu = polygon(pose(10m, 0m, 0m), pose(14m, 0m, 0m), pose(14m, 6m, 0m))",
        "define route seam = [pose(0m, 0m, 0m), pose(1m, 0m, 0m)]",
      ),
    },
  ],
};
const connect = (...robots: string[]): string => robots.map((r) => `robot ${r} = connect("x")`).join("\n");

describe("profiles (Guidebook §7)", () => {
  it("gives the Guidebook's E401 message for takeoff on a rover", () => {
    const options: CheckOptions = {
      robots: () => ({ ...MODELS["rover"]!, profiles: ["core", "navigation"] }),
    };
    expect(firstMessage(lines(connect("rover"), "takeoff rover to 2m"), options)).toBe(
      "'takeoff' requires profile 'flight'; rover supports [core, navigation] / Use a robot whose manifest has this profile, or leave this statement out.",
    );
  });

  it.each([
    ["arm", "drive arm.tool forward by 1m", "navigation"],
    ["arm", "move arm.tool to places.lab via route.seam", "navigation"],
    ["arm", "move arm.tool to places.lab avoid zones.icu", "navigation"],
    ["rover", "grip rover.tray close", "manipulation"],
    ["drone", "turn drone.base by 90deg", ""],
    ["rover", "turn rover.base by 90deg", ""],
    ["arm", "turn arm.tool by 90deg", "navigation, legged or flight"],
    ["drone", 'capture drone.camera save as "a.jpg"', ""],
    ["welder", 'capture welder.tool save as "a.jpg"', ""],
  ])("on %s, %s needs %j", (robot, statement, profile) => {
    const d = checked(lines(connect(robot), statement), OPTIONS).filter((x) => x.code === "E401");
    if (profile === "") expect(d).toEqual([]);
    else expect(d[0]?.args["profile"]).toBe(profile);
  });

  it("needs flight for return_home and land in safety rules", () => {
    expect(codes(lines(connect("rover"), "safety:", "    return_home rover when rover.battery < 25%"), OPTIONS)).toEqual(["E401"]);
    expect(codes(lines(connect("drone"), "safety:", "    return_home drone when drone.battery < 25%"), OPTIONS)).toEqual([]);
  });

  it("needs vision on the robot whose reading is analysed", () => {
    const options: CheckOptions = { robots: () => ({ ...MODELS["rover"]!, profiles: ["core"] }) };
    expect(codes(lines(connect("rover"), 'let a = rover.sense("camera").analyse(cup).label'), options)).toEqual(["E401"]);
  });
});

describe("statements that name no robot (DECISIONS.md D27)", () => {
  it("runs say on the one robot that can speak", () => {
    expect(codes(lines(connect("rover", "drone"), 'say "hello"'), OPTIONS)).toEqual([]);
  });

  it("rejects say when two connected robots could speak", () => {
    expect(checked(lines(connect("rover", "helper"), 'say "hello"'), OPTIONS)[0]).toMatchObject({
      code: "E403",
      args: { what: "say", robots: "rover, helper" },
    });
  });

  it("rejects say when no connected robot can speak", () => {
    expect(checked(lines(connect("drone", "dog"), 'say "hello"'), OPTIONS)[0]).toMatchObject({
      code: "E404",
      args: { what: "say", profile: "speech" },
    });
  });

  it("lets a welding arm with tooling but no gripper weld (D43)", () => {
    const options: CheckOptions = { ...OPTIONS, robots: () => ({ ...MODELS["welder"]!, profiles: ["core", "tooling"] }) };
    expect(codes(lines(connect("welder"), "weld along route.seam speed 5mm/s current 180A"), options)).toEqual([]);
  });

  it("gives E401 when the only robot cannot do it", () => {
    expect(codes(lines(connect("drone"), 'confirm "Go?"'), OPTIONS)).toEqual(["E401"]);
    expect(codes(lines(connect("rover"), "weld along route.seam speed 5mm/s current 180A"), OPTIONS)).toEqual(["E401"]);
  });
});

describe("vendor extensions (Guidebook §7, DECISIONS.md D18)", () => {
  const example = lines(
    connect("welder"),
    'if welder.has("examplecorp.adaptive_weld"):',
    "    examplecorp.adaptive_weld(route.seam, current=180A)",
    "else:",
    "    weld along route.seam speed 5mm/s current 180A",
  );

  it("accepts example vi on a robot that has the extension", () => {
    expect(codes(example, OPTIONS)).toEqual([]);
  });

  it("accepts example vi on a robot without it, because the guarded branch never runs", () => {
    const options: CheckOptions = { ...OPTIONS, robots: () => ({ ...MODELS["welder"]!, extensions: {} }) };
    expect(codes(example, options)).toEqual([]);
  });

  it("does not ask for tooling in the else branch when the extension is there", () => {
    const options: CheckOptions = { ...OPTIONS, robots: () => ({ ...MODELS["welder"]!, profiles: ["core", "manipulation"] }) };
    expect(codes(example, options)).toEqual([]);
  });

  it("warns about an unguarded extension (W601), as in the Guidebook", () => {
    const d = checked(lines(connect("welder"), "examplecorp.adaptive_weld(route.seam, current=180A)"), OPTIONS);
    expect(d).toEqual([expect.objectContaining({ code: "W601", severity: "warning" })]);
    expect(firstMessage(lines(connect("welder"), "examplecorp.adaptive_weld(route.seam, current=180A)"), OPTIONS)).toContain(
      "'examplecorp.adaptive_weld' is used without a welder.has(...) guard",
    );
  });

  it("accepts a guard joined with and", () => {
    const source = lines(connect("welder"), 'if welder.has("examplecorp.adaptive_weld") and welder.battery > 20%:', "    examplecorp.adaptive_weld(route.seam, current=180A)");
    expect(codes(source, OPTIONS)).toEqual([]);
  });

  it("rejects an extension no connected robot has (E402)", () => {
    expect(codes(lines(connect("rover"), "examplecorp.adaptive_weld(route.seam, current=180A)"), OPTIONS)).toEqual(["E402"]);
  });

  it("checks extension arguments against the manifest's parameter types", () => {
    expect(codes(lines(connect("welder"), 'if welder.has("examplecorp.adaptive_weld"):', "    examplecorp.adaptive_weld(route.seam, current=180)"), OPTIONS)).toEqual(["E304"]);
    expect(codes(lines(connect("welder"), 'if welder.has("examplecorp.adaptive_weld"):', "    examplecorp.adaptive_weld(route.seam)"), OPTIONS)).toEqual(["E309"]);
  });

  it("knows profiles through has()", () => {
    const source = lines(connect("rover"), 'if rover.has("flight"):', "    takeoff rover to 2m");
    expect(codes(source, OPTIONS)).toEqual([]);
  });
});

describe("native code (DECISIONS.md D20)", () => {
  it("warns that it is not portable and rejects it, since no 0.1 robot accepts it", () => {
    const d = checked(lines(connect("arm"), 'native("urscript", "set_tcp(p[0,0,0.12,0,0,0])")'), OPTIONS);
    expect(d.map((x) => [x.code, x.severity])).toEqual([
      ["E405", "error"],
      ["W602", "warning"],
    ]);
  });
});
