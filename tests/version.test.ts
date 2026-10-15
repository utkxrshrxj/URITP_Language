// Checks that the version numbers have the expected shape.
// The language version must match what manifests declare, as in spec/GRAMMAR.md.
import { describe, expect, it } from "vitest";
import { COMPILER_VERSION, URITP_VERSION } from "../src/version.js";

describe("compiler version", () => {
  it("looks like major.minor.patch", () => {
    expect(COMPILER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("language version", () => {
  it("is URITP 0.1, the version in the Guidebook", () => {
    expect(URITP_VERSION).toBe("0.1");
  });
});
