// Tests text in double quotes, including {name} insertions and the errors for broken text.
import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../../src/diagnostics/diagnostic.js";
import { tokenizeLine } from "../../src/lexer/line.js";
import type { Token } from "../../src/lexer/tokens.js";

function lexLine(line: string): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  return { tokens: tokenizeLine(line, 1, 0, diagnostics), diagnostics };
}

function partsOf(line: string): unknown {
  const token = lexLine(line).tokens.find((t) => t.kind === "text");
  return token?.kind === "text" ? token.parts : undefined;
}

describe("text", () => {
  it("reads plain text", () => {
    const { tokens, diagnostics } = lexLine('say "Parcel for you"');
    expect(diagnostics).toEqual([]);
    expect(tokens[1]).toEqual({
      kind: "text",
      text: '"Parcel for you"',
      parts: [{ kind: "literal", text: "Parcel for you" }],
      line: 1,
      column: 5,
    });
  });

  it("reads empty text", () => {
    expect(partsOf('""')).toEqual([]);
  });

  it("keeps apostrophes, # and other languages inside text", () => {
    expect(partsOf(`say "I couldn't complete that # really"`)).toEqual([
      { kind: "literal", text: "I couldn't complete that # really" },
    ]);
    expect(partsOf('say "आपकी चाय तैयार है"')).toEqual([{ kind: "literal", text: "आपकी चाय तैयार है" }]);
  });

  it("splits out a {name} insertion", () => {
    expect(partsOf('alert "Hot spot at {checkpoint.name}"')).toEqual([
      { kind: "literal", text: "Hot spot at " },
      { kind: "insert", path: ["checkpoint", "name"], column: 20 },
    ]);
  });

  it("handles insertions at the start, middle and end", () => {
    expect(partsOf('"roof_{point.id}.jpg"')).toEqual([
      { kind: "literal", text: "roof_" },
      { kind: "insert", path: ["point", "id"], column: 7 },
      { kind: "literal", text: ".jpg" },
    ]);
  });

  it("reads tokens after the text", () => {
    expect(lexLine('say "hi" lang hi').tokens.map((t) => t.kind)).toEqual(["keyword", "text", "keyword", "name"]);
  });
});

describe("text errors", () => {
  it("reports text with no closing quote", () => {
    const { tokens, diagnostics } = lexLine('say "hello');
    expect(diagnostics).toEqual([expect.objectContaining({ code: "E112", column: 5 })]);
    expect(tokens[1]?.kind).toBe("text");
  });

  it.each([
    ['"{1 + 2}"', "1 + 2"],
    ['"{len(x)}"', "len(x)"],
    ['"{}"', ""],
    ['"{a.}"', "a."],
  ])("rejects %s inside braces", (source, inside) => {
    expect(lexLine(source).diagnostics).toEqual([
      expect.objectContaining({ code: "E113", args: { inside } }),
    ]);
  });

  it("rejects a { that is never closed", () => {
    expect(lexLine('"a {b"').diagnostics).toEqual([expect.objectContaining({ code: "E113" })]);
  });

  it("rejects a lone }", () => {
    expect(lexLine('"a } b"').diagnostics).toEqual([expect.objectContaining({ code: "E114", column: 4 })]);
  });
});
