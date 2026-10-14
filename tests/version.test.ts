// Checks that the test setup works and the version number has the usual x.y.z shape.
// This is the first test; real language tests arrive with the lexer in Phase 2.
import { describe, expect, it } from "vitest";
import { COMPILER_VERSION } from "../src/version.js";

describe("compiler version", () => {
  it("looks like major.minor.patch", () => {
    expect(COMPILER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
