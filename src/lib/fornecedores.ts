/**
 * The suppliers table of /gastos: one row per supplier of the parliamentary quota, with the
 * numbers that help compare them, and the sort order that lives in the page address. Pure
 * functions, shared by the page, the CSV route and the tests.
 */
import type { EmpresaDetalhe, GastosGerais, PoliticoResumo } from "./types";

export interface LinhaFornecedor {
  nome: string;
  /** Valid CNPJ, when the supplier is a company; people never have one here */
  cnpj?: string;
  /** Whether /empresa/{cnpj} exists for it */
  temPagina: boolean;
  valor: number;
  parlamentares: number;
  n: number;
  /** Share of everything reimbursed in the period, 0 to 1 */
  parte: number;
  mediaPagamento: number;
  mediaParlamentar: number;
  deputados?: number;
  senadores?: number;
  estaduais?: number;
  maiorPagador?: { pid: string; nome: string; valor: number };
  /** Money given to or paid by campaigns of people the site follows */
  campanhas?: number;
  categoria?: string;
  primeira?: string;
  ultima?: string;
}

/** Builds the rows from the published spending summary, enriched by each company's own file when it exists. */
export function linhasFornecedores(
  fornecedores: GastosGerais["fornecedores"],
  totalCota: number,
  empresas: Map<string, EmpresaDetalhe | undefined>,
  pessoas: Map<string, PoliticoResumo>,
  cnpjDe: (doc?: string) => string | undefined,
): LinhaFornecedor[] {
  return fornecedores.map((f) => {
    const cnpj = cnpjDe(f.doc);
    const e = cnpj ? empresas.get(cnpj) : undefined;
    const linha: LinhaFornecedor = {
      nome: f.nome || "Sem nome",
      cnpj,
      temPagina: !!e,
      valor: f.valor,
      parlamentares: f.parlamentares,
      n: f.n,
      parte: totalCota > 0 ? f.valor / totalCota : 0,
      mediaPagamento: f.n > 0 ? f.valor / f.n : 0,
      mediaParlamentar: f.parlamentares > 0 ? f.valor / f.parlamentares : 0,
    };
    if (!e?.cota) return linha;
    const casas = { camara: 0, senado: 0, assembleia: 0 };
    let primeira: string | undefined;
    let ultima: string | undefined;
    for (const x of e.cota.porPessoa) {
      const p = pessoas.get(x.pid);
      if (p) casas[p.casa === "camara" ? "camara" : p.casa === "senado" ? "senado" : "assembleia"]++;
      if (x.primeira && (!primeira || x.primeira < primeira)) primeira = x.primeira;
      if (x.ultima && (!ultima || x.ultima > ultima)) ultima = x.ultima;
    }
    const top = e.cota.porPessoa[0];
    const campanhas = e.campanhas?.registros.reduce((s, r) => s + r.valor, 0);
    return {
      ...linha,
      deputados: casas.camara,
      senadores: casas.senado,
      estaduais: casas.assembleia,
      maiorPagador: top ? { pid: top.pid, nome: pessoas.get(top.pid)?.nome ?? top.nome, valor: top.valor } : undefined,
      campanhas: campanhas || undefined,
      categoria: e.cota.porCategoria?.[0]?.categoria,
      primeira,
      ultima,
    };
  });
}

export const ORDENS_FORNECEDOR = [
  "valor",
  "nome",
  "parlamentares",
  "n",
  "parte",
  "mediaPagamento",
  "mediaParlamentar",
  "deputados",
  "senadores",
  "estaduais",
  "campanhas",
  "primeira",
] as const;
export type OrdemFornecedor = (typeof ORDENS_FORNECEDOR)[number];

export interface OrdemFornecedores {
  ordem: OrdemFornecedor;
  dir: "asc" | "desc";
}

export const ORDEM_FORNECEDORES_INICIAL: OrdemFornecedores = { ordem: "valor", dir: "desc" };

const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Reads the order from the address; unknown values fall back to the default. */
export function lerOrdemFornecedores(sp: Record<string, string | string[] | undefined>): OrdemFornecedores {
  const ordem = t(sp.ordem) as OrdemFornecedor;
  const dir = t(sp.dir);
  if (!ORDENS_FORNECEDOR.includes(ordem)) return ORDEM_FORNECEDORES_INICIAL;
  return { ordem, dir: dir === "asc" || dir === "desc" ? dir : ordem === "nome" ? "asc" : "desc" };
}

/** Address of /gastos (or the CSV route) sorted one way, written only when it differs from the default. */
export function urlFornecedores(base: string, o: OrdemFornecedores, ancora = ""): string {
  const u = new URLSearchParams();
  if (o.ordem !== ORDEM_FORNECEDORES_INICIAL.ordem || o.dir !== ORDEM_FORNECEDORES_INICIAL.dir) {
    u.set("ordem", o.ordem);
    u.set("dir", o.dir);
  }
  return `${base}${u.size ? `?${u}` : ""}${ancora}`;
}

/** Tapping the sorted column flips it; tapping another sorts it the natural way (names A to Z, numbers largest first). */
export function proximaOrdem(atual: OrdemFornecedores, coluna: OrdemFornecedor): OrdemFornecedores {
  if (atual.ordem === coluna) return { ordem: coluna, dir: atual.dir === "asc" ? "desc" : "asc" };
  return { ordem: coluna, dir: coluna === "nome" || coluna === "primeira" ? "asc" : "desc" };
}

/** Sorts by the chosen column; rows without a value go last; name and CNPJ break ties so the order is stable. */
export function ordenarFornecedores(linhas: LinhaFornecedor[], o: OrdemFornecedores): LinhaFornecedor[] {
  const sinal = o.dir === "asc" ? 1 : -1;
  const chave = (l: LinhaFornecedor): number | string | undefined => l[o.ordem];
  const base = (a: LinhaFornecedor, b: LinhaFornecedor) => a.nome.localeCompare(b.nome, "pt-BR") || (a.cnpj ?? "").localeCompare(b.cnpj ?? "");
  return [...linhas].sort((a, b) => {
    const ka = chave(a);
    const kb = chave(b);
    if (ka == null && kb == null) return base(a, b);
    if (ka == null) return 1;
    if (kb == null) return -1;
    const c = typeof ka === "string" && typeof kb === "string" ? ka.localeCompare(kb, "pt-BR") : Number(ka) - Number(kb);
    return c * sinal || base(a, b);
  });
}
