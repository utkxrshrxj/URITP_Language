// The one place that decides whether a program may run: it reads the program, the manifest of
// each robot and the site maps, and returns every problem, so nothing moves if there is an error.

import type { Diagnostic } from "../diagnostics/diagnostic.js";
import type { Program } from "../parser/ast.js";
import { parse } from "../parser/parser.js";
import { check, type SourceFile } from "./checker.js";
import { checkManifest } from "./manifest.js";
import type { RobotModel } from "./robot-model.js";

export interface ProgramCheckInput {
  readonly program: SourceFile;
  /** The manifest file of each robot, by the robot's name in the program (robot NAME = connect(...)). */
  readonly manifests: Readonly<Record<string, SourceFile>>;
  /** Site maps loaded before the program, such as site.uritp next to it (D16). */
  readonly siteMaps?: readonly SourceFile[];
  /** Reads a file named in an import, or returns null. */
  readonly readFile?: (path: string) => string | null;
}

export interface ProgramCheckResult {
  /** True only if there are no errors at all. Warnings (W6xx) do not stop a program. */
  readonly ok: boolean;
  readonly diagnostics: Diagnostic[];
  /** The syntax tree, for the code generator; null if the program could not be read. */
  readonly program: Program | null;
  /** The model of each robot, by its name in the program. */
  readonly models: ReadonlyMap<string, RobotModel>;
}

export function checkProgram(input: ProgramCheckInput): ProgramCheckResult {
  const parsed = parse(input.program.source);
  const models = new Map<string, RobotModel>();
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];

  // Each manifest is checked on its own; one with errors gives no model (null).
  const manifestModels = new Map<string, RobotModel | null>();
  for (const [robot, file] of Object.entries(input.manifests)) {
    const result = checkManifest(file.source, file.name);
    diagnostics.push(...result.diagnostics);
    manifestModels.set(robot, result.model);
    if (result.model !== null) models.set(robot, result.model);
  }

  // Name, type, capability and safety checks only make sense on a program with correct syntax.
  const syntaxOk = parsed.diagnostics.every((d) => d.severity !== "error");
  if (syntaxOk) {
    const result = check(parsed.program, {
      robots: (name) => manifestModels.get(name),
      ...(input.siteMaps === undefined ? {} : { siteMaps: input.siteMaps }),
      ...(input.readFile === undefined ? {} : { readFile: input.readFile }),
    });
    diagnostics.push(...result.diagnostics);
  }

  const ok = diagnostics.every((d) => d.severity !== "error");
  return { ok, diagnostics, program: syntaxOk ? parsed.program : null, models };
}
