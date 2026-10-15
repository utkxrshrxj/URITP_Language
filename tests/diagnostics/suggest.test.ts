// Tests the spelling helper that powers "did you mean ...?" hints.
// Covers exact matches, small typos, case differences and words too far away to guess.
import { describe, expect, it } from "vitest";
import { closestMatch, editDistance } from "../../src/diagnostics/suggest.js";

describe("editDistance", () => {
  it("is 0 for the same word", () => {
    expect(editDistance("move", "move")).toBe(0);
  });

  it("counts one change for a missing, extra or wrong letter", () => {
    expect(editDistance("mve", "move")).toBe(1);
    expect(editDistance("moove", "move")).toBe(1);
    expect(editDistance("mave", "move")).toBe(1);
  });

  it("handles empty words", () => {
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "")).toBe(3);
  });
});

describe("closestMatch", () => {
  const statements = ["move", "say", "wait", "return_home"];

  it("finds a close typo", () => {
    expect(closestMatch("returnhome", statements)).toBe("return_home");
    expect(closestMatch("mvoe", statements)).toBe("move");
  });

  it("ignores upper and lower case", () => {
    expect(closestMatch("MOVE", statements)).toBe("move");
  });

  it("gives up when nothing is close", () => {
    expect(closestMatch("banana", statements)).toBeUndefined();
  });

  it("is stricter for short words", () => {
    expect(closestMatch("sy", statements)).toBe("say");
    expect(closestMatch("xy", statements)).toBeUndefined();
  });
});
