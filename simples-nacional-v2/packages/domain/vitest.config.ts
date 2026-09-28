import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"], // barrel sem logica
      thresholds: { lines: 100, functions: 100, branches: 100 },
    },
  },
  resolve: {
    alias: [
      {
        find: "@v2/tax-rules",
        replacement: fileURLToPath(new URL("../tax-rules/src/index.ts", import.meta.url)),
      },
    ],
  },
});
