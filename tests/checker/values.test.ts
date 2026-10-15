// Tests type and unit checks on values (E3xx): matching dimensions, no bare numbers where a
// quantity is needed, percent never mixing with numbers, and the standard library functions.
import { describe, expect, it } from "vitest";
import { checked, codes, firstMessage, lines } from "./helpers.js";

describe("units and dimensions", () => {
  it("accepts quantities of the same dimension", () => {
    expect(codes("let x = 10cm + 5mm")).toEqual([]);
    expect(codes("let fast = 1m/s > 50cm/s")).toEqual([]);
  });

  it("rejects mixing dimensions, like 10cm + 2s (Guidebook §3)", () => {
    expect(firstMessage("let x = 10cm + 2s")).toBe(
      "cannot add Length and Time / Both sides must be the same kind of value, like 10cm + 5mm.",
    );
    expect(codes("let x = 90deg < 2m")).toEqual(["E303"]);
  });

  it("rejects 90deg compared with a temperature", () => {
    expect(codes("let hot = 90deg > 80deg_c")).toEqual(["E303"]);
  });
});

describe("bare numbers (Guidebook §4)", () => {
  it("rejects distance < 20 and suggests 20cm, as in the Guidebook's E304 example", () => {
    const source = lines("let gap = 50cm", "let near = gap < 20");
    const d = checked(source);
    expect(d).toEqual([expect.objectContaining({ code: "E304", line: 2, args: { expected: "Length", value: "20", suggestion: "20cm" } })]);
    expect(firstMessage(source)).toBe("expected Length, got Number '20' / Did you mean 20cm?");
  });

  it("works whichever side the number is on", () => {
    expect(checked("let a = 20 < 1m")[0]?.args["suggestion"]).toBe("20cm");
    expect(checked("let t = 5 + 2s")[0]?.args["suggestion"]).toBe("5s");
  });

  it("suggests a percent for battery < 25", () => {
    const source = lines("let battery = 50%", "let low = battery < 25");
    expect(firstMessage(source)).toBe("expected Percent, got Number '25' / Did you mean 25%? Percent and plain numbers never mix.");
  });

  it("allows plain numbers with plain numbers", () => {
    expect(codes("let n = 3 + 2 > 4")).toEqual([]);
  });

  it("gives no unit suggestion for a number that is not written out", () => {
    const d = checked(lines("let n = 3", "let x = n + 2cm"));
    expect(d[0]).toMatchObject({ code: "E304", args: { value: "", suggestion: "" } });
  });
});

describe("percent", () => {
  it("accepts percents between 0% and 100%", () => {
    expect(codes("let a = 25% + 10%")).toEqual([]);
  });

  it("rejects a percent above 100%, also when worked out (DECISIONS.md D12)", () => {
    expect(codes("let a = 150%")).toEqual(["E308"]);
    expect(checked("let a = 60% + 50%")[0]).toMatchObject({ code: "E308", args: { value: "110%" } });
    expect(codes("let a = 10% - 20%")).toEqual(["E308"]);
  });

  it("refuses unary minus on a percent", () => {
    expect(codes("let a = -25%")).toEqual(["E302"]);
  });
});

describe("operators on other values", () => {
  it.each([
    ['let a = "a" + "b"', "E302"],
    ['let a = "a" < "b"', "E302"],
    ["let a = 5 and true", "E302"],
    ["let a = not 5", "E302"],
    ['let a = 5 == "five"', "E303"],
  ])("rejects %s", (source, code) => {
    expect(codes(source)).toEqual([code]);
  });

  it("explains how to join text", () => {
    expect(firstMessage('let a = "a" + "b"')).toContain('"Hello {name}"');
  });

  it.each(['let a = "idle" == "busy"', "let a = true != false", "let a = not (1 < 2) or 3 >= 3"])(
    "accepts %s",
    (source) => {
      expect(codes(source)).toEqual([]);
    },
  );
});

describe("names and rebinding", () => {
  it("rejects rebinding a name in the same block (Guidebook §4)", () => {
    const d = checked(lines("let x = 5cm", "let x = 6cm"));
    expect(d).toEqual([expect.objectContaining({ code: "E207", line: 2, args: { name: "x", line: "1" } })]);
  });

  it("rejects redefining a built-in name (DECISIONS.md D6)", () => {
    expect(codes("let places = 1")).toEqual(["E208"]);
    expect(codes("let pose = 1")).toEqual(["E208"]);
  });

  it("rejects an unknown name and suggests a close one", () => {
    const d = checked(lines("let target = 5cm", "let y = targt + 1cm"));
    expect(d[0]).toMatchObject({ code: "E202", args: { name: "targt", suggestion: "target" } });
  });

  it("rejects field and shelf maps (DECISIONS.md D17)", () => {
    expect(codes("let r = field.row(4)")).toEqual(["E212"]);
  });

  it("asks for brackets when a function is used as a value", () => {
    expect(codes("let p = now")).toEqual(["E306"]);
  });
});

describe("standard library calls (Guidebook §6)", () => {
  it.each([
    "let p = pose(1m, 2m, 0m)",
    "let p = pose(1m, 2m, 0m, yaw=90deg)",
    "let p = pose(1m, 2m, 0m, roll=0deg, pitch=0deg, yaw=1rad)",
    "let d = distance(pose(0m, 0m, 0m), pose(1m, 0m, 0m)) < 2m",
    "let t = now() >= 30min",
    "let n = len([1, 2, 3]) > 2",
    "let c = to(1.2m, cm) == 120cm",
    "let r = round(1.234m, cm)",
    "let s = text(5cm)",
    "let z = polygon(pose(0m, 0m, 0m), pose(1m, 0m, 0m), pose(1m, 1m, 0m))",
    "let up = pose(0m, 0m, 0m).above(10cm).offset(1cm, 0cm, 0cm)",
    "let h = pose(0m, 0m, 0m).handle",
  ])("accepts %s", (source) => {
    expect(codes(source)).toEqual([]);
  });

  it("wants lengths in pose()", () => {
    expect(checked("let p = pose(1, 2m, 0m)")[0]).toMatchObject({ code: "E304", args: { suggestion: "1cm" } });
    expect(codes("let p = pose(1m, 2m, 0m, yaw=90cm)")).toEqual(["E306"]);
  });

  it("counts arguments", () => {
    expect(checked("let p = pose(1m, 2m)")[0]).toMatchObject({ code: "E309", args: { expected: "3", got: "2" } });
  });

  it("rejects unknown named arguments", () => {
    expect(codes("let p = pose(1m, 2m, 0m, heading=90deg)")).toEqual(["E310"]);
  });

  it("checks the unit in to() and round()", () => {
    expect(codes("let a = to(1.2m, banana)")).toEqual(["E317"]);
    expect(codes("let a = to(1.2m, s)")).toEqual(["E318"]);
    expect(checked("let a = to(5, cm)")[0]).toMatchObject({ code: "E304", args: { suggestion: "5cm" } });
  });

  it("needs three corners for a polygon (DECISIONS.md D16)", () => {
    expect(codes("let z = polygon(pose(0m, 0m, 0m), pose(1m, 0m, 0m))")).toEqual(["E319"]);
  });

  it("explains a helper used without brackets", () => {
    expect(firstMessage("let p = pose(0m, 0m, 0m).above")).toContain("call it with brackets");
  });

  it("rejects a call of an unknown task or function", () => {
    expect(checked("let a = pos(1m, 2m, 0m)")[0]).toMatchObject({ code: "E210", args: { suggestion: "pose" } });
  });
});

describe("lists", () => {
  it("accepts lists of one kind", () => {
    expect(codes("let l = [1cm, 2m, 3mm]")).toEqual([]);
  });

  it("rejects lists that mix kinds", () => {
    expect(codes("let l = [1cm, 2s]")).toEqual(["E313"]);
  });
});

describe("text insertions", () => {
  it("accepts numbers, quantities and text", () => {
    expect(codes(lines("let n = 5", "let d = 2m", 'let t = "n={n} d={d}"'))).toEqual([]);
  });

  it("rejects a value that cannot be shown as text", () => {
    expect(checked(lines("let p = pose(0m, 0m, 0m)", 'let t = "at {p}"'))[0]).toMatchObject({
      code: "E315",
      args: { inside: "p", type: "Pose" },
    });
  });

  it("rejects an unknown name inside text", () => {
    expect(codes('let t = "hi {nobody}"')).toEqual(["E202"]);
  });
});

describe("objects (DECISIONS.md D4)", () => {
  it("treats an unknown name in front of an object property as an object", () => {
    expect(codes("let full = mug.fill >= 80%")).toEqual([]);
    expect(codes("let p = cup.above(10cm)")).toEqual([]);
  });

  it("still catches a typo of a name that exists", () => {
    expect(checked(lines("let kettle = pose(0m, 0m, 0m)", "let p = ketle.above(10cm)"))[0]).toMatchObject({
      code: "E202",
      args: { suggestion: "kettle" },
    });
  });

  it("rejects unknown properties of objects", () => {
    expect(codes("let c = mug.colour")).toEqual(["E202"]);
  });
});
