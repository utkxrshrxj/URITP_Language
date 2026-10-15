// Tests how errors are turned into readable text, in the format Guidebook §8 shows.
// Also checks that every message gives a fix and never prints "undefined".
import { describe, expect, it } from "vitest";
import { explain, formatDiagnostic, inFile, makeDiagnostic } from "../../src/diagnostics/diagnostic.js";
import { ENGLISH } from "../../src/diagnostics/messages-en.js";

describe("makeDiagnostic", () => {
  it("treats E codes as errors and W codes as warnings", () => {
    expect(makeDiagnostic("E101", 1, 1).severity).toBe("error");
    expect(makeDiagnostic("W601", 1, 1).severity).toBe("warning");
  });
});

describe("formatDiagnostic", () => {
  it("matches the Guidebook's E101 example", () => {
    const d = makeDiagnostic("E101", 4, 12, { after: "the 'if' condition" });
    expect(formatDiagnostic(d)).toBe(
      "E101 (line 4): expected ':' after the 'if' condition\n" +
        "  Fix: Add ':' at the end of the line. A line that opens a block always ends with ':'.",
    );
  });

  it("names the file when the problem is in another file", () => {
    const d = inFile(makeDiagnostic("E116", 3, 1, { number: "5." }), "site.uritp");
    expect(formatDiagnostic(d).split("\n")[0]).toBe("E116 (site.uritp, line 3): '5.' is not a valid number");
  });

  it("suggests the closest unit", () => {
    const d = makeDiagnostic("E110", 7, 23, { unit: "mms", number: "5", suggestion: "mm/s" });
    expect(explain(d)).toEqual({ message: "'mms' is not a unit", fix: "Did you mean 5mm/s?" });
  });

  it("reports an unknown code instead of crashing", () => {
    expect(explain(makeDiagnostic("E999", 1, 1)).message).toBe("unknown problem E999");
  });
});

describe("English message table", () => {
  const codes = Object.keys(ENGLISH.messages);

  it.each(codes)("%s has a message and never prints undefined", (code) => {
    const { message, fix } = explain(makeDiagnostic(code, 1, 1));
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain("undefined");
    expect(fix).not.toContain("undefined");
  });
});
