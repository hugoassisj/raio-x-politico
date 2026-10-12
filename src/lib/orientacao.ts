/**
 * Shared by the pipeline (to compute loyalty) and the app (to display orientations), so both
 * always resolve a party's orientation the same way.
 */
const canon = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Find the orientation that applies to a party: own row > federation row > bloc row. */
export function orientacaoDoPartido(orientacoes: { sigla: string; orientacao: string }[], partido: string): string | undefined {
  if (!partido) return undefined;
  const P = canon(partido).replace(/[^a-z0-9]/g, "");
  const rows = orientacoes.map((o) => ({ ...o, k: canon(o.sigla).replace(/\s+/g, " ") }));
  const exact = rows.find((o) => o.k.replace(/[^a-z0-9]/g, "") === P);
  if (exact) return exact.orientacao;
  // Federation, e.g. "Fdr PT-PCdoB-PV"
  for (const o of rows) {
    if (!/^(fdr|federa)/.test(o.k)) continue;
    const parts = o.k
      .replace(/^(fdr|federacao)\s*/, "")
      .split(/[-/ ]+/)
      .map((x) => x.replace(/[^a-z0-9]/g, ""));
    if (parts.includes(P)) return o.orientacao;
  }
  // Bloc with camel-cased, truncated party names, e.g. "Bl UniPpPsd..."
  for (const o of orientacoes) {
    if (!/^bl/i.test(o.sigla)) continue;
    const body = o.sigla.replace(/^bl(oco)?\s*/i, "").replace(/\.+$/, "");
    const tokens = body
      .split(/(?=[A-Z])|[-/ ]+/)
      .map((t) => canon(t).replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);
    if (tokens.some((t) => t === P || (t.length >= 3 && P.startsWith(t)))) return o.orientacao;
  }
  return undefined;
}
