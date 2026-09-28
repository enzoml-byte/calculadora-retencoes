import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 60000,
    pool: "forks",
  },
  resolve: {
    alias: [
      { find: "@v2/tax-rules", replacement: fileURLToPath(new URL("../../packages/tax-rules/src/index.ts", import.meta.url)) },
      { find: "@v2/domain", replacement: fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)) },
    ],
  },
});
