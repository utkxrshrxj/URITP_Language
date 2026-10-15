// An offline translator for a few common requests in English, Hindi and Hinglish. It works without
// any key or network, and says plainly when it does not understand instead of guessing.

import { isKeyword } from "../lexer/keywords.js";
import { robotHeader, type RobotDescription, type TranslationRequest, type TranslationResult, type Translator } from "./translator.js";
import { COLOURS, FILLER, JOINERS, NOUNS, UNIT_WORDS } from "./vocabulary.js";

/** What one clause of a request asks for, before it is written as URITP. */
type Intent =
  | { kind: "go"; place: string }
  | { kind: "drive"; direction: "forward" | "backward"; amount: string }
  | { kind: "turn"; angle: string }
  | { kind: "stop" }
  | { kind: "pick"; object: string }
  | { kind: "place"; object: string | null; target: string }
  | { kind: "grip"; action: "open" | "close" }
  | { kind: "photo" }
  | { kind: "wait"; amount: string }
  | { kind: "say"; text: string };

const DEVANAGARI = /[ऀ-ॿ]/;
/** Hindi words that mark a request written in Latin letters as Hinglish. */
const HINGLISH_WORDS = /\b(jao|jaao|chalo|ruko|uthao|rakho|mudo|ghumo|kholo|band|karo|lo|aage|peeche|piche|baayein|bayen|daayein|dayen|mein|par|tak|aur|phir)\b/;

/** en, hi or hinglish, from the letters and words used. */
export function detectLanguage(text: string): string {
  if (DEVANAGARI.test(text)) return "hi";
  return HINGLISH_WORDS.test(text.toLowerCase()) ? "hinglish" : "en";
}

/** Lower case, Devanagari digits as 0-9, no punctuation, single spaces. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/[.,!?।;:"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits "go to the kitchen and take a photo" into its parts. */
function clauses(text: string): string[] {
  const pattern = new RegExp(`\\s(?:${JOINERS.map((j) => j.replace(/ /g, "\\s")).join("|")})\\s`, "u");
  return text.split(pattern).map((c) => c.trim()).filter((c) => c !== "");
}

/** "50 cm", "5 seconds", "90 degree" as a URITP quantity, or null if it is not one. */
function quantity(number: string, unitWord: string): string | null {
  const unit = UNIT_WORDS[unitWord];
  return unit === undefined ? null : `${number}${unit}`;
}

/** A name for an object or place in a program: "red ball" and "laal gend" both become red_ball. */
function nameOf(words: string): string | null {
  const parts = words.split(" ").filter((w) => !FILLER.has(w));
  const english = parts.map((word) => COLOURS[word] ?? NOUNS[word] ?? word);
  const name = english.join("_");
  // A program name uses ASCII letters, digits and _ only, and is not a keyword (DECISIONS.md B1).
  return /^[a-z_][a-z0-9_]*$/.test(name) && !isKeyword(name) ? name : null;
}

const NUM = "(\\d+(?:\\.\\d+)?)";
const UNIT = "([a-z\\u0900-\\u097F]+)";

/** Reads one clause as an intent, or returns null if no phrase matches. */
function readClause(clause: string): Intent | null | { unknownWord: string } {
  const match = (pattern: string): RegExpMatchArray | null => new RegExp(`^${pattern}$`, "u").exec(clause);
  let m: RegExpMatchArray | null;

  // stop: stop, halt, ruko, ruk jao, रुको, रुक जाओ
  if (match("(?:stop|halt|ruko|ruk jao|रुको|रुक जाओ)")) return { kind: "stop" };

  // wait: "wait 5 seconds", "5 second ruko", "5 सेकंड रुको"
  if ((m = match(`wait ${NUM} ?${UNIT}`)) ?? (m = match(`${NUM} ?${UNIT} (?:ruko|intezaar karo|रुको|इंतज़ार करो)`))) {
    const amount = quantity(m[1] ?? "", m[2] ?? "");
    return amount === null ? { unknownWord: m[2] ?? "" } : { kind: "wait", amount };
  }

  // drive: "move forward 50 cm", "go back 1 metre", "50 cm aage chalo", "50 सेंटीमीटर आगे चलो"
  if ((m = match(`(?:move|go|drive) (forward|ahead|backward|back) ${NUM} ?${UNIT}`))) {
    const amount = quantity(m[2] ?? "", m[3] ?? "");
    const direction = m[1] === "backward" || m[1] === "back" ? "backward" : "forward";
    return amount === null ? { unknownWord: m[3] ?? "" } : { kind: "drive", direction, amount };
  }
  if ((m = match(`${NUM} ?${UNIT} (aage|peeche|piche|आगे|पीछे) (?:chalo|jao|jaao|चलो|जाओ)`))) {
    const amount = quantity(m[1] ?? "", m[2] ?? "");
    const direction = m[3] === "aage" || m[3] === "आगे" ? "forward" : "backward";
    return amount === null ? { unknownWord: m[2] ?? "" } : { kind: "drive", direction, amount };
  }

  // turn: "turn left 90 degrees", "baayein 90 degree mudo", "दाएं 45 डिग्री मुड़ो"
  if ((m = match(`turn (left|right) (?:by )?${NUM} ?${UNIT}`)) ?? (m = match(`(baayein|bayen|left|daayein|dayen|right|बाएं|बाएँ|दाएं|दाएँ) ${NUM} ?${UNIT} (?:mudo|ghumo|मुड़ो|मुडो|घूमो)`))) {
    const amount = quantity(m[2] ?? "", m[3] ?? "");
    const left = ["left", "baayein", "bayen", "बाएं", "बाएँ"].includes(m[1] ?? "");
    // Turning left is a positive angle, anticlockwise seen from above.
    return amount === null ? { unknownWord: m[3] ?? "" } : { kind: "turn", angle: left ? amount : `-${amount}` };
  }

  // gripper: "open the gripper", "gripper band karo", "ग्रिपर खोलो"
  if ((m = match("(open|close) (?:the )?gripper"))) return { kind: "grip", action: m[1] === "open" ? "open" : "close" };
  if ((m = match("(?:gripper|ग्रिपर) (kholo|band karo|खोलो|बंद करो)"))) {
    return { kind: "grip", action: m[1] === "kholo" || m[1] === "खोलो" ? "open" : "close" };
  }

  // photo: "take a photo", "photo lo", "फोटो लो"
  if (match("(?:(?:take a |take )?(?:photo|picture)|(?:photo|tasveer|फोटो|तस्वीर) (?:lo|khincho|लो|खींचो))")) return { kind: "photo" };

  // say: "say hello there"
  if ((m = match("say (.+)"))) return { kind: "say", text: m[1] ?? "" };

  // pick: "pick up the red ball", "laal gend uthao", "लाल गेंद उठाओ"
  if ((m = match("pick up (.+)")) ?? (m = match("(.+) (?:uthao|utha lo|उठाओ|उठा लो)"))) {
    const object = nameOf(m[1] ?? "");
    return object === null ? { unknownWord: m[1] ?? "" } : { kind: "pick", object };
  }

  // place: "put it in the basket", "tokri mein rakho", "टोकरी में रखो"
  if ((m = match("(?:put|place) (.+?) (?:in|on|into|onto) (.+)"))) {
    const object = m[1] === "it" ? null : nameOf(m[1] ?? "");
    const target = nameOf(m[2] ?? "");
    return target === null ? { unknownWord: m[2] ?? "" } : { kind: "place", object, target };
  }
  if ((m = match("(.+?) (?:mein|me|par|में|पर) (?:rakho|rakh do|रखो|रख दो)"))) {
    const target = nameOf(m[1] ?? "");
    return target === null ? { unknownWord: m[1] ?? "" } : { kind: "place", object: null, target };
  }

  // go: "go to the kitchen", "rasoi mein jao", "रसोई में जाओ"
  if ((m = match("(?:go|move|drive|come) to (.+)")) ?? (m = match("(.+?) (?:mein |me |par |tak |में |पर |तक )?(?:jao|jaao|chalo|जाओ|चलो)"))) {
    const place = nameOf(m[1] ?? "");
    return place === null ? { unknownWord: m[1] ?? "" } : { kind: "go", place };
  }
  return null;
}

/** The first robot that has `part` (or the profile), else the first robot: the checker explains any problem. */
function robotWith(robots: readonly RobotDescription[], test: (r: RobotDescription) => boolean): RobotDescription | undefined {
  return robots.find(test) ?? robots[0];
}

const hasFrame = (frame: string) => (r: RobotDescription) => r.model.frames[frame] !== undefined;
const hasProfile = (profile: string) => (r: RobotDescription) => r.model.profiles.includes(profile);
const firstFrame = (r: RobotDescription): string => Object.keys(r.model.frames)[0] ?? "tool";
const firstActuator = (r: RobotDescription): string => Object.keys(r.model.actuators)[0] ?? "gripper";

export class RuleBasedTranslator implements Translator {
  readonly name = "offline rules";

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const language = detectLanguage(request.text);
    const fail = (reason: string): TranslationResult => ({ ok: false, reason, language });
    if (request.robots.length === 0) return fail("No robot is connected.");

    const lines: string[] = [];
    const understood: string[] = [];
    let held: string | null = null; // the last object picked up, for "put it in ..."

    for (const clause of clauses(normalise(request.text))) {
      const intent = readClause(clause);
      if (intent === null) return fail(`I did not understand "${clause}".`);
      if ("unknownWord" in intent) return fail(`I do not know the words "${intent.unknownWord}" yet.`);

      switch (intent.kind) {
        case "go": {
          if (!(request.places ?? []).includes(intent.place)) return fail(`I do not know a place called "${intent.place}".`);
          const robot = robotWith(request.robots, hasFrame("base"));
          lines.push(`move ${robot?.name}.base to places.${intent.place}`);
          understood.push(`go to ${intent.place}`);
          break;
        }
        case "drive": {
          const robot = robotWith(request.robots, hasProfile("navigation"));
          lines.push(`drive ${robot?.name}.base ${intent.direction} by ${intent.amount}`);
          understood.push(`drive ${intent.direction} ${intent.amount}`);
          break;
        }
        case "turn": {
          const robot = robotWith(request.robots, hasProfile("navigation"));
          lines.push(`turn ${robot?.name}.base by ${intent.angle}`);
          understood.push(`turn by ${intent.angle}`);
          break;
        }
        case "stop":
          for (const robot of request.robots) lines.push(`stop ${robot.name}`);
          understood.push("stop");
          break;
        case "pick": {
          const robot = robotWith(request.robots, hasProfile("manipulation"));
          lines.push(`pick ${intent.object} using ${robot?.name}`);
          held = intent.object;
          understood.push(`pick up ${intent.object}`);
          break;
        }
        case "place": {
          const object = intent.object ?? held;
          if (object === null) return fail("I do not know what to put down.");
          const robot = robotWith(request.robots, hasProfile("manipulation"));
          const target = (request.places ?? []).includes(intent.target) ? `places.${intent.target}` : intent.target;
          lines.push(`place ${object} on ${target} using ${robot?.name}.${robot === undefined ? "tool" : firstFrame(robot)}`);
          held = null;
          understood.push(`put ${object} on ${intent.target}`);
          break;
        }
        case "grip": {
          const robot = robotWith(request.robots, (r) => Object.keys(r.model.actuators).length > 0);
          lines.push(`grip ${robot?.name}.${robot === undefined ? "gripper" : firstActuator(robot)} ${intent.action}`);
          understood.push(`${intent.action} the gripper`);
          break;
        }
        case "photo": {
          const robot = robotWith(request.robots, (r) => r.model.sensors["camera"] !== undefined);
          lines.push(`capture ${robot?.name}.camera save as "photo.jpg"`);
          understood.push("take a photo");
          break;
        }
        case "wait":
          lines.push(`wait ${intent.amount}`);
          understood.push(`wait ${intent.amount}`);
          break;
        case "say":
          lines.push(`say "${intent.text.replace(/["{}]/g, "")}"`);
          understood.push(`say "${intent.text}"`);
          break;
      }
    }
    if (lines.length === 0) return fail("I did not hear a request.");
    return { ok: true, program: [...robotHeader(request.robots), ...lines].join("\n"), explanation: understood.join(", then "), language };
  }
}
