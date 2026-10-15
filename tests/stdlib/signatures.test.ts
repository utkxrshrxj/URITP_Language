// Checks the standard library tables against Guidebook §6, so no built-in is missing
// and every helper has the right kind of arguments and result.
import { describe, expect, it } from "vitest";
import {
  ACTUATOR_PROPERTIES, BUILT_IN_NAMES, FUNCTIONS, OBJECT_PROPERTIES, POSE_HELPERS, ROBOT_PROPERTIES,
} from "../../src/stdlib/signatures.js";

describe("standard library", () => {
  it("has every built-in function of §6", () => {
    expect(Object.keys(FUNCTIONS).sort()).toEqual(
      ["distance", "len", "now", "polygon", "pose", "round", "text", "to"].sort(),
    );
  });

  it("has every pose helper of §6, each returning a Pose", () => {
    expect(Object.keys(POSE_HELPERS).sort()).toEqual(
      ["above", "at_height", "below", "beside", "in_front", "level", "offset"].sort(),
    );
    for (const helper of Object.values(POSE_HELPERS)) expect(helper.returns).toEqual({ kind: "Pose" });
  });

  it("takes lengths in the helpers that move a pose", () => {
    expect(POSE_HELPERS["above"]?.params[0]?.accepts).toEqual([{ kind: "Quantity", dimension: "Length" }]);
    expect(POSE_HELPERS["offset"]?.params).toHaveLength(3);
  });

  it("lets pose take roll, pitch and yaw as named angles", () => {
    const named = FUNCTIONS["pose"]?.params.filter((p) => p.named).map((p) => p.name);
    expect(named).toEqual(["roll", "pitch", "yaw"]);
  });

  it("gives the property types of §6", () => {
    expect(ROBOT_PROPERTIES["battery"]).toEqual({ kind: "Percent" });
    expect(OBJECT_PROPERTIES["fill"]).toEqual({ kind: "Percent" });
    expect(ACTUATOR_PROPERTIES["loaded"]).toEqual({ kind: "Bool" });
  });

  it("protects the built-in names (DECISIONS.md D6)", () => {
    expect(BUILT_IN_NAMES).toContain("places");
    expect(BUILT_IN_NAMES).toContain("error");
  });
});
