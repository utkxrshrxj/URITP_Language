// Tests reading the command line: commands, the program file, --robot with and without names,
// --site, --lang, --speed and --protocol, and plain reasons for anything wrong.
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";

describe("parseArgs", () => {
  it("reads a check with one robot", () => {
    expect(parseArgs(["check", "main.uritp", "--robot", "arm.uritp"])).toEqual({
      command: "check",
      file: "main.uritp",
      robots: [{ name: null, manifest: "arm.uritp" }],
      sites: [],
      lang: "en",
      speed: 1,
      protocol: false,
    });
  });

  it("reads named robots, sites and every option", () => {
    expect(parseArgs(["run", "p.uritp", "--robot", "rover=r.uritp", "--robot", "arm=a.uritp", "--site", "s.uritp", "--lang", "hi", "--speed", "10", "--protocol"])).toEqual({
      command: "run",
      file: "p.uritp",
      robots: [{ name: "rover", manifest: "r.uritp" }, { name: "arm", manifest: "a.uritp" }],
      sites: ["s.uritp"],
      lang: "hi",
      speed: 10,
      protocol: true,
    });
  });

  it.each([[[]], [["help"]], [["--help"]], [["check", "x", "--help"]]])("shows help for %j", (argv) => {
    expect(parseArgs(argv)).toMatchObject({ command: "help" });
  });

  it.each([
    [["launch", "x"], "unknown command 'launch'"],
    [["check"], "check needs a program file"],
    [["check", "a", "b"], "only one program file can be given, but 'b' is a second one"],
    [["check", "a", "--robot"], "--robot needs a manifest file"],
    [["check", "a", "--lang", "fr"], "--lang must be en or hi"],
    [["run", "a", "--speed", "0"], "--speed must be a number above 0"],
    [["check", "a", "--fast"], "unknown option '--fast'"],
  ])("explains %j", (argv, error) => {
    expect(parseArgs(argv)).toEqual({ error });
  });
});
