// Checks what a manifest means (Guidebook §9.1, §9.3) and turns it into a robot model.
// Reports E41x problems, such as a missing core profile or a max_speed that is not a speed.

import { inFile, makeDiagnostic, type Diagnostic, type DiagnosticArgs } from "../diagnostics/diagnostic.js";
import { closestMatch } from "../diagnostics/suggest.js";
import { isKeyword } from "../lexer/keywords.js";
import type { Position } from "../parser/ast.js";
import { parseManifest, type Manifest, type ManifestValue } from "../parser/manifest.js";
import type { Quantity } from "../stdlib/quantity.js";
import { BUILT_IN_NAMES } from "../stdlib/signatures.js";
import { DIMENSIONS, SUGGESTED_UNIT, UNITS, type Dimension } from "../stdlib/units.js";
import { constantPolygon } from "./geometry.js";
import type {
  ActuatorModel,
  ExtensionModel,
  ForbiddenZone,
  FrameModel,
  RobotModel,
  SensorModel,
} from "./robot-model.js";

/** The URITP version this compiler understands. */
const SUPPORTED_VERSION = "0.1";

/** The standard profiles of Guidebook §7. */
export const PROFILES = ["core", "navigation", "manipulation", "flight", "legged", "speech", "vision", "tooling"];

const FRAME_TYPES = ["pose2d", "pose3d", "pose6d"];

/** Types an extension parameter may have (TYPES_AND_UNITS.md section 2). */
const PARAMETER_TYPES = ["Number", "Percent", "Bool", "Text", "Pose", "Place", "Zone", "Route", "Object", "Robot"];

/** What each manifest value must measure. */
const VALUE_DIMENSIONS: Readonly<Record<string, Dimension>> = {
  reach: "Length",
  max_speed: "Speed",
  payload: "Mass",
  max_force: "Force",
};

export interface ManifestCheckResult {
  /** The robot model, or null if the manifest has any error (it cannot be trusted then). */
  readonly model: RobotModel | null;
  readonly diagnostics: Diagnostic[];
}

/** True if `type` is a parameter type an extension may declare, like Route or Quantity<Current>. */
function knownParameterType(type: string): boolean {
  const inner = /^(Quantity|List)<(.+)>$/.exec(type);
  if (inner === null) return PARAMETER_TYPES.includes(type);
  const [, outer, argument] = inner;
  if (outer === "Quantity") return (DIMENSIONS as readonly string[]).includes(argument ?? "");
  return knownParameterType(argument ?? "");
}

/** Checks a parsed manifest and builds the robot model it describes. */
export function manifestToModel(manifest: Manifest): ManifestCheckResult {
  const diagnostics: Diagnostic[] = [];
  const report = (code: string, at: Position, args: DiagnosticArgs = {}): void => {
    diagnostics.push(makeDiagnostic(code, at.line, at.column, args));
  };

  /** A quantity of the right dimension, or null after reporting why not. */
  const quantityOf = (value: ManifestValue, what: string): Quantity | null => {
    const dimension = VALUE_DIMENSIONS[what] as Dimension;
    if (value.kind === "Number") {
      report("E304", value, { expected: dimension, value: value.raw, suggestion: `${value.raw}${SUGGESTED_UNIT[dimension]}` });
      return null;
    }
    const actual = UNITS[value.unit]?.dimension;
    if (actual !== dimension) {
      report("E414", value, { what, expected: dimension, got: actual ?? "an unknown unit" });
      return null;
    }
    return { value: value.value, unit: value.unit };
  };

  const frames: Record<string, FrameModel> = {};
  const actuators: Record<string, ActuatorModel> = {};
  const sensors: Record<string, SensorModel> = {};
  const extensions: Record<string, ExtensionModel> = {};
  let profiles: string[] | null = null;
  let version: string | null = null;
  let maxSpeed: Quantity | undefined;
  const forbiddenZones: ForbiddenZone[] = [];

  const unique = (table: Record<string, unknown>, name: string, what: string, at: Position): boolean => {
    if (table[name] === undefined) return true;
    report("E415", at, { what: `${what} '${name}'` });
    return false;
  };

  for (const entry of manifest.entries) {
    switch (entry.kind) {
      case "uritp":
        if (version !== null) report("E415", entry, { what: "uritp" });
        version = entry.version;
        if (entry.version !== SUPPORTED_VERSION) report("E410", entry, { version: entry.version });
        break;

      case "frame": {
        if (!FRAME_TYPES.includes(entry.frameType.name)) {
          report("E413", entry.frameType, { type: entry.frameType.name, suggestion: closestMatch(entry.frameType.name, FRAME_TYPES) ?? "" });
        }
        const frame: { -readonly [K in keyof FrameModel]: FrameModel[K] } = { type: entry.frameType.name as FrameModel["type"] };
        for (const option of entry.options) {
          const q = quantityOf(option.value, option.name);
          if (q === null) continue;
          if (option.name === "reach") frame.reach = q;
          else if (option.name === "max_speed") frame.maxSpeed = q;
          else frame.payload = q;
        }
        if (unique(frames, entry.name, "frame", entry)) frames[entry.name] = frame;
        break;
      }

      case "actuator": {
        const actuator: { -readonly [K in keyof ActuatorModel]: ActuatorModel[K] } = { states: entry.states };
        if (entry.maxForce !== null) {
          const q = quantityOf(entry.maxForce, "max_force");
          if (q !== null) actuator.maxForce = q;
        }
        if (unique(actuators, entry.name, "actuator", entry)) actuators[entry.name] = actuator;
        break;
      }

      case "sensor": {
        let dimension: Dimension | null = null;
        if (entry.dimension !== null) {
          const name = entry.dimension.name;
          if ((DIMENSIONS as readonly string[]).includes(name)) dimension = name as Dimension;
          else report("E416", entry.dimension, { name, suggestion: closestMatch(name, DIMENSIONS) ?? "" });
        }
        if (unique(sensors, entry.name, "sensor", entry)) sensors[entry.name] = { kind: entry.sensorKind, dimension };
        break;
      }

      case "profiles":
        if (profiles !== null) report("E415", entry, { what: "profiles" });
        profiles = [];
        for (const profile of entry.profiles) {
          if (!PROFILES.includes(profile.name)) {
            report("E412", profile, { profile: profile.name, suggestion: closestMatch(profile.name, PROFILES) ?? "" });
          } else if (!profiles.includes(profile.name)) {
            profiles.push(profile.name);
          }
        }
        if (!profiles.includes("core") && entry.profiles.every((p) => PROFILES.includes(p.name))) report("E411", entry);
        break;

      case "extension": {
        const name = `${entry.vendor}.${entry.feature}`;
        // Vendor features are named vendor.feature in lower case and never reuse a URITP name (§7, §9.3 rule 8).
        const standard = isKeyword(entry.vendor) || BUILT_IN_NAMES.includes(entry.vendor) || PROFILES.includes(entry.vendor);
        if (name !== name.toLowerCase() || standard) report("E418", entry, { name });
        for (const param of entry.params) {
          if (!knownParameterType(param.type)) report("E417", param, { type: param.type, name: param.name });
        }
        if (unique(extensions, name, "extension", entry)) {
          extensions[name] = { params: entry.params.map((p) => ({ name: p.name, type: p.type })) };
        }
        break;
      }

      case "safety_max_speed": {
        if (maxSpeed !== undefined) report("E415", entry, { what: "safety max_speed" });
        const q = quantityOf(entry.value, "max_speed");
        if (q !== null) maxSpeed = q;
        break;
      }

      case "safety_forbidden_zone": {
        const zone = entry.zone;
        if (zone.kind === "Member" && zone.object.kind === "Name" && zone.object.name === "zones") {
          forbiddenZones.push({ kind: "named", name: zone.name });
        } else {
          const corners = constantPolygon(zone);
          if (corners === null) report("E419", zone);
          else forbiddenZones.push({ kind: "polygon", corners });
        }
        break;
      }
    }
  }

  if (version === null) report("E410", manifest, { version: "" });
  if (profiles === null) report("E411", manifest);

  if (diagnostics.length > 0) return { model: null, diagnostics };
  const safety = maxSpeed === undefined ? { forbiddenZones } : { maxSpeed, forbiddenZones };
  const model: RobotModel = {
    name: manifest.name,
    frames,
    actuators,
    sensors,
    profiles: profiles ?? [],
    extensions,
    safety,
  };
  return { model, diagnostics };
}

/** Reads, parses and checks a manifest file. Problems name the file when `file` is given. */
export function checkManifest(source: string, file?: string): ManifestCheckResult {
  const parsed = parseManifest(source);
  const checked = parsed.manifest === null ? { model: null, diagnostics: [] } : manifestToModel(parsed.manifest);
  const all = [...parsed.diagnostics, ...checked.diagnostics].sort((a, b) => a.line - b.line || a.column - b.column);
  const diagnostics = file === undefined ? all : all.map((d) => inFile(d, file));
  return { model: all.length > 0 ? null : checked.model, diagnostics };
}
