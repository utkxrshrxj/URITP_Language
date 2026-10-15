// The reserved words of URITP, copied from Guidebook §3 and spec/GRAMMAR.md section 1.5.
// A reserved word cannot be used as a name, except in the few places listed in DECISIONS.md B7.

/** Reserved in every file. */
export const KEYWORDS: ReadonlySet<string> = new Set([
  "robot", "connect", "let", "task", "return", "move", "to", "by", "speed",
  "tolerance", "via", "avoid", "drive", "turn", "forward", "backward", "grip",
  "open", "close", "pick", "place", "using", "onto", "on", "pour", "from",
  "into", "weld", "along", "spray", "amount", "current", "takeoff", "land",
  "at", "capture", "save", "as", "say", "lang", "confirm", "ask", "alert",
  "log", "wait", "until", "timeout", "if", "elif", "else", "and", "or", "not",
  "for", "in", "repeat", "every", "times", "forever", "break", "parallel",
  "fail", "safety", "when", "stop", "return_home", "native", "import", "true",
  "false", "define", "force",
]);

/** Reserved only inside manifest files (Guidebook §3, DECISIONS.md B2). */
export const MANIFEST_KEYWORDS: ReadonlySet<string> = new Set([
  "manifest", "uritp", "frame", "actuator", "sensor", "profiles", "extension",
]);

export function isKeyword(word: string): boolean {
  return KEYWORDS.has(word);
}
