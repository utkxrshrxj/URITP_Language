// The uritp command line: check a program against its robots' manifests, list the instructions
// it compiles to, or run it on simulated robots. File access comes in through CliIO so it can be tested.

import { dirname, join, basename } from "node:path";
import { checkProgram, type ProgramCheckResult } from "../checker/check-program.js";
import type { SourceFile } from "../checker/checker.js";
import { constantPoint, constantPolygon, type Point } from "../checker/geometry.js";
import type { Corner } from "../checker/robot-model.js";
import { formatInstruction } from "../codegen/instruction.js";
import { formatDiagnostic, makeDiagnostic, type Diagnostic } from "../diagnostics/diagnostic.js";
import { ENGLISH, type MessageTable } from "../diagnostics/messages-en.js";
import { HINDI } from "../diagnostics/messages-hi.js";
import { parse } from "../parser/parser.js";
import { CancelSignal, realClock, type Clock } from "../runtime/clock.js";
import type { RobotPort } from "../runtime/robot-port.js";
import { Runner } from "../runtime/runner.js";
import type { Driver } from "../../drivers/shared/driver.js";
import { createDriver as createPlainDriver, type CreateDriver } from "../../drivers/shared/plain-driver.js";
import { USAGE, type CliOptions } from "./args.js";

export interface CliIO {
  print(text: string): void;
  /** The text of a file, or null if it cannot be read. */
  readFile(path: string): string | null;
  /** The driver in drivers/<folder>/, or null if there is none. */
  loadDriver(folder: string): Promise<CreateDriver | null>;
  /** Called once a run starts, so Ctrl+C can stop it. */
  onRunStart?(runner: Runner): void;
  /** The clock to run on; tests pass a fast one. */
  clock?(speed: number): Clock;
}

/** The command line's own words, in each language. Error messages come from the message tables. */
const WORDS = {
  en: {
    noProblems: "No problems found.",
    summary: (errors: number, warnings: number) => `${errors} error(s), ${warnings} warning(s).`,
    instructionsFor: (robot: string) => `Instructions for ${robot} (SI units):`,
    compileNote: "These are the instructions each robot would receive if every task succeeds, using the simulator's default readings.",
    ended: (state: string) => `The program ended: ${state}.`,
    reason: (why: string) => `Reason: ${why}`,
    protocolFor: (robot: string) => `Lines the ${robot} driver would send (simulator only, not tested on real hardware):`,
    simulated: "Simulated robots only. Nothing is sent to real hardware.",
  },
  hi: {
    noProblems: "कोई समस्या नहीं मिली।",
    summary: (errors: number, warnings: number) => `${errors} त्रुटि, ${warnings} चेतावनी।`,
    instructionsFor: (robot: string) => `${robot} के निर्देश (SI इकाइयों में):`,
    compileNote: "अगर हर task सफल हो, तो हर रोबोट को ये निर्देश मिलेंगे; सिम्युलेटर की तय रीडिंग के साथ।",
    ended: (state: string) => `प्रोग्राम खत्म हुआ: ${state}।`,
    reason: (why: string) => `कारण: ${why}`,
    protocolFor: (robot: string) => `${robot} का ड्राइवर ये लाइनें भेजता (सिर्फ़ सिम्युलेटर, असली हार्डवेयर पर परखा नहीं गया):`,
    simulated: "सिर्फ़ सिम्युलेट किए गए रोबोट। असली हार्डवेयर को कुछ नहीं भेजा जाता।",
  },
};

/** How long compile lets a program run, in program time, before stopping it (for endless loops). */
const COMPILE_TIME_LIMIT = 24 * 3600;

interface Loaded {
  readonly check: ProgramCheckResult;
  readonly manifestPaths: Readonly<Record<string, string>>;
  readonly siteMaps: readonly SourceFile[];
  readonly readFile: (path: string) => string | null;
}

/** Runs one command and returns the exit code: 0 success, 1 problems found or run failed, 2 bad usage. */
export async function runCli(options: CliOptions | { error: string }, io: CliIO): Promise<number> {
  if ("error" in options) {
    io.print(`uritp: ${options.error}\n\n${USAGE}`);
    return 2;
  }
  if (options.command === "help") {
    io.print(USAGE);
    return 0;
  }
  const table = options.lang === "hi" ? HINDI : ENGLISH;
  const words = WORDS[options.lang];

  const loaded = load(options, io);
  if (typeof loaded === "string") {
    io.print(`uritp: ${loaded}`);
    return 2;
  }
  printDiagnostics(loaded.check.diagnostics, table, io);

  if (options.command === "check" || !loaded.check.ok) {
    const errors = loaded.check.diagnostics.filter((d) => d.severity === "error").length;
    const warnings = loaded.check.diagnostics.length - errors;
    io.print(loaded.check.diagnostics.length === 0 ? words.noProblems : words.summary(errors, warnings));
    return loaded.check.ok ? 0 : 1;
  }
  return options.command === "compile" ? compile(loaded, options, io) : run(loaded, options, io);
}

/** Reads the program, its robots' manifests and its site maps, and checks them together. */
function load(options: CliOptions, io: CliIO): Loaded | string {
  const source = io.readFile(options.file);
  if (source === null) return `cannot read '${options.file}'`;
  const here = dirname(options.file);

  // Manifests: named ones by name, the rest in the order the program connects its robots.
  const robotNames = parse(source).program.statements.flatMap((s) => (s.kind === "Robot" ? [s.name] : []));
  const manifestPaths: Record<string, string> = {};
  for (const robot of options.robots.filter((r) => r.name !== null)) manifestPaths[robot.name as string] = robot.manifest;
  const unnamed = options.robots.filter((r) => r.name === null);
  for (const name of robotNames) {
    if (manifestPaths[name] !== undefined) continue;
    const next = unnamed.shift();
    if (next !== undefined) manifestPaths[name] = next.manifest;
  }
  if (unnamed.length > 0) return `there are more --robot manifests than robots in '${options.file}'`;

  const manifests: Record<string, SourceFile> = {};
  for (const [robot, path] of Object.entries(manifestPaths)) {
    const text = io.readFile(path);
    if (text === null) return `cannot read the manifest '${path}'`;
    manifests[robot] = { name: path, source: text };
  }

  // Site maps: the ones given, or site.uritp next to the program (DECISIONS.md D16).
  const sitePaths = options.sites.length > 0 ? options.sites : [join(here, "site.uritp")];
  const siteMaps: SourceFile[] = [];
  for (const path of sitePaths) {
    const text = io.readFile(path);
    if (text === null && options.sites.length > 0) return `cannot read the site map '${path}'`;
    if (text !== null) siteMaps.push({ name: path, source: text });
  }

  const readFile = (path: string): string | null => io.readFile(join(here, path));
  const check = checkProgram({ program: { name: options.file, source }, manifests, siteMaps, readFile });
  return { check, manifestPaths, siteMaps, readFile };
}

function printDiagnostics(diagnostics: readonly Diagnostic[], table: MessageTable, io: CliIO): void {
  for (const d of diagnostics) io.print(formatDiagnostic(d, table));
}

/** The corners of every zone the site maps define, for drivers that must stay out of them. */
function zonesFrom(siteMaps: readonly SourceFile[]): Record<string, Corner[]> {
  const places = new Map<string, Point>();
  const zones: Record<string, Corner[]> = {};
  for (const file of siteMaps) {
    for (const s of parse(file.source).program.statements) {
      if (s.kind !== "Define") continue;
      const lookup = (name: string): Point | null => places.get(name) ?? null;
      if (s.what === "place") {
        const point = constantPoint(s.value, lookup);
        if (point !== null) places.set(s.name, point);
      } else if (s.what === "zone") {
        const corners = constantPolygon(s.value, lookup);
        if (corners !== null) zones[s.name] = corners;
      }
    }
  }
  return zones;
}

/** compile: runs the program on plain simulated drivers and lists each robot's instructions. */
async function compile(loaded: Loaded, options: CliOptions, io: CliIO): Promise<number> {
  const words = WORDS[options.lang];
  const clock = io.clock?.(100_000) ?? realClock({ speed: 100_000 });
  const zones = zonesFrom(loaded.siteMaps);
  const drivers: Record<string, Driver> = {};
  for (const [name, model] of loaded.check.models) drivers[name] = createPlainDriver({ model, zones, clock });
  const runner = makeRunner(loaded, drivers, clock, io, false);
  const finished = new CancelSignal();
  const limit = clock.sleep(COMPILE_TIME_LIMIT, finished).then(() => {
    if (!finished.cancelled) void runner.stop("compile stopped the program after 24 hours of program time");
  });
  await runner.run();
  finished.cancel("done");
  await limit;
  for (const [name, driver] of Object.entries(drivers)) {
    io.print(words.instructionsFor(name));
    for (const line of driver.transport.lines) io.print(`  ${line}`);
  }
  io.print(words.compileNote);
  return 0;
}

/** run: runs the program on each robot's simulated driver, printing every instruction as it goes. */
async function run(loaded: Loaded, options: CliOptions, io: CliIO): Promise<number> {
  const words = WORDS[options.lang];
  const table = options.lang === "hi" ? HINDI : ENGLISH;
  const clock = io.clock?.(options.speed) ?? realClock({ speed: options.speed });
  const zones = zonesFrom(loaded.siteMaps);
  const drivers: Record<string, Driver> = {};
  for (const [name, model] of loaded.check.models) {
    // A manifest in manifests/<folder>/ uses the driver in drivers/<folder>/ when there is one.
    const folder = basename(dirname(loaded.manifestPaths[name] ?? ""));
    const create = /^[a-z0-9][a-z0-9-]*$/.test(folder) ? await io.loadDriver(folder) : null;
    drivers[name] = (create ?? createPlainDriver)({ model, zones, clock });
  }
  io.print(words.simulated);
  const runner = makeRunner(loaded, drivers, clock, io, true);
  io.onRunStart?.(runner);
  const result = await runner.run();

  io.print(words.ended(result.state));
  if (result.error !== null) {
    io.print(formatDiagnostic(makeDiagnostic(result.error.code, result.error.line, 1, { reason: result.error.reason }), table));
  } else if (result.reason !== "") {
    io.print(words.reason(result.reason));
  }
  if (options.protocol) {
    for (const [name, driver] of Object.entries(drivers)) {
      io.print(words.protocolFor(name));
      for (const line of driver.transport.lines) io.print(`  ${line}`);
    }
  }
  return result.state === "succeeded" ? 0 : 1;
}

/** A runner whose robot connections print each instruction (and, when `live`, how it ended). */
function makeRunner(loaded: Loaded, drivers: Record<string, Driver>, clock: Clock, io: CliIO, live: boolean): Runner {
  const ports: Record<string, RobotPort> = {};
  for (const [name, driver] of Object.entries(drivers)) ports[name] = live ? watched(name, driver, io) : driver;
  const program = loaded.check.program;
  if (program === null) throw new Error("a program that passed its checks always has a syntax tree");
  return new Runner({
    program,
    models: loaded.check.models,
    robots: ports,
    // The safety watcher's readings still reach each robot, but are not printed as instructions.
    safetyRobots: drivers,
    siteMaps: loaded.siteMaps,
    readFile: loaded.readFile,
    clock,
    output: live ? { log: (t) => io.print(`log: ${t}`), alert: (t) => io.print(`ALERT: ${t}`) } : { log: () => {}, alert: () => {} },
  });
}

/** Wraps a robot connection so each instruction and its final state are printed, with the robot's name. */
function watched(name: string, port: RobotPort, io: CliIO): RobotPort {
  return {
    run: async (instr, update) => {
      io.print(`${name} <- ${formatInstruction(instr)}`);
      let final = "";
      await port.run(instr, (u) => {
        if (u.state === "succeeded" || u.state === "failed" || u.state === "cancelled") final = u.reason === undefined ? u.state : `${u.state}: ${u.reason}`;
        update(u);
      });
      io.print(`${name} -> ${final}`);
    },
    stop: async () => {
      io.print(`${name} <- STOP`);
      await port.stop();
    },
  };
}
