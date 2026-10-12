import type { NextConfig } from "next";

/** Pages rendered on demand read the published snapshot at request time, so it ships with the server. */
const SNAPSHOT = [`./${process.env.DATA_DIR ?? "data"}/**/*.json`];

const nextConfig: NextConfig = {
  // Contributor guidance lives in AGENTS.md, maintained by hand
  agentRules: false,
  outputFileTracingIncludes: {
    "/politicos": SNAPSHOT,
    "/votacoes": SNAPSHOT,
    "/falas": SNAPSHOT,
    "/comparar": SNAPSHOT,
    "/empresas": SNAPSHOT,
    "/empresa/[cnpj]": SNAPSHOT,
    "/relacoes": SNAPSHOT,
    "/api/relacoes": SNAPSHOT,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "www.senado.leg.br" },
      { protocol: "http", hostname: "www.senado.leg.br" },
      { protocol: "https", hostname: "divulgacandcontas.tse.jus.br" },
    ],
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
