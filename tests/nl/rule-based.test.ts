// Tests the offline translator: the same requests in English, Hindi and Hinglish become the same
// URITP program, and anything it does not understand is refused plainly, never guessed.
import { describe, expect, it } from "vitest";
import { detectLanguage, RuleBasedTranslator } from "../../src/nl/rule-based.js";
import { robotHeader, type RobotDescription, type TranslationResult } from "../../src/nl/translator.js";
import { MODELS } from "../checker/models.js";

const ROVER: RobotDescription = { name: "rover", address: "office:rover-2", model: MODELS["rover"]! };
const ARM: RobotDescription = { name: "arm", address: "sim:panda", model: MODELS["arm"]! };
const PLACES = ["kitchen", "door", "dock", "desk_14"];
const translator = new RuleBasedTranslator();

async function translate(text: string, robots: RobotDescription[] = [ROVER]): Promise<TranslationResult> {
  return translator.translate({ text, robots, places: PLACES });
}

/** The program lines after the robot lines. */
async function body(text: string, robots: RobotDescription[] = [ROVER]): Promise<string[]> {
  const result = await translate(text, robots);
  if (!result.ok) throw new Error(result.reason);
  return result.program.split("\n").slice(robots.length);
}

describe("the same request in three languages", () => {
  it.each([
    ["go to the kitchen", "en"],
    ["rasoi mein jao", "hinglish"],
    ["रसोई में जाओ", "hi"],
  ])("%s goes to the kitchen", async (text, language) => {
    expect(await body(text)).toEqual(["move rover.base to places.kitchen"]);
    expect((await translate(text)).language).toBe(language);
  });

  it.each(["move forward 50 cm", "50 cm aage chalo", "50 सेंटीमीटर आगे चलो", "५० सेमी आगे चलो"])("%s drives 50cm", async (text) => {
    expect(await body(text)).toEqual(["drive rover.base forward by 50cm"]);
  });

  it.each([
    ["turn left 90 degrees", "turn rover.base by 90deg"],
    ["daayein 45 degree mudo", "turn rover.base by -45deg"],
    ["बाएं 90 डिग्री मुड़ो", "turn rover.base by 90deg"],
  ])("%s turns", async (text, line) => {
    expect(await body(text)).toEqual([line]);
  });

  it.each(["stop", "ruko", "रुको"])("%s stops every robot", async (text) => {
    expect(await body(text, [ROVER, ARM])).toEqual(["stop rover", "stop arm"]);
  });

  it.each(["wait 5 seconds", "5 second ruko", "5 सेकंड रुको"])("%s waits", async (text) => {
    expect(await body(text)).toEqual(["wait 5s"]);
  });

  it.each(["take a photo", "photo lo", "फोटो लो"])("%s takes a photo", async (text) => {
    expect(await body(text)).toEqual(['capture rover.camera save as "photo.jpg"']);
  });
});

describe("picking and placing", () => {
  it("translates the project brief's example: laal gend uthao aur tokri mein rakho", async () => {
    expect(await body("laal gend uthao aur tokri mein rakho", [ARM])).toEqual([
      "pick red_ball using arm",
      "place red_ball on basket using arm.tool",
    ]);
  });

  it("does the same in English and Hindi", async () => {
    const expected = ["pick red_ball using arm", "place red_ball on basket using arm.tool"];
    expect(await body("pick up the red ball and put it in the basket", [ARM])).toEqual(expected);
    expect(await body("लाल गेंद उठाओ और टोकरी में रखो", [ARM])).toEqual(expected);
  });

  it("chooses the robot that can do each part", async () => {
    expect(await body("go to the kitchen and pick up the cup", [ROVER, ARM])).toEqual([
      "move rover.base to places.kitchen",
      "pick cup using arm",
    ]);
  });

  it("opens and closes the gripper", async () => {
    expect(await body("gripper band karo then open the gripper", [ARM])).toEqual(["grip arm.gripper close", "grip arm.gripper open"]);
  });
});

describe("whole programs", () => {
  it("starts with a robot line for each robot and explains what it understood", async () => {
    const result = await translate("go to the dock and say parcel for you", [ROVER]);
    expect(result).toEqual({
      ok: true,
      program: [...robotHeader([ROVER]), "move rover.base to places.dock", 'say "parcel for you"'].join("\n"),
      explanation: 'go to dock, then say "parcel for you"',
      language: "en",
    });
  });
});

describe("what it does not understand", () => {
  it("says so instead of guessing", async () => {
    expect(await translate("dance for me")).toEqual({ ok: false, reason: 'I did not understand "dance for me".', language: "en" });
  });

  it("refuses a place the site map does not have", async () => {
    expect(await translate("go to the moon")).toMatchObject({ ok: false, reason: 'I do not know a place called "moon".' });
  });

  it("refuses words it cannot turn into a name", async () => {
    expect(await translate("कुर्सी उठाओ", [ARM])).toMatchObject({ ok: false, reason: 'I do not know the words "कुर्सी" yet.' });
  });

  it("refuses a unit it does not know", async () => {
    expect(await translate("move forward 5 furlongs")).toMatchObject({ ok: false, reason: 'I do not know the words "furlongs" yet.' });
  });

  it("refuses to put something down when nothing was picked up", async () => {
    expect(await translate("tokri mein rakho", [ARM])).toMatchObject({ ok: false, reason: "I do not know what to put down." });
  });

  it("needs a connected robot", async () => {
    expect(await translate("go to the kitchen", [])).toMatchObject({ ok: false, reason: "No robot is connected." });
  });
});

describe("detectLanguage", () => {
  it.each([
    ["go to the kitchen", "en"],
    ["rasoi mein jao", "hinglish"],
    ["रसोई में जाओ", "hi"],
  ])("finds %s is %s", (text, language) => {
    expect(detectLanguage(text)).toBe(language);
  });
});
