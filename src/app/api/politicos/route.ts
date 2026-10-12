import { getPoliticos } from "@/lib/data";
import { filtrarOrdenar, lerFiltro } from "@/lib/filtros";
import { METRICAS } from "@/lib/metricas";

/** One CSV value: quoted when needed, numbers with a dot, nothing for a missing value. */
const celula = (v: unknown) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The whole filtered list of /politicos as CSV (same filters and order as the page). */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const lista = filtrarOrdenar(await getPoliticos(), lerFiltro(sp));
  const cab = ["id", "nome", "cargo", "partido", "uf", "inicio_politica", ...METRICAS.map((m) => m.chave)];
  const linhas = lista.map((p) => [p.id, p.nome, p.cargo, p.partido, p.uf, p.inicioPolitica, ...METRICAS.map((m) => p.m[m.chave])].map(celula).join(","));
  return new Response([cab.join(","), ...linhas].join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="raio-x-politicos.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
