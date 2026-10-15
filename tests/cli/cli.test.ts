// Tests the uritp command line with files kept in memory: check, compile and run, binding robots
// to manifests, finding a site map next to the program, choosing a driver by folder, and Hindi.
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { runCli, type CliIO } from "../../src/cli/cli.js";
import { realClock } from "../../src/runtime/clock.js";
import { createDriver as createPlain, type CreateDriver } from "../../drivers/shared/plain-driver.js";

const lines = (...source: string[]): string => source.join("\n");
const ROVER = lines(
  'manifest "Test rover":',
  "    uritp 0.1",
  "    frame base: pose2d max_speed 0.5m/s",
  "    profiles [core, navigation]",
  "    safety max_speed 0.3m/s",
);
const FILES: Record<string, string> = {
  "work/main.uritp": lines('robot rover = connect("lab:rover")', "move rover.base to places.dock speed 0.2m/s", "turn rover.base by 90deg"),
  "work/site.uritp": "define place dock = pose(1m, 0m, 0m)",
  "work/fast.uritp": lines('robot rover = connect("lab:rover")', "drive rover.base forward by 1m speed 3m/s"),
  "work/two.uritp": lines('robot a = connect("x")', 'robot b = connect("y")', "drive a.base forward by 1m", "drive b.base backward by 1m"),
  "work/blocked.uritp": lines('robot rover = connect("lab:rover")', "drive rover.base forward by 5m"),
  "manifests/acme/rover.uritp": ROVER,
};

/** Runs the command line with in-memory files and returns what it printed and its exit code. */
async function cli(argv: string[], loadDriver: (folder: string) => Promise<CreateDriver | null> = async () => null) {
  const printed: string[] = [];
  const io: CliIO = {
    print: (text) => printed.push(text),
    readFile: (path) => FILES[path.replace(/^\.\//, "")] ?? null,
    loadDriver,
    clock: (speed) => realClock({ speed: speed * 1000 }),
  };
  const code = await runCli(parseArgs(argv), io);
  return { code, output: printed.join("\n") };
}

const ROBOT = ["--robot", "manifests/acme/rover.uritp"];

describe("uritp check", () => {
  it("finds no problems and uses site.uritp next to the program", async () => {
    expect(await cli(["check", "work/main.uritp", ...ROBOT])).toEqual({ code: 0, output: "No problems found." });
  });

  it("reports problems and exits with 1", async () => {
    const { code, output } = await cli(["check", "work/fast.uritp", ...ROBOT]);
    expect(code).toBe(1);
    expect(output).toContain("E502 (line 2): speed 3m/s exceeds safety limit 0.3m/s for 'rover'");
    expect(output).toContain("1 error(s), 0 warning(s).");
  });

  it("speaks Hindi with the same codes", async () => {
    const { output } = await cli(["check", "work/fast.uritp", ...ROBOT, "--lang", "hi"]);
    expect(output).toContain("E502 (लाइन 2): गति 3m/s, 'rover' की सुरक्षा सीमा 0.3m/s से ज़्यादा है");
    expect(output).toContain("1 त्रुटि, 0 चेतावनी।");
  });

  it("gives manifests to robots in the order they connect, or by name", async () => {
    expect((await cli(["check", "work/two.uritp", ...ROBOT, ...ROBOT])).code).toBe(0);
    expect((await cli(["check", "work/two.uritp", "--robot", "b=manifests/acme/rover.uritp", ...ROBOT])).code).toBe(0);
  });

  it("rejects a robot with no manifest", async () => {
    const { code, output } = await cli(["check", "work/two.uritp", ...ROBOT]);
    expect(code).toBe(1);
    expect(output).toContain("E201");
  });

  it.each([
    [["check", "work/missing.uritp", ...ROBOT], "uritp: cannot read 'work/missing.uritp'"],
    [["check", "work/main.uritp", "--robot", "nowhere.uritp"], "uritp: cannot read the manifest 'nowhere.uritp'"],
    [["check", "work/main.uritp", ...ROBOT, ...ROBOT], "uritp: there are more --robot manifests than robots in 'work/main.uritp'"],
    [["check", "work/main.uritp", ...ROBOT, "--site", "none.uritp"], "uritp: cannot read the site map 'none.uritp'"],
  ])("explains a usage problem and exits with 2", async (argv, message) => {
    expect(await cli(argv)).toEqual({ code: 2, output: message });
  });

  it("shows help", async () => {
    const { code, output } = await cli(["--help"]);
    expect(code).toBe(0);
    expect(output).toContain("uritp check   <file.uritp>");
  });
});

describe("uritp compile", () => {
  it("lists each robot's instructions in SI units", async () => {
    const { code, output } = await cli(["compile", "work/main.uritp", ...ROBOT]);
    expect(code).toBe(0);
    expect(output).toContain(lines("Instructions for rover (SI units):", "  MOVE frame=base target=pose(1,0,0,0,0,0) speed=0.2", "  TURN frame=base angle=1.57079632679"));
  });

  it("does not compile a program with errors", async () => {
    const { code, output } = await cli(["compile", "work/fast.uritp", ...ROBOT]);
    expect(code).toBe(1);
    expect(output).not.toContain("Instructions for");
  });
});

describe("uritp run", () => {
  it("runs on the driver found in drivers/<folder>/, printing each instruction", async () => {
    const asked: string[] = [];
    const { code, output } = await cli(["run", "work/main.uritp", ...ROBOT, "--protocol"], async (folder) => {
      asked.push(folder);
      return createPlain;
    });
    expect(asked).toEqual(["acme"]);
    expect(code).toBe(0);
    expect(output).toContain("rover <- MOVE frame=base target=pose(1,0,0,0,0,0) speed=0.2");
    expect(output).toContain("The program ended: succeeded.");
    expect(output).toContain("Lines the rover driver would send (simulator only, not tested on real hardware):");
  });

  it("reports a failure while running with its R7xx code", async () => {
    const blocking: CreateDriver = (options) =>
      createPlain({ ...options, zones: { wall: [{ x: 2, y: -1 }, { x: 3, y: -1 }, { x: 3, y: 1 }, { x: 2, y: 1 }] }, model: { ...options.model, safety: { forbiddenZones: [{ kind: "named", name: "wall" }] } } });
    const { code, output } = await cli(["run", "work/blocked.uritp", ...ROBOT], async () => blocking);
    expect(code).toBe(1);
    expect(output).toContain("The program ended: failed.");
    expect(output).toContain("R703 (line 2): a task failed while running: drive failed: E501");
  });
});
