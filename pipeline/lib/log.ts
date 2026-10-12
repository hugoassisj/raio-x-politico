const t0 = Date.now();
const ts = () => `[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`;

/** In GitHub Actions, errors also become annotations, the only part of a run readable without the full log. */
const ACOES = process.env.GITHUB_ACTIONS === "true";
const anotar = (tipo: "error" | "warning", a: unknown[]) => {
  if (!ACOES) return;
  const texto = a
    .map((x) => (x instanceof Error ? `${x.message}\n${x.stack ?? ""}` : String(x)))
    .join(" ")
    .slice(0, 4000)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
  console.log(`::${tipo}::${texto}`);
};

export const log = {
  info: (...a: unknown[]) => console.log(ts(), ...a),
  warn: (...a: unknown[]) => console.warn(ts(), "⚠", ...a),
  /** A warning that a person reading the run summary must see */
  aviso: (...a: unknown[]) => {
    console.warn(ts(), "⚠", ...a);
    anotar("warning", a);
  },
  error: (...a: unknown[]) => {
    console.error(ts(), "✖", ...a);
    anotar("error", a);
  },
  step: (name: string) => console.log(`\n${ts()} ▶ ${name}`),
};
