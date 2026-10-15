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
      arg(a, "suggestion") !== ""
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
      arg(a, "suggestion") !== ""
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
  E313: {
    message: (a) => `a list cannot mix ${arg(a, "first")} and ${arg(a, "other")}`,
    fix: () => "Put only one kind of value in a list.",
  },
  E315: {
    message: (a) => `{${arg(a, "inside")}} is ${arg(a, "type")}, which cannot be shown as text`,
    fix: () => "Insert a number, a quantity, text or a name such as {checkpoint.name}.",
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
};

export const ENGLISH: MessageTable = { fixLabel: "Fix", messages };
