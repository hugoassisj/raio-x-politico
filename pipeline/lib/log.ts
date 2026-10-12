const t0 = Date.now();
const ts = () => `[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s]`;

export const log = {
  info: (...a: unknown[]) => console.log(ts(), ...a),
  warn: (...a: unknown[]) => console.warn(ts(), "⚠", ...a),
  error: (...a: unknown[]) => console.error(ts(), "✖", ...a),
  step: (name: string) => console.log(`\n${ts()} ▶ ${name}`),
};
