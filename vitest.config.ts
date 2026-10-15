// Tells Vitest where the tests live: shared tests in tests/ and conformance/, and each company's
// own tests next to its code in manifests/<company>/ and drivers/<company>/.
// Tests import describe/it/expect from "vitest" directly, so no globals are needed.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "manifests/**/*.test.ts", "drivers/**/*.test.ts", "conformance/**/*.test.ts"],
  },
});
