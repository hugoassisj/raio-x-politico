import { getPoliticos } from "@/lib/data";
import type { ItemIndice } from "@/components/Busca";

export const dynamic = "force-static";

const CARGO_CURTO: Record<string, string> = {
  "Deputado(a) Federal": "Dep. federal",
  "Senador(a)": "Senador(a)",
  "Deputado(a) Estadual": "Dep. estadual",
  "Deputado(a) Distrital": "Dep. distrital",
};

/** Compact search index: one tuple per politician, fetched once by the search box. */
export async function GET() {
  const pols = await getPoliticos();
  const itens: ItemIndice[] = pols.map((p) => [p.id, p.nome, p.nomeCivil ?? "", p.partido, p.uf, CARGO_CURTO[p.cargo] ?? p.cargo, p.foto ?? ""]);
  return Response.json(itens, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
