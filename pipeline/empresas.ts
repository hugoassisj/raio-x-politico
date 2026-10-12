/**
 * Companies (and parties or associations) linked to the people the site follows, by CNPJ only:
 * suppliers paid with the parliamentary quota, and donors or suppliers of their campaigns. A link
 * exists only when the CNPJ is the same and valid; names alone never link anything.
 */
import { documentoPublicavel } from "../src/lib/cnpj";
import type { EmpresaDetalhe, EmpresaResumo, PagamentoEmpresa } from "../src/lib/types";
import { round } from "./lib/util";
import type { Despesa } from "./model";
import type { RegistroCampanhaCnpj } from "./sources/tse-contas";

/**
 * Names of individual micro-entrepreneurs (MEI) carry the owner's CPF ("MARIA SILVA 12345678909").
 * The number is removed before anything is published.
 */
export function limparNomeEmpresa(nome: string): string {
  return nome
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,;:-]+$/, "")
    .trim();
}

/** Detail files are grouped by the first two characters of the CNPJ. */
export const balde = (cnpj: string) => cnpj.slice(0, 2);

/** Payments kept per person on the company page; the person's own page has the full list. */
export const PAGAMENTOS_POR_PESSOA = 12;

export function montarEmpresas(inp: {
  despesas: Despesa[];
  campanhas: RegistroCampanhaCnpj[];
  /** `${ano}:${sq}` of a candidacy -> person id */
  donoCandidatura: Map<string, string>;
  nomes: Map<string, string>;
  periodoCota: { inicio: string; fim: string };
}): { indice: EmpresaResumo[]; baldes: Map<string, Record<string, EmpresaDetalhe>> } {
  const det = new Map<string, EmpresaDetalhe & { _nomes: Map<string, number> }>();
  const de = (cnpj: string, nome: string, peso: number) => {
    let e = det.get(cnpj);
    if (!e) det.set(cnpj, (e = { cnpj, nome: "", nomes: [], _nomes: new Map() }));
    const n = limparNomeEmpresa(nome);
    if (n) e._nomes.set(n, (e._nomes.get(n) ?? 0) + peso);
    return e;
  };

  // Parliamentary quota
  type Acum = { valor: number; n: number; primeira?: string; ultima?: string; exemplo?: string; pagamentos: PagamentoEmpresa[] };
  const cota = new Map<string, Map<string, Acum>>();
  const categorias = new Map<string, Map<string, { valor: number; n: number }>>();
  for (const d of inp.despesas) {
    const cnpj = documentoPublicavel(d.doc);
    if (!cnpj || !(d.valor > 0)) continue;
    de(cnpj, d.fornecedor, d.valor);
    const porPessoa = cota.get(cnpj) ?? new Map<string, Acum>();
    const x = porPessoa.get(d.pid) ?? { valor: 0, n: 0, pagamentos: [] };
    x.valor += d.valor;
    x.n++;
    const quando = d.data ?? `${d.ano}-${String(d.mes).padStart(2, "0")}`;
    if (!x.primeira || quando < x.primeira) x.primeira = quando;
    if (!x.ultima || quando > x.ultima) {
      x.ultima = quando;
      x.exemplo = d.url ?? x.exemplo;
    }
    x.pagamentos.push({ data: quando, valor: round(d.valor, 2)!, categoria: d.categoria, url: d.url });
    porPessoa.set(d.pid, x);
    cota.set(cnpj, porPessoa);
    const porCat = categorias.get(cnpj) ?? new Map();
    const c = porCat.get(d.categoria) ?? { valor: 0, n: 0 };
    c.valor += d.valor;
    c.n++;
    porCat.set(d.categoria, c);
    categorias.set(cnpj, porCat);
  }
  for (const [cnpj, porPessoa] of cota) {
    const lista = [...porPessoa]
      .map(([pid, x]) => ({
        pid,
        nome: inp.nomes.get(pid) ?? pid,
        ...x,
        valor: round(x.valor, 2)!,
        // Newest first; ties by value so the order is stable between runs
        pagamentos: [...x.pagamentos].sort((a, b) => b.data.localeCompare(a.data) || b.valor - a.valor).slice(0, PAGAMENTOS_POR_PESSOA),
      }))
      .sort((a, b) => b.valor - a.valor || a.pid.localeCompare(b.pid));
    det.get(cnpj)!.cota = {
      total: round(
        lista.reduce((s, x) => s + x.valor, 0),
        2,
      )!,
      n: lista.reduce((s, x) => s + x.n, 0),
      periodo: inp.periodoCota,
      porPessoa: lista,
      porCategoria: [...(categorias.get(cnpj) ?? [])]
        .map(([categoria, c]) => ({ categoria, valor: round(c.valor, 2)!, n: c.n }))
        .sort((a, b) => b.valor - a.valor || a.categoria.localeCompare(b.categoria)),
      fonte: "Câmara dos Deputados e Senado Federal: cota para o exercício da atividade parlamentar",
    };
  }

  // Campaigns
  for (const r of inp.campanhas) {
    const pid = inp.donoCandidatura.get(`${r.ano}:${r.sq}`);
    const cnpj = documentoPublicavel(r.cnpj);
    if (!pid || !cnpj) continue;
    const e = de(cnpj, r.nome, r.valor);
    e.campanhas ??= { registros: [], fonte: "TSE: prestação de contas eleitorais dos candidatos" };
    const igual = e.campanhas.registros.find((x) => x.pid === pid && x.ano === r.ano && x.papel === r.papel);
    if (igual) igual.valor = round(igual.valor + r.valor, 2)!;
    else e.campanhas.registros.push({ pid, nome: inp.nomes.get(pid) ?? pid, papel: r.papel, ano: r.ano, valor: r.valor });
  }

  const baldes = new Map<string, Record<string, EmpresaDetalhe>>();
  const indice: EmpresaResumo[] = [];
  for (const e of det.values()) {
    const nomes = [...e._nomes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([n]) => n);
    e.campanhas?.registros.sort((a, b) => b.ano - a.ano || b.valor - a.valor || a.pid.localeCompare(b.pid));
    const final: EmpresaDetalhe = { cnpj: e.cnpj, nome: nomes[0] ?? e.cnpj, nomes: nomes.slice(1, 6), cota: e.cota, campanhas: e.campanhas };
    const b = baldes.get(balde(e.cnpj)) ?? {};
    b[e.cnpj] = final;
    baldes.set(balde(e.cnpj), b);
    const pessoas = new Set([...(e.cota?.porPessoa.map((x) => x.pid) ?? []), ...(e.campanhas?.registros.map((x) => x.pid) ?? [])]);
    indice.push({
      cnpj: e.cnpj,
      nome: final.nome,
      cota: e.cota?.total ?? 0,
      campanhas: round(e.campanhas?.registros.reduce((s, x) => s + x.valor, 0) ?? 0, 2)!,
      pessoas: pessoas.size,
    });
  }
  indice.sort((a, b) => b.cota + b.campanhas - (a.cota + a.campanhas) || a.cnpj.localeCompare(b.cnpj));
  return { indice, baldes };
}
