// Tests the AI translator with a fake Messages API, so no key or network is needed: the request it
// sends (model, fallback, answer format, robots and places), how it reads answers, and its errors.
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { AiTranslator, aiTranslatorFromEnvironment, DEFAULT_MODEL, type CreateMessage } from "../../src/nl/ai-translator.js";
import type { RobotDescription } from "../../src/nl/translator.js";
import { MODELS } from "../checker/models.js";

const ROVER: RobotDescription = { name: "rover", address: "office:rover-2", model: MODELS["rover"]! };
const REQUEST = { text: "rasoi mein jao", robots: [ROVER], places: ["kitchen", "dock"], zones: ["icu"] };

type Params = Parameters<CreateMessage>[0];

/** A fake API that records the request and answers with the given text (or stop reason). */
function fakeApi(answer: unknown, stopReason = "end_turn") {
  const sent: Params[] = [];
  const create: CreateMessage = async (params) => {
    sent.push(params);
    const text = typeof answer === "string" ? answer : JSON.stringify(answer);
    return { content: [{ type: "text", text }], stop_reason: stopReason } as unknown as Anthropic.Beta.Messages.BetaMessage;
  };
  return { sent, create };
}

const GOOD = {
  understood: true,
  program: 'robot rover = connect("office:rover-2")\nmove rover.base to places.kitchen',
  explanation: "Go to the kitchen.",
  language: "hinglish",
};

describe("the request it sends", () => {
  it("uses the default model, the server-side fallback and a JSON answer format", async () => {
    const { sent, create } = fakeApi(GOOD);
    await new AiTranslator({ create }).translate(REQUEST);
    const params = sent[0]!;
    expect(params.model).toBe(DEFAULT_MODEL);
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.fallbacks).toBe("default");
    expect(params.output_config?.effort).toBe("medium");
    expect(params.output_config?.format?.type).toBe("json_schema");
    expect(params.messages).toEqual([{ role: "user", content: "rasoi mein jao" }]);
  });

  it("tells the model exactly which robots, parts, limits and places exist", async () => {
    const { sent, create } = fakeApi(GOOD);
    await new AiTranslator({ create }).translate(REQUEST);
    const system = (sent[0]!.system as { text: string }[]).map((b) => b.text).join("\n");
    expect(system).toContain('robot rover = connect("office:rover-2")');
    expect(system).toContain("profiles: core, navigation, speech, vision");
    expect(system).toContain("frames: base (pose2d)");
    expect(system).toContain("Places: kitchen, dock");
    expect(system).toContain("Zones: icu");
    expect(system).toContain("Never use native(...)");
  });

  it("keeps the fixed guide first and marks it for caching", async () => {
    const { sent, create } = fakeApi(GOOD);
    await new AiTranslator({ create }).translate(REQUEST);
    const [guide] = sent[0]!.system as { text: string; cache_control?: unknown }[];
    expect(guide?.cache_control).toEqual({ type: "ephemeral" });
    expect(guide?.text).not.toContain("office:rover-2");
  });
});

describe("reading the answer", () => {
  it("returns the program and explanation", async () => {
    expect(await new AiTranslator({ create: fakeApi(GOOD).create }).translate(REQUEST)).toEqual({
      ok: true,
      program: GOOD.program,
      explanation: "Go to the kitchen.",
      language: "hinglish",
    });
  });

  it("passes on the model's reason when it did not understand", async () => {
    const answer = { understood: false, program: "", explanation: "There is no place called the moon.", language: "en" };
    expect(await new AiTranslator({ create: fakeApi(answer).create }).translate(REQUEST)).toEqual({
      ok: false,
      reason: "There is no place called the moon.",
      language: "en",
    });
  });

  it("handles a refusal, an unreadable answer and a wrong shape", async () => {
    expect(await new AiTranslator({ create: fakeApi("", "refusal").create }).translate(REQUEST)).toMatchObject({ ok: false, reason: "The AI model declined this request." });
    expect(await new AiTranslator({ create: fakeApi("not json").create }).translate(REQUEST)).toMatchObject({ ok: false, reason: "The AI model's answer could not be read." });
    expect(await new AiTranslator({ create: fakeApi({ program: 5 }).create }).translate(REQUEST)).toMatchObject({ ok: false, reason: "The AI model's answer was not in the expected form." });
  });
});

describe("errors from the AI service", () => {
  const failing = (error: Error): CreateMessage => async () => Promise.reject(error);

  it.each([
    [new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers()), "The AI service did not accept the API key."],
    [new Anthropic.RateLimitError(429, undefined, "slow down", new Headers()), "The AI service is busy. Please try again in a moment."],
    [new Anthropic.APIConnectionError({ message: "offline" }), "Could not reach the AI service."],
    [new Anthropic.InternalServerError(500, undefined, "oops", new Headers()), "The AI service returned an error (500)."],
  ])("turns %s into a plain reason", async (error, reason) => {
    expect(await new AiTranslator({ create: failing(error) }).translate(REQUEST)).toMatchObject({ ok: false, reason });
  });

  it("does not hide programming mistakes", async () => {
    await expect(new AiTranslator({ create: failing(new TypeError("bug")) }).translate(REQUEST)).rejects.toThrow("bug");
  });
});

describe("aiTranslatorFromEnvironment", () => {
  it("reads the key from ANTHROPIC_API_KEY", () => {
    expect(aiTranslatorFromEnvironment({ ANTHROPIC_API_KEY: "test-key" })?.name).toBe(`AI (${DEFAULT_MODEL})`);
  });

  it("lets URITP_AI_MODEL choose another model", () => {
    expect(aiTranslatorFromEnvironment({ ANTHROPIC_API_KEY: "test-key", URITP_AI_MODEL: "claude-sonnet-5-5" })?.name).toBe("AI (claude-sonnet-5-5)");
  });

  it("gives null without a key, so the offline translator is used", () => {
    expect(aiTranslatorFromEnvironment({})).toBeNull();
    expect(aiTranslatorFromEnvironment({ ANTHROPIC_API_KEY: "  " })).toBeNull();
  });
});
