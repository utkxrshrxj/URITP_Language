// Tests the sensing, data and talking statements of Guidebook §5:
// capture, log, alert, say and confirm (ask is tested with let).
import { describe, expect, it } from "vitest";
import { parse } from "../../src/parser/parser.js";
import { codes, lines, parseClean } from "./helpers.js";

describe("capture", () => {
  it("reads a capture with its file name", () => {
    expect(parseClean('capture drone.camera save as "roof_{point.id}.jpg"').statements[0]).toMatchObject({
      kind: "Capture",
      sensor: { kind: "Member", name: "camera" },
      file: { parts: [{ text: "roof_" }, { path: ["point", "id"] }, { text: ".jpg" }] },
    });
  });

  it("reads save as on a continuation line (DECISIONS.md A10)", () => {
    const source = lines("capture dog.camera", '    save as "hotspot.jpg"');
    expect(parseClean(source).statements[0]?.kind).toBe("Capture");
  });

  it("rejects save as on its own line, as in the original examples", () => {
    const d = parse(lines("capture dog.camera", 'save as "hotspot.jpg"')).diagnostics;
    expect(d[0]).toMatchObject({ code: "E120", args: { expected: "'save'", found: "the end of the line" } });
  });
});

describe("log and alert", () => {
  it("logs several values", () => {
    expect(parseClean("log error.code, error.reason").statements[0]).toMatchObject({
      kind: "Log",
      values: [{ kind: "Member", name: "code" }, { kind: "Member", name: "reason" }],
    });
  });

  it("sends an alert", () => {
    expect(parseClean('alert "Hot spot at {checkpoint.name}"').statements[0]).toMatchObject({ kind: "Alert" });
  });

  it("needs text for an alert", () => {
    expect(parse("alert hot").diagnostics[0]?.args["expected"]).toBe("a message in double quotes");
  });
});

describe("say and confirm", () => {
  it.each([
    ['say "Your tea is ready"', { kind: "Say", lang: null }],
    ['say "आपकी चाय तैयार है" lang hi', { kind: "Say", lang: "hi" }],
    ['confirm "Shall I start?"', { kind: "Confirm", lang: null }],
    ['confirm "Shuru karun?" lang hi', { kind: "Confirm", lang: "hi" }],
  ])("reads %s", (source, expected) => {
    expect(parseClean(source).statements[0]).toMatchObject(expected);
  });

  it("needs a language code after lang", () => {
    expect(codes('say "hi" lang')).toEqual(["E120"]);
  });

  it("does not accept a variable instead of text (DECISIONS.md C5)", () => {
    expect(parse("say message").diagnostics[0]?.args["form"]).toBe('say "TEXT" [lang CODE]');
  });
});
