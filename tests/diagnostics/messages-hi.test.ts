// Checks the Hindi messages: exactly the same codes as English (so logs stay searchable), a
// message and fix for every code, and the Guidebook's own examples shown in Hindi.
import { describe, expect, it } from "vitest";
import { explain, formatDiagnostic, makeDiagnostic } from "../../src/diagnostics/diagnostic.js";
import { ENGLISH } from "../../src/diagnostics/messages-en.js";
import { HINDI } from "../../src/diagnostics/messages-hi.js";

const DEVANAGARI = /[ऀ-ॿ]/;

describe("Hindi messages", () => {
  it("cover exactly the same codes as English", () => {
    expect(Object.keys(HINDI.messages).sort()).toEqual(Object.keys(ENGLISH.messages).sort());
  });

  it.each(Object.keys(HINDI.messages))("%s has a Hindi message and never prints undefined", (code) => {
    const { message, fix } = explain(makeDiagnostic(code, 1, 1, { robot: "rover", name: "x" }), HINDI);
    expect(message).toMatch(DEVANAGARI);
    expect(message).not.toContain("undefined");
    expect(fix).not.toContain("undefined");
  });

  it("keeps the code and line the same, and changes only the words", () => {
    const d = makeDiagnostic("E304", 7, 12, { expected: "Length", value: "20", suggestion: "20cm" });
    expect(formatDiagnostic(d)).toBe("E304 (line 7): expected Length, got Number '20'\n  Fix: Did you mean 20cm?");
    expect(formatDiagnostic(d, HINDI)).toBe("E304 (लाइन 7): Length चाहिए था, पर सादी संख्या '20' मिली\n  सुधार: क्या आपका मतलब 20cm था?");
  });

  it("shows the Guidebook's E401 example in Hindi", () => {
    const d = makeDiagnostic("E401", 2, 1, { what: "takeoff", profile: "flight", robot: "rover", supported: "core, navigation" });
    expect(explain(d, HINDI).message).toBe("'takeoff' के लिए प्रोफ़ाइल 'flight' चाहिए; rover के पास [core, navigation] हैं");
  });
});
