import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // server-only throws outside a React Server Components bundle; tests run plain Node
      "server-only": path.resolve(import.meta.dirname, "test/vazio.ts"),
    },
  },
  test: {
    include: ["pipeline/tests/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
});
