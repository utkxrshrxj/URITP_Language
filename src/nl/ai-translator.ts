// A translator that asks a Claude model to turn a request in any language into a URITP program.
// Whatever it writes still goes through the checker, so a wrong or unsafe program never runs.

import Anthropic from "@anthropic-ai/sdk";
import type { RobotModel } from "../checker/robot-model.js";
import { format } from "../stdlib/quantity.js";
import { robotHeader, type RobotDescription, type TranslationRequest, type TranslationResult, type Translator } from "./translator.js";

/** The model used unless another is chosen. */
export const DEFAULT_MODEL = "claude-opus-5-5";

/** Sends one Messages API request; tests pass in a fake one. */
export type CreateMessage = (
  params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Beta.Messages.BetaMessage>;

export interface AiTranslatorOptions {
  /** The API key. Leave it out only when `create` is given. */
  readonly apiKey?: string;
  readonly model?: string;
  readonly create?: CreateMessage;
}

/** The answer the model must give, enforced by the API's structured output. */
const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    understood: { type: "boolean", description: "False if the request is unclear, unsafe, or not something these robots can do." },
    program: { type: "string", description: "The URITP program, or an empty string when not understood." },
    explanation: { type: "string", description: "What the program does, or why the request was not understood, in one or two plain sentences." },
    language: { type: "string", enum: ["en", "hi", "hinglish", "other"], description: "The language of the request." },
  },
  required: ["understood", "program", "explanation", "language"],
  additionalProperties: false,
} as const;

/** The rules of URITP the model needs, kept short and fixed so the prompt can be cached. */
const LANGUAGE_GUIDE = `You translate a person's request, in any language, into a program in URITP, a small language for robots.

How URITP is written:
- One statement per line. A line ending in ":" opens a block indented by exactly 4 spaces. No tabs.
- Every quantity has its unit glued to the number: 10cm, 0.5m, 0.2m/s, 90deg, 30deg/s, 2s, 1min, 20N, 25%. Never write a bare number where a quantity is meant.
- Objects the robot finds itself are plain lower-case names, like cup or red_ball. Places come from the site map as places.NAME, zones as zones.NAME, routes as route.NAME.

Statements you may use:
- move ROBOT.FRAME to TARGET [speed Q] [via route.NAME] [avoid zones.NAME]   (TARGET is places.NAME, an object, or OBJECT.above(10cm))
- drive ROBOT.FRAME forward|backward [by LENGTH] [speed Q]
- turn ROBOT.FRAME by ANGLE        (positive turns left)
- grip ROBOT.ACTUATOR open|close [force Q]
- pick OBJECT using ROBOT
- place OBJECT on TARGET using ROBOT.FRAME
- capture ROBOT.SENSOR save as "FILE.jpg"
- say "TEXT" [lang hi]
- wait Q
- stop ROBOT
- if CONDITION: / for NAME in route.NAME: / repeat N times:   followed by an indented block
- a reading: ROBOT.sense("SENSOR").value, compared with a quantity, like rover.sense("distance_front").value < 20cm

Rules:
- Start the program with exactly the robot lines given below, then the statements.
- Use only the robots, parts, places, zones and routes listed. Never invent a place.
- Only use what each robot's profiles allow, and stay within its limits. Do not add speeds the person did not ask for.
- Never use native(...).
- When the robot speaks to the person, answer in their language: lang hi for Hindi and Hinglish.
- If the request is unclear, unsafe, or not something these robots can do, set understood to false and explain why. A program you write is checked before anything moves, so never try to get around a limit.`;

/** One robot as the model should see it: its parts, profiles and limits. */
function describeRobot(robot: RobotDescription): string {
  const m: RobotModel = robot.model;
  const frames = Object.entries(m.frames).map(([name, f]) => `${name} (${f.type}${f.maxSpeed === undefined ? "" : `, max ${format(f.maxSpeed)}`})`);
  const actuators = Object.entries(m.actuators).map(([name, a]) => `${name} (states ${a.states.join("/")})`);
  const sensors = Object.entries(m.sensors).map(([name, s]) => `${name}${s.dimension === null ? "" : ` (${s.dimension})`}`);
  const safety = m.safety?.maxSpeed === undefined ? "" : `; safety max speed ${format(m.safety.maxSpeed)}`;
  return [
    `- ${robot.name}: ${m.name}`,
    `  profiles: ${m.profiles.join(", ")}${safety}`,
    `  frames: ${frames.join(", ") || "none"}`,
    `  actuators: ${actuators.join(", ") || "none"}`,
    `  sensors: ${sensors.join(", ") || "none"}`,
  ].join("\n");
}

/** Everything about this request's world: robot lines, robots, places, zones and routes. */
function describeWorld(request: TranslationRequest): string {
  const list = (items: readonly string[] | undefined): string => (items === undefined || items.length === 0 ? "none" : items.join(", "));
  return [
    "Robot lines to start the program with:",
    ...robotHeader(request.robots),
    "",
    "Connected robots:",
    ...request.robots.map(describeRobot),
    "",
    `Places: ${list(request.places)}`,
    `Zones: ${list(request.zones)}`,
    `Routes: ${list(request.routes)}`,
  ].join("\n");
}

interface Answer {
  understood: boolean;
  program: string;
  explanation: string;
  language: string;
}

function isAnswer(value: unknown): value is Answer {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return typeof a["understood"] === "boolean" && typeof a["program"] === "string" && typeof a["explanation"] === "string" && typeof a["language"] === "string";
}

export class AiTranslator implements Translator {
  readonly name: string;
  private readonly model: string;
  private readonly create: CreateMessage;

  constructor(options: AiTranslatorOptions) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.name = `AI (${this.model})`;
    if (options.create !== undefined) {
      this.create = options.create;
    } else {
      const client = new Anthropic({ apiKey: options.apiKey ?? null });
      this.create = (params) => client.beta.messages.create(params);
    }
  }

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const fail = (reason: string): TranslationResult => ({ ok: false, reason, language: "other" });
    let response: Anthropic.Beta.Messages.BetaMessage;
    try {
      response = await this.create({
        model: this.model,
        max_tokens: 16000,
        // If a safety classifier declines, the API retries on a suitable model in the same call.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: ANSWER_SCHEMA } },
        system: [
          { type: "text", text: LANGUAGE_GUIDE, cache_control: { type: "ephemeral" } },
          { type: "text", text: describeWorld(request) },
        ],
        messages: [{ role: "user", content: request.text }],
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) return fail("The AI service did not accept the API key.");
      if (error instanceof Anthropic.RateLimitError) return fail("The AI service is busy. Please try again in a moment.");
      if (error instanceof Anthropic.APIConnectionError) return fail("Could not reach the AI service.");
      if (error instanceof Anthropic.APIError) return fail(`The AI service returned an error (${String(error.status)}).`);
      throw error;
    }

    if (response.stop_reason === "refusal") return fail("The AI model declined this request.");
    const text = response.content.find((block) => block.type === "text");
    if (text === undefined || text.type !== "text") return fail("The AI model gave no answer.");
    let answer: unknown;
    try {
      answer = JSON.parse(text.text);
    } catch {
      return fail("The AI model's answer could not be read.");
    }
    if (!isAnswer(answer)) return fail("The AI model's answer was not in the expected form.");
    if (!answer.understood || answer.program.trim() === "") {
      return { ok: false, reason: answer.explanation, language: answer.language };
    }
    return { ok: true, program: answer.program, explanation: answer.explanation, language: answer.language };
  }
}

/**
 * The AI translator, with its key read from the environment (ANTHROPIC_API_KEY), or null when
 * there is no key, so the caller can use the offline translator instead. The environment is
 * passed in, so this file stays free of Node-only code.
 */
export function aiTranslatorFromEnvironment(env: Readonly<Record<string, string | undefined>>): AiTranslator | null {
  const apiKey = env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey.trim() === "") return null;
  const model = env["URITP_AI_MODEL"];
  return new AiTranslator(model === undefined || model === "" ? { apiKey } : { apiKey, model });
}
