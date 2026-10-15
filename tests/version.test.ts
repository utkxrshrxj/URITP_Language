// Checks that the version numbers have the expected shape, and agree with package.json and CHANGELOG.md.
// The language version must match what manifests declare, as in spec/GRAMMAR.md.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPILER_VERSION, URITP_VERSION } from "../src/version.js";

describe("compiler version", () => {
  it("looks like major.minor.patch", () => {
    expect(COMPILER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("is the same as the package version and the newest changelog entry", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    expect(pkg.version).toBe(COMPILER_VERSION);
    expect(changelog.match(/^## (\S+)/m)?.[1]).toBe(COMPILER_VERSION);
  });
});

describe("language version", () => {
  it("is URITP 0.1, the version in the Guidebook", () => {
    expect(URITP_VERSION).toBe("0.1");
  });
});
