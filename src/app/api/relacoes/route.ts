import { normalizarCnpj } from "@/lib/cnpj";
import { getEmpresa, getEmpresas, getPolitico, getPoliticos } from "@/lib/data";
import { grafoDaEmpresa, grafoDaPessoa, type Grafo } from "@/lib/grafo";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CACHE = { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" };

/**
 * Relationship map data, built from the published files.
 *   ?no=p:dep-123          links of one person
 *   ?no=e:11222333000181   links of one company
 *   ?busca=texto           people and companies whose name matches, to start the map
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const busca = (u.searchParams.get("busca") ?? "").trim().slice(0, 80);
  if (busca) {
    const t = norm(busca);
    const cnpj = normalizarCnpj(busca);
    const [pols, emps] = await Promise.all([getPoliticos(), getEmpresas()]);
    const pessoas = pols
      .filter((p) => norm(`${p.nome} ${p.nomeCivil ?? ""}`).includes(t))
      .slice(0, 8)
      .map((p) => ({ id: `p:${p.id}`, rotulo: p.nome, detalhe: `${p.cargo} · ${p.partido}-${p.uf}` }));
    const empresas = emps
      .filter((e) => (cnpj ? e.cnpj === cnpj : norm(e.nome).includes(t)))
      .slice(0, 8)
      .map((e) => ({ id: `e:${e.cnpj}`, rotulo: e.nome, detalhe: "Empresa" }));
    return Response.json([...pessoas, ...empresas], { headers: CACHE });
  }

  const no = u.searchParams.get("no") ?? "";
  let g: Grafo | undefined;
  if (no.startsWith("p:")) {
    const p = await getPolitico(no.slice(2));
    if (p) g = grafoDaPessoa(p);
  } else if (no.startsWith("e:")) {
    const e = await getEmpresa(no.slice(2));
    if (e) g = grafoDaEmpresa(e, new Map((await getPoliticos()).map((p) => [p.id, p])));
  }
  if (!g) return Response.json({ erro: "Não encontrado" }, { status: 404 });
  return Response.json(g, { headers: CACHE });
}
