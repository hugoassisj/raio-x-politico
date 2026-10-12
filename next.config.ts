import type { NextConfig } from "next";

/** Pages rendered on demand read the published snapshot at request time, so it ships with the server. */
const SNAPSHOT = [`./${process.env.DATA_DIR ?? "data"}/**/*.json`];

/**
 * Security headers for every page. Scripts and styles stay limited to this site; inline ones are
 * needed by Next.js hydration and by the theme script that avoids a flash. Photos come from the
 * houses' and the TSE's servers. The site cannot be embedded in other pages.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SEGURANCA = [
  // The development server needs eval for fast refresh, so the policy applies to the built site only
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  // A second dev server (for example on the demo data) needs its own build folder
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async headers() {
    return [{ source: "/:path*", headers: SEGURANCA }];
  },
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
    "/api/politicos": SNAPSHOT,
    "/api/fornecedores": SNAPSHOT,
    "/gastos": SNAPSHOT,
    "/eleicoes": SNAPSHOT,
    "/emendas": SNAPSHOT,
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
