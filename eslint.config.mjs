import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Ingestion code reads schema-less government payloads (JSON, XML, CSV) whose shapes vary
    // between endpoints and over time. Those payloads are parsed defensively and normalized into
    // the typed contract in src/lib/types.ts, which the app consumes with full type safety.
    files: ["pipeline/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/**", "data-demo/**", ".cache/**", "drizzle/**"]),
]);

export default eslintConfig;
