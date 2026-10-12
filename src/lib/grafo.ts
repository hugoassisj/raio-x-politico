/**
 * The relationship map: people, companies, parties and municipalities, joined only by links that
 * an official record proves. Every link carries its evidence; a link without evidence, or a
 * company link without a valid CNPJ, is never marked as confirmed.
 */
import { cnpjValido, formatarCnpj } from "./cnpj";
import { nomePartido } from "./partidos";
import type { EmpresaDetalhe, PoliticoDetalhe, PoliticoResumo } from "./types";

export type TipoNo = "pessoa" | "empresa" | "partido" | "municipio";
export type TipoLigacao = "filiacao" | "cota" | "doacao-campanha" | "fornecedor-campanha" | "emenda";

export interface No {
  /** "p:dep-1", "e:11222333000181", "pt:PL", "m:SP:Campinas" */
  id: string;
  tipo: TipoNo;
  rotulo: string;
  detalhe?: string;
  href?: string;
  /** Whether asking for this node returns more links */
  expansivel: boolean;
}

export interface Evidencia {
  texto: string;
  fonte: string;
  url?: string;
}

export interface Ligacao {
  id: string;
  de: string;
  para: string;
  tipo: TipoLigacao;
  rotulo: string;
  valor?: number;
  evidencias: Evidencia[];
  confirmada: boolean;
}

export interface Grafo {
  nos: No[];
  ligacoes: Ligacao[];
}

export const TIPOS_LIGACAO: { id: TipoLigacao; rotulo: string; explicacao: string }[] = [
  { id: "filiacao", rotulo: "Partido", explicacao: "Partido atual da pessoa, segundo a Casa." },
  { id: "cota", rotulo: "Paga com a cota", explicacao: "A empresa recebeu reembolsos da cota parlamentar desta pessoa." },
  { id: "doacao-campanha", rotulo: "Doou para campanha", explicacao: "A empresa ou entidade doou para uma campanha da pessoa, segundo o TSE." },
  { id: "fornecedor-campanha", rotulo: "Paga pela campanha", explicacao: "A campanha da pessoa pagou a empresa, segundo o TSE." },
  { id: "emenda", rotulo: "Emenda enviada", explicacao: "A pessoa indicou dinheiro do orçamento para o município ou estado." },
];

export const idPessoa = (pid: string) => `p:${pid}`;
export const idEmpresa = (cnpj: string) => `e:${cnpj}`;

/**
 * A link is confirmed only with at least one piece of evidence and, when it involves a company,
 * a valid CNPJ. Anything else is kept as unconfirmed so the interface can never present it as fact.
 */
export function conferir(l: Omit<Ligacao, "confirmada" | "id">): Ligacao {
  const empresas = [l.de, l.para].filter((x) => x.startsWith("e:"));
  const confirmada = l.evidencias.length > 0 && empresas.every((e) => cnpjValido(e.slice(2)));
  return { ...l, id: `${l.tipo}|${l.de}|${l.para}`, confirmada };
}

function noPessoa(p: Pick<PoliticoResumo, "id" | "nome" | "cargo" | "partido" | "uf">): No {
  return { id: idPessoa(p.id), tipo: "pessoa", rotulo: p.nome, detalhe: `${p.cargo} · ${p.partido}-${p.uf}`, href: `/politico/${p.id}`, expansivel: true };
}

function noEmpresa(cnpj: string, nome: string): No {
  return { id: idEmpresa(cnpj), tipo: "empresa", rotulo: nome, detalhe: `CNPJ ${formatarCnpj(cnpj)}`, href: `/empresa/${cnpj}`, expansivel: true };
}

/** Links of one person, from their own published file. */
export function grafoDaPessoa(p: PoliticoDetalhe): Grafo {
  const eu = noPessoa(p);
  const nos = new Map<string, No>([[eu.id, eu]]);
  const ligacoes: Ligacao[] = [];
  const oficial = p.fontes.find((f) => /dados abertos/i.test(f.nome)) ?? p.fontes[0];

  if (p.partido) {
    const id = `pt:${p.partido}`;
    nos.set(id, { id, tipo: "partido", rotulo: p.partido, detalhe: nomePartido(p.partido), href: `/partido/${encodeURIComponent(p.partido)}`, expansivel: false });
    ligacoes.push(
      conferir({
        de: eu.id,
        para: id,
        tipo: "filiacao",
        rotulo: `Filiada(o) ao ${p.partido}`,
        evidencias: oficial ? [{ texto: "Partido informado pela Casa", fonte: oficial.nome, url: oficial.url }] : [],
      }),
    );
  }

  for (const f of p.gastos?.topFornecedores ?? []) {
    if (!f.doc || !cnpjValido(f.doc)) continue;
    const no = noEmpresa(f.doc, f.nome);
    nos.set(no.id, no);
    ligacoes.push(
      conferir({
        de: eu.id,
        para: no.id,
        tipo: "cota",
        rotulo: "Paga com a cota parlamentar",
        valor: f.valor,
        evidencias: [{ texto: `${f.n} ${f.n === 1 ? "pagamento" : "pagamentos"} nos últimos 12 meses`, fonte: "Cota parlamentar (Câmara ou Senado)", url: `/empresa/${f.doc}` }],
      }),
    );
  }

  for (const e of p.eleicoes) {
    const c = e.campanha;
    if (!c) continue;
    for (const d of c.doadores) {
      if (!d.cnpj || !cnpjValido(d.cnpj)) continue;
      const no = noEmpresa(d.cnpj, d.nome);
      nos.set(no.id, no);
      ligacoes.push(
        conferir({
          de: no.id,
          para: eu.id,
          tipo: "doacao-campanha",
          rotulo: `Doou para a campanha de ${e.ano}`,
          valor: d.valor,
          evidencias: [{ texto: `${d.origem}, eleição de ${e.ano}`, fonte: "TSE: prestação de contas", url: c.fonte }],
        }),
      );
    }
    for (const f of c.fornecedores) {
      if (!f.cnpj || !cnpjValido(f.cnpj)) continue;
      const no = noEmpresa(f.cnpj, f.nome);
      nos.set(no.id, no);
      ligacoes.push(
        conferir({
          de: eu.id,
          para: no.id,
          tipo: "fornecedor-campanha",
          rotulo: `Paga pela campanha de ${e.ano}`,
          valor: f.valor,
          evidencias: [{ texto: `Despesa contratada na eleição de ${e.ano}`, fonte: "TSE: prestação de contas", url: c.fonte }],
        }),
      );
    }
  }

  for (const d of p.emendas?.destinos ?? []) {
    const id = `m:${d.uf ?? ""}:${d.nome}`;
    nos.set(id, { id, tipo: "municipio", rotulo: d.nome, detalhe: d.uf, expansivel: false });
    ligacoes.push(
      conferir({
        de: eu.id,
        para: id,
        tipo: "emenda",
        rotulo: "Indicou emendas",
        valor: d.valor,
        evidencias: p.emendas ? [{ texto: "Emendas com este destino", fonte: p.emendas.fonte }] : [],
      }),
    );
  }

  return { nos: [...nos.values()], ligacoes: somarRepetidas(ligacoes) };
}

/** Links of one company, from its published file, to the people the site knows. */
export function grafoDaEmpresa(e: EmpresaDetalhe, pessoas: Map<string, PoliticoResumo>): Grafo {
  const eu = noEmpresa(e.cnpj, e.nome);
  const nos = new Map<string, No>([[eu.id, eu]]);
  const ligacoes: Ligacao[] = [];
  const no = (pid: string, nome: string) => {
    const p = pessoas.get(pid);
    const n: No = p ? noPessoa(p) : { id: idPessoa(pid), tipo: "pessoa", rotulo: nome, href: /^pres-/.test(pid) ? `/presidencia/${pid}` : undefined, expansivel: false };
    nos.set(n.id, n);
    return n.id;
  };
  for (const x of e.cota?.porPessoa ?? []) {
    ligacoes.push(
      conferir({
        de: no(x.pid, x.nome),
        para: eu.id,
        tipo: "cota",
        rotulo: "Paga com a cota parlamentar",
        valor: x.valor,
        evidencias: [{ texto: `${x.n} ${x.n === 1 ? "pagamento" : "pagamentos"}`, fonte: e.cota!.fonte, url: x.exemplo }],
      }),
    );
  }
  for (const r of e.campanhas?.registros ?? []) {
    const doacao = r.papel === "doador";
    const pid = no(r.pid, r.nome);
    ligacoes.push(
      conferir({
        de: doacao ? eu.id : pid,
        para: doacao ? pid : eu.id,
        tipo: doacao ? "doacao-campanha" : "fornecedor-campanha",
        rotulo: doacao ? `Doou para a campanha de ${r.ano}` : `Paga pela campanha de ${r.ano}`,
        valor: r.valor,
        evidencias: [{ texto: `Eleição de ${r.ano}`, fonte: e.campanhas!.fonte }],
      }),
    );
  }
  return { nos: [...nos.values()], ligacoes: somarRepetidas(ligacoes) };
}

/** The same link found twice (two campaigns of one year, for example) becomes one, with both evidences. */
function somarRepetidas(ls: Ligacao[]): Ligacao[] {
  const m = new Map<string, Ligacao>();
  for (const l of ls) {
    const k = `${l.id}|${l.rotulo}`;
    const x = m.get(k);
    if (!x) m.set(k, l);
    else m.set(k, { ...x, valor: (x.valor ?? 0) + (l.valor ?? 0), evidencias: [...x.evidencias, ...l.evidencias], confirmada: x.confirmada && l.confirmada });
  }
  return [...m.values()];
}

/** Joins what was already on screen with a newly expanded node, without duplicates. */
export function juntarGrafos(a: Grafo, b: Grafo): Grafo {
  const nos = new Map(a.nos.map((n) => [n.id, n]));
  for (const n of b.nos) if (!nos.has(n.id) || (n.expansivel && !nos.get(n.id)!.expansivel)) nos.set(n.id, n);
  const ligacoes = new Map(a.ligacoes.map((l) => [`${l.id}|${l.rotulo}`, l]));
  for (const l of b.ligacoes) ligacoes.set(`${l.id}|${l.rotulo}`, l);
  return { nos: [...nos.values()], ligacoes: [...ligacoes.values()] };
}
