// The English wording of every error and warning, keyed by code (E101, E102, ...).
// Each entry has a plain-language message and a suggested fix, as Guidebook §8 asks.

import type { DiagnosticArgs } from "./diagnostic.js";

export interface MessageEntry {
  message(args: DiagnosticArgs): string;
  fix(args: DiagnosticArgs): string;
}

export interface MessageTable {
  /** The word printed before the suggested fix, e.g. "Fix". */
  readonly fixLabel: string;
  readonly messages: Readonly<Record<string, MessageEntry>>;
}

/** Reads one detail; missing details become empty text so a message never shows "undefined". */
const arg = (args: DiagnosticArgs, key: string): string => args[key] ?? "";

/** The message for a robot part that does not exist: E203 (frame), E204 (actuator), E205 (sensor). */
function partMessage(part: string, plural: string): MessageEntry {
  return {
    message: (a) => `robot '${arg(a, "robot")}' has no ${part} '${arg(a, "name")}'`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : arg(a, "known") !== ""
          ? `Its ${plural} are: ${arg(a, "known")}.`
          : `This robot has no ${plural}.`,
  };
}

const messages: Record<string, MessageEntry> = {
  // ---- E1xx: syntax (how the program is written) ----
  E101: {
    message: (a) => `expected ':' after ${arg(a, "after")}`,
    fix: () => "Add ':' at the end of the line. A line that opens a block always ends with ':'.",
  },
  E102: {
    message: () => "a tab character is used here",
    fix: () => "Use spaces instead: 4 spaces for each level of indentation. Tabs are not allowed, so code looks the same in every editor.",
  },
  E103: {
    message: (a) => `this line is indented by ${arg(a, "spaces")} spaces, which is not a multiple of 4`,
    fix: () => "Indent with exactly 4 spaces for each level.",
  },
  E104: {
    message: () => "expected an indented block after the line ending in ':'",
    fix: () => "Indent the lines of the block by 4 more spaces than the line with ':'. A block cannot be empty.",
  },
  E105: {
    message: () => "this line is indented more than expected",
    fix: () => "Line it up with the statement above. A line that continues a statement is indented exactly 4 spaces more than that statement.",
  },
  E106: {
    message: () => "this line does not line up with any block above it",
    fix: () => "Use the same indentation as one of the lines above it.",
  },
  E107: {
    message: () => "a line that ends in ':' must start its own statement",
    fix: () => "If this line starts a new statement, line it up with the statement above. A line that opens a block cannot be split over several lines.",
  },
  E110: {
    message: (a) => `'${arg(a, "unit")}' is not a unit`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean ${arg(a, "number")}${arg(a, "suggestion")}?`
        : arg(a, "keyword") !== ""
          ? `Put a space between the number and '${arg(a, "keyword")}': ${arg(a, "number")} ${arg(a, "keyword")}.`
          : "Write a unit right after the number, like 10cm, 0.5m/s, 90deg or 2min. The full list is in spec/TYPES_AND_UNITS.md.",
  },
  E111: {
    message: (a) => `there is a space between ${arg(a, "number")} and '${arg(a, "unit")}'`,
    fix: (a) => `Write ${arg(a, "number")}${arg(a, "unit")} with no space.`,
  },
  E112: {
    message: () => "this text has no closing '\"'",
    fix: () => "Add '\"' at the end of the text. Text must fit on one line.",
  },
  E113: {
    message: (a) => `'{${arg(a, "inside")}}' cannot be inserted into text`,
    fix: () => "Inside { } write only a name or a dotted name, like {name} or {point.id}. A '{' always starts an insertion.",
  },
  E114: {
    message: () => "'}' has no matching '{'",
    fix: () => "Remove the '}'. Text cannot contain '{' or '}' on their own.",
  },
  E115: {
    message: (a) => `'${arg(a, "char")}' is not allowed here`,
    fix: (a) => arg(a, "fix") !== "" ? arg(a, "fix") : "Remove this character.",
  },
  E116: {
    message: (a) => `'${arg(a, "number")}' is not a valid number`,
    fix: () => "Write numbers like 3, 0.5 or 120, with a digit on both sides of the decimal point.",
  },
  E120: {
    message: (a) => `expected ${arg(a, "expected")} but found ${arg(a, "found")}`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : arg(a, "form") !== ""
          ? `Write it as: ${arg(a, "form")}`
          : "Check the spelling and the order of the words.",
  },
  E121: {
    message: (a) => `'${arg(a, "word")}' is not a URITP statement`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : arg(a, "suggestion") !== ""
          ? `Did you mean '${arg(a, "suggestion")}'?`
          : "A line starts with a statement word such as move, say or wait, or with a call such as pick_and_place(cup, tray).",
  },
  E122: {
    message: () => "only a call can stand on its own line",
    fix: () => "Use this value inside a statement, for example: let x = ... or log ...",
  },
  E123: {
    message: (a) => `'${arg(a, "word")}' is a keyword, so it cannot be used as a name`,
    fix: () => "Choose a different name. Keywords are reserved for URITP itself.",
  },
  E124: {
    message: (a) => `'${arg(a, "clause")}' is given more than once`,
    fix: (a) => `Keep only one '${arg(a, "clause")}'.`,
  },
  E125: {
    message: () => "comparisons cannot be chained",
    fix: () => "Join two comparisons with 'and', for example: a < b and b < c",
  },
  E126: {
    message: () => "a plain argument cannot come after a name=value argument",
    fix: () => "Put plain arguments first, then name=value arguments, like pose(1m, 2m, 0m, yaw=90deg).",
  },
  E127: {
    message: (a) => `'${arg(a, "statement")}' can only be used ${arg(a, "where")}`,
    fix: (a) => arg(a, "fix"),
  },
  E128: {
    message: () => "'on fail' must be the last thing in its block",
    fix: () => "Move 'on fail:' below the other statements of the block it protects.",
  },
  E129: {
    message: () => "'ask' can only be used as: let NAME = ask \"QUESTION\"",
    fix: () => "Store the answer first, for example: let answer = ask \"Which room?\"",
  },
  E130: {
    message: (a) => `the ${arg(a, "what")} must be plain text without { }`,
    fix: (a) => `Write the ${arg(a, "what")} as fixed text, so it can be checked before the program runs.`,
  },
  E132: {
    message: (a) => `'${arg(a, "word")}' is not a manifest entry`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : "A manifest entry starts with uritp, frame, actuator, sensor, profiles, extension or safety.",
  },
  E131: {
    message: (a) => `'${arg(a, "word")}' is not a safety action`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'? A safety rule is written: ACTION when CONDITION.`
        : "A safety rule is written: ACTION when CONDITION. The actions are stop, return_home, land and alert.",
  },

  // ---- E2xx: names ----
  E201: {
    message: (a) => `there is no manifest for robot '${arg(a, "robot")}' (connect("${arg(a, "address")}"))`,
    fix: () => "Give the checker this robot's manifest. It needs it to know what the robot can do before anything moves.",
  },
  E202: {
    message: (a) => `'${arg(a, "name")}' is not defined`,
    fix: (a) =>
      arg(a, "elsewhere") !== ""
        ? `'${arg(a, "name")}' is defined on line ${arg(a, "elsewhere")}, but only inside its own block, so it cannot be used here.`
        : arg(a, "suggestion") !== ""
          ? `Did you mean '${arg(a, "suggestion")}'?`
          : "Define it above this line, with let, robot or task.",
  },
  E203: partMessage("frame", "frames"),
  E204: partMessage("actuator", "actuators"),
  E205: partMessage("sensor", "sensors"),
  E206: {
    message: (a) => `robot '${arg(a, "robot")}' has no part or property called '${arg(a, "name")}'`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : `Every robot has .battery, .state, .pose and .frames.${arg(a, "known") !== "" ? ` Its parts are: ${arg(a, "known")}.` : ""}`,
  },
  E207: {
    message: (a) => `'${arg(a, "name")}' is already used in this block, on line ${arg(a, "line")}`,
    fix: () => "A name cannot be given a new value. Choose a different name.",
  },
  E208: {
    message: (a) => `'${arg(a, "name")}' is a built-in name, so it cannot be redefined`,
    fix: () => "Choose a different name.",
  },
  E209: {
    message: (a) => `there is no ${arg(a, "kind")} called '${arg(a, "name")}' in the site map`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : `Define it in a site map, like: define ${arg(a, "kind")} ${arg(a, "name")} = ...`,
  },
  E210: {
    message: (a) => `there is no task or function called '${arg(a, "name")}'`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : arg(a, "suggestion") !== ""
          ? `Did you mean '${arg(a, "suggestion")}'?`
          : "Define the task above the line that calls it, with task NAME(PARAMS):",
  },
  E211: {
    message: (a) => `'${arg(a, "name")}' is not a property of ${arg(a, "owner")}`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : "Check the spelling. The properties of each kind of value are listed in Guidebook §6.",
  },
  E212: {
    message: (a) => `'${arg(a, "name")}' maps are not supported in URITP 0.1`,
    fix: () => "Use places, zones and routes from a site map instead.",
  },
  E213: {
    message: (a) => `cannot find the file '${arg(a, "file")}'`,
    fix: () => "Check the file name. Files are looked up next to the program.",
  },
  E214: {
    message: (a) => `'${arg(a, "file")}' is imported in a circle: ${arg(a, "chain")}`,
    fix: () => "Remove one of these imports, so files do not import each other.",
  },
  E215: {
    message: (a) => `${arg(a, "file")} may only contain ${arg(a, "allowed")}`,
    fix: () => "Move everything else into the main program.",
  },
  E216: {
    message: () => "'error' can only be used inside on fail:",
    fix: () => "error holds the reason a task failed, so it only exists inside an on fail: block.",
  },

  // ---- E3xx: types and units ----
  E301: {
    message: (a) => `cannot ${arg(a, "op")} ${arg(a, "left")} and ${arg(a, "right")}`,
    fix: () => "Both sides must be the same kind of value, like 10cm + 5mm.",
  },
  E302: {
    message: (a) => `'${arg(a, "op")}' cannot be used with ${arg(a, "type")}`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : "spec/TYPES_AND_UNITS.md section 3 lists which operators work on which values.",
  },
  E303: {
    message: (a) => `cannot compare ${arg(a, "left")} with ${arg(a, "right")}`,
    fix: () => "Compare values of the same kind, like distance < 20cm.",
  },
  E304: {
    message: (a) =>
      `expected ${arg(a, "expected")}, got Number${arg(a, "value") !== "" ? ` '${arg(a, "value")}'` : ""}`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean ${arg(a, "suggestion")}?`
        : "Give the value a unit, like 10cm or 2s.",
  },
  E305: {
    message: (a) => `expected Percent, got Number${arg(a, "value") !== "" ? ` '${arg(a, "value")}'` : ""}`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean ${arg(a, "suggestion")}? Percent and plain numbers never mix.`
        : "Percent and plain numbers never mix. Write percents with %, like 25%.",
  },
  E306: {
    message: (a) => `expected ${arg(a, "expected")} for ${arg(a, "slot")}, got ${arg(a, "got")}`,
    fix: (a) =>
      arg(a, "fix") !== ""
        ? arg(a, "fix")
        : "spec/TYPES_AND_UNITS.md section 4 lists what each statement expects.",
  },
  E307: {
    message: (a) => `the condition of '${arg(a, "slot")}' must be true or false, but this is ${arg(a, "got")}`,
    fix: () => "Use a comparison, like distance < 20cm, or a true/false value, like rover.tray.loaded.",
  },
  E308: {
    message: (a) => `${arg(a, "value")} is outside 0% to 100%`,
    fix: () => "A percent must be between 0% and 100%.",
  },
  E309: {
    message: (a) => `${arg(a, "what")} takes ${arg(a, "expected")} values in brackets, but ${arg(a, "got")} were given`,
    fix: () => "Check how many values go between the brackets.",
  },
  E310: {
    message: (a) => `${arg(a, "what")} has no argument called '${arg(a, "name")}'`,
    fix: () => "Remove it or check the spelling.",
  },
  E311: {
    message: (a) => `the name in ${arg(a, "what")} must be fixed text in double quotes`,
    fix: () => 'Write it like .has("vision") or .sense("thermal"), so it can be checked before the program runs.',
  },
  E312: {
    message: (a) => `repeat ${arg(a, "value")} times is not possible`,
    fix: () => "The number of times must be a whole number, 0 or more.",
  },
  E313: {
    message: (a) => `a list cannot mix ${arg(a, "first")} and ${arg(a, "other")}`,
    fix: () => "Put only one kind of value in a list.",
  },
  E314: {
    message: (a) => `task '${arg(a, "task")}' returns ${arg(a, "first")} in one place and ${arg(a, "other")} in another`,
    fix: () => "Return the same kind of value everywhere in the task, or no value at all.",
  },
  E315: {
    message: (a) => `{${arg(a, "inside")}} is ${arg(a, "type")}, which cannot be shown as text`,
    fix: () => "Insert a number, a quantity, text or a name such as {checkpoint.name}.",
  },
  E316: {
    message: (a) => `'${arg(a, "code")}' is not a language code`,
    fix: () => "Use a short language code of 2 or 3 lower-case letters, such as en, hi, ar or es.",
  },
  E317: {
    message: (a) => `the second value of ${arg(a, "what")} must be a unit, like cm`,
    fix: () => "Write the unit without quotes, like to(1.2m, cm).",
  },
  E318: {
    message: (a) => `cannot convert ${arg(a, "from")} to '${arg(a, "unit")}'`,
    fix: () => "Convert only to a unit of the same kind, like a Length to cm.",
  },
  E319: {
    message: (a) => `a polygon needs at least 3 corners, but this one has ${arg(a, "count")}`,
    fix: () => "Give three or more poses.",
  },
  E320: {
    message: (a) => `task '${arg(a, "task")}' does not return a value`,
    fix: () => "Add 'return VALUE' to the task, or call it on its own line.",
  },

  // ---- E4xx: capabilities (Guidebook §7, §9.3) ----
  E401: {
    message: (a) => `'${arg(a, "what")}' requires profile '${arg(a, "profile")}'; ${arg(a, "robot")} supports [${arg(a, "supported")}]`,
    fix: () => "Use a robot whose manifest has this profile, or leave this statement out.",
  },
  E402: {
    message: (a) => `no connected robot has the extension '${arg(a, "name")}'`,
    fix: (a) => `Use a robot whose manifest lists it, or guard it with if ROBOT.has("${arg(a, "name")}"): and give a fallback in else:.`,
  },
  E403: {
    message: (a) => `more than one connected robot could run '${arg(a, "what")}': ${arg(a, "robots")}`,
    fix: () => "This statement does not name a robot, so only one connected robot may be able to run it.",
  },
  E404: {
    message: (a) => `no connected robot can run '${arg(a, "what")}', which needs profile '${arg(a, "profile")}'`,
    fix: () => "Connect a robot whose manifest has this profile.",
  },
  E405: {
    message: () => "no URITP 0.1 robot accepts native code",
    fix: () => "Use a URITP statement or a vendor extension instead.",
  },
  E406: {
    message: (a) => `speed ${arg(a, "speed")} is faster than frame '${arg(a, "frame")}' of '${arg(a, "robot")}' can move (max_speed ${arg(a, "limit")})`,
    fix: (a) => `Use a speed of at most ${arg(a, "limit")}. A robot never does a different motion instead (Guidebook §9.3 rule 4).`,
  },
  E407: {
    message: (a) => `force ${arg(a, "force")} is more than actuator '${arg(a, "actuator")}' of '${arg(a, "robot")}' can apply (max_force ${arg(a, "limit")})`,
    fix: (a) => `Use a force of at most ${arg(a, "limit")}.`,
  },
  E408: {
    message: (a) => `actuator '${arg(a, "actuator")}' of '${arg(a, "robot")}' has no state '${arg(a, "state")}'`,
    fix: (a) => `Its states are: ${arg(a, "states")}. grip ... open needs the state open, and grip ... close needs closed.`,
  },

  // ---- E41x: problems in a manifest (Guidebook §9.1) ----
  E410: {
    message: (a) =>
      arg(a, "version") === ""
        ? "the manifest does not say which URITP version it follows"
        : `the manifest is for URITP ${arg(a, "version")}, but this compiler understands URITP 0.1`,
    fix: () => "Add the line: uritp 0.1",
  },
  E411: {
    message: () => "the manifest must list its profiles, including core",
    fix: () => "Add a line like: profiles [core, navigation]. Every robot supports core (Guidebook §7).",
  },
  E412: {
    message: (a) => `'${arg(a, "profile")}' is not a URITP profile`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : "The profiles are core, navigation, manipulation, flight, legged, speech, vision and tooling. Vendor features go in extensions.",
  },
  E413: {
    message: (a) => `'${arg(a, "type")}' is not a frame type`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : "A frame type is pose2d (on a plane), pose3d (position in space) or pose6d (position and orientation).",
  },
  E414: {
    message: (a) => `${arg(a, "what")} must be a ${arg(a, "expected")}, but this is a ${arg(a, "got")}`,
    fix: () => "Use a unit of the right kind: reach in m, max_speed in m/s, payload in kg, max_force in N.",
  },
  E415: {
    message: (a) => `${arg(a, "what")} is listed more than once`,
    fix: () => "Keep only one of them.",
  },
  E416: {
    message: (a) => `'${arg(a, "name")}' is not a dimension`,
    fix: (a) =>
      arg(a, "suggestion") !== ""
        ? `Did you mean '${arg(a, "suggestion")}'?`
        : "Use one of: Length, Angle, Time, Speed, AngularSpeed, Mass, Force, Current, Volume, Temperature.",
  },
  E417: {
    message: (a) => `'${arg(a, "type")}' is not a type that '${arg(a, "name")}' can have`,
    fix: () => "Use a URITP type such as Number, Text, Pose, Place, Route, Object or Quantity<Length>.",
  },
  E418: {
    message: (a) => `the extension name '${arg(a, "name")}' is not allowed`,
    fix: () => "Name extensions vendor.feature in lower case, with a vendor name that is not a URITP word (Guidebook §9.3 rule 8).",
  },
  E419: {
    message: () => "a forbidden zone must be zones.NAME or a polygon with fixed corners",
    fix: () => "Write it like: safety forbidden_zone zones.icu, or polygon(pose(0m, 0m, 0m), pose(1m, 0m, 0m), pose(1m, 1m, 0m)).",
  },

  // ---- E5xx: safety (Guidebook §9.1, §9.3 rule 6) ----
  E501: {
    message: (a) =>
      arg(a, "zone") !== ""
        ? `this target is inside the forbidden zone '${arg(a, "zone")}' of '${arg(a, "robot")}'`
        : `this target is inside a forbidden zone from the manifest of '${arg(a, "robot")}'`,
    fix: () => "Choose a target outside the zone. A program can never switch a forbidden zone off.",
  },
  E502: {
    message: (a) => `speed ${arg(a, "speed")} exceeds safety limit ${arg(a, "limit")} for '${arg(a, "robot")}'`,
    fix: (a) => `Use a speed of at most ${arg(a, "limit")}. A program can never switch safety limits off (Guidebook §9.3 rule 6).`,
  },
  E503: {
    message: (a) => `the manifest of '${arg(a, "robot")}' forbids zone '${arg(a, "zone")}', but the site map does not define it`,
    fix: (a) => `Define zone ${arg(a, "zone")} in the site map with fixed corners, so the robot can be kept out of it.`,
  },

  // ---- R7xx: failures while running, delivered to on fail: (Guidebook §8) ----
  R701: {
    message: (a) => `the robot refused an instruction: ${arg(a, "reason")}`,
    fix: () => "Check that the program was checked against this robot's manifest.",
  },
  R702: {
    message: (a) => `a wait timed out: ${arg(a, "reason")}`,
    fix: () => "Handle it in on fail:, or give the condition more time.",
  },
  R703: {
    message: (a) => `a task failed while running: ${arg(a, "reason")}`,
    fix: () => "Handle it in on fail:, for example by going back to a safe place.",
  },
  R704: {
    message: (a) => `the robot broke the task lifecycle: ${arg(a, "reason")}`,
    fix: () => "The robot's driver must report accepted, running, then exactly one final state (Guidebook §9.3 rule 3).",
  },
  R705: {
    message: (a) => `a value could not be worked out while running: ${arg(a, "reason")}`,
    fix: () => "Check the values used on this line.",
  },
  R706: {
    message: (a) => `cannot tell which robot should do this: ${arg(a, "reason")}`,
    fix: () => "Connect only one robot that can do it (DECISIONS.md D27, D30).",
  },
  R707: {
    message: (a) => `something the program needs is missing: ${arg(a, "reason")}`,
    fix: () => "Connect every robot the program names, and give every file it imports.",
  },
  R708: {
    message: (a) => `the runner cannot do this: ${arg(a, "reason")}`,
    fix: () => "",
  },

  // ---- W6xx: portability warnings (Guidebook §7) ----
  W601: {
    message: (a) => `'${arg(a, "name")}' is used without a ${arg(a, "robot")}.has(...) guard`,
    fix: (a) => `Put it inside if ${arg(a, "robot")}.has("${arg(a, "name")}"): and give a fallback in else:, so the program also works on other robots.`,
  },
  W602: {
    message: () => "native code works on only one kind of robot, so this program is not portable",
    fix: () => "Use a URITP statement, profile or extension instead where you can.",
  },
};

export const ENGLISH: MessageTable = { fixLabel: "Fix", messages };
