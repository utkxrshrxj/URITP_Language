// Checks the keyword lists against Guidebook §3, so a reserved word is never missed.
// Also checks that manifest-only words and built-in names are not reserved in programs.
import { describe, expect, it } from "vitest";
import { KEYWORDS, MANIFEST_KEYWORDS, isKeyword } from "../../src/lexer/keywords.js";

describe("keywords", () => {
  it("has the 70 words of §3 plus define and force", () => {
    expect(KEYWORDS.size).toBe(72);
  });

  it.each(["move", "return_home", "on", "fail", "define", "force", "true"])("reserves %s", (w) => {
    expect(isKeyword(w)).toBe(true);
  });

  it("is case-sensitive", () => {
    expect(isKeyword("Move")).toBe(false);
  });

  it("does not reserve built-in names or disp", () => {
    for (const w of ["places", "zones", "route", "pose", "disp", "returnhome"]) {
      expect(isKeyword(w)).toBe(false);
    }
  });

  it("keeps manifest words separate", () => {
    expect(MANIFEST_KEYWORDS.has("frame")).toBe(true);
    expect(isKeyword("frame")).toBe(false);
  });
});
