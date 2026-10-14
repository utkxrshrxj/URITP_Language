// Tells Vitest where the tests live.
// Tests import describe/it/expect from "vitest" directly, so no globals are needed.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
