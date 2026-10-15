// Company: Arduino
// Checks the Arduino rover manifest and that programs are accepted or rejected against it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkProgram } from "../../src/checker/check-program.js";
import { checkManifest } from "../../src/checker/manifest.js";

const manifest = { name: "arduino-rover.uritp", source: readFileSync(new URL("arduino-rover.uritp", import.meta.url), "utf8") };
const lines = (...source: string[]): string => source.join("\n");

function codes(...statements: string[]): string[] {
  const program = { name: "main.uritp", source: lines('robot rover = connect("serial:/dev/ttyACM0")', ...statements) };
  return checkProgram({ program, manifests: { rover: manifest } }).diagnostics.map((d) => d.code);
}

describe("Arduino rover manifest", () => {
  it("is a valid manifest with only the core and navigation profiles", () => {
    const { model, diagnostics } = checkManifest(manifest.source, manifest.name);
    expect(diagnostics).toEqual([]);
    expect(model?.profiles).toEqual(["core", "navigation"]);
  });

  it("accepts driving until something is close", () => {
    expect(
      codes(
        "repeat 20 times:",
        '    if rover.sense("distance_front").value < 20cm:',
        "        break",
        "    drive rover.base forward by 5cm speed 0.1m/s",
        "turn rover.base by 180deg",
      ),
    ).toEqual([]);
  });

  it("rejects a bare number for the distance, suggesting 20cm", () => {
    expect(codes('let near = rover.sense("distance_front").value < 20')).toEqual(["E304"]);
  });

  it("rejects photos and speech, which it has no profile for", () => {
    expect(codes('capture rover.camera save as "a.jpg"')).toEqual(["E205"]);
    expect(codes('say "hello"')).toEqual(["E401"]);
  });

  it("rejects a speed above its safety limit", () => {
    expect(codes("drive rover.base forward by 1m speed 0.3m/s")).toEqual(["E502"]);
  });
});
