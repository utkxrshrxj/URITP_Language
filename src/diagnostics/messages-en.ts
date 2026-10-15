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
};

export const ENGLISH: MessageTable = { fixLabel: "Fix", messages };
