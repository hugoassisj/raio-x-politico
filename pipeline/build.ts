import { mkdir, rm, writeFile } from "node:fs/promises";
import { documentoPublicavel } from "../src/lib/cnpj";
import path from "node:path";
import {
  DATA_VERSION,
  type Agregado,
  type EleicaoTSE,
  type Emendas,
  type Fala,
  type CampanhaFinancas,
  type Presidencia,
  type Mandato,
  type MateriaVotada,
  type Metricas,
  type PoliticoDetalhe,
  type PoliticoResumo,
  type RedeSocial,
  type VotacaoDetalhe,
  type VotacaoResumo,
  type FonteStatus,
  type GastosGerais,
  type Meta,
} from "../src/lib/types";
import { calcularGastos, calcularPresenca, calcularVotos, emExercicioEm, enriquecerVotacoes, janela12, ultimoMesCompleto } from "./metrics";
import type { CandidatoTSE, Despesa, EmendaAgg, PoliticoParcial, Sessao } from "./model";
import { capitalizar, groupBy, median, mean, nameSimilarity, nomeProprio, norm, round } from "./lib/util";
import { SEN_PRESENTE } from "./sources/senado";
import { eleito, ELEICAO_DIVULGA } from "./sources/tse";
import { cpfNorm, tituloNorm, type ChavesPessoa } from "./sources/tse-historico";
import { resultadoDe } from "../src/lib/carreira";
import { handleDe, normalizaUrl, plataforma } from "./sources/falas";

export interface BuildInput {
  hoje: Date;
  politicos: PoliticoParcial[];
  votacoes: VotacaoDetalhe[];
  despesas: Despesa[];
  sessoes: Sessao[];
  tse: CandidatoTSE[];
  tseRedes: Map<string, string[]>;
  emendas: Map<string, EmendaAgg>;
  falas: Fala[];
  /** Every candidacy found for each person, all years and offices (see tse-historico.ts) */
  historico?: Map<string, CandidatoTSE[]>;
  /** Campaign finance keyed by `${ano}:${sq}` */
  contas?: Map<string, CampanhaFinancas>;
}

export interface BuildResult {
  detalhes: PoliticoDetalhe[];
  resumos: PoliticoResumo[];
  votacoes: VotacaoDetalhe[];
  redes: RedeSocial[];
  gastosGerais?: GastosGerais;
}

// ------------------------------------------------------------ TSE linkage

/** Câmara masks CPFs as "742***287": compare the visible prefix and suffix. */
function cpfCompativel(mascarado: string | undefined, cpf: string | undefined) {
  if (!mascarado || !cpf) return undefined;
  const m = mascarado.replace(/[^\d*]/g, "").match(/^(\d+)\*+(\d+)$/);
  const c = cpf.replace(/\D/g, "").padStart(11, "0");
  if (!m || c.length !== 11) return undefined;
  return c.startsWith(m[1]) && c.endsWith(m[2]);
}

/**
 * Link a legislator to every TSE candidacy that belongs to the same person.
 * Strongest signal first: masked CPF (Câmara) + birth date; then birth date + name; then UF + name.
 */
export function vincularTSE(p: PoliticoParcial, porNascimento: Map<string, CandidatoTSE[]>, porUf: Map<string, CandidatoTSE[]>): CandidatoTSE[] {
  if (p.sqCandidato) {
    const base = [...(porUf.get(p.uf) ?? [])].find((c) => c.sq === p.sqCandidato);
    if (base) {
      const mesmos = (base.nascimento ? porNascimento.get(base.nascimento) : undefined) ?? [base];
      return mesmos.filter((c) => c === base || (c.cpf && c.cpf === base.cpf) || nameSimilarity(c.nome, base.nome) >= 0.85);
    }
  }
  const nomes = [p.nomeCivil, p.nome].filter(Boolean) as string[];
  const sim = (c: CandidatoTSE) => Math.max(...nomes.map((n) => Math.max(nameSimilarity(n, c.nome), nameSimilarity(n, c.nomeUrna))));
  const nasc = p.perfil?.nascimento;
  let pool: CandidatoTSE[] = [];
  if (nasc && porNascimento.has(nasc)) {
    pool = porNascimento.get(nasc)!.filter((c) => {
      const cpf = cpfCompativel(p.cpfMascarado, c.cpf);
      if (cpf === false) return false;
      return cpf === true ? sim(c) >= 0.4 : sim(c) >= 0.6;
    });
  } else {
    pool = (porUf.get(p.uf) ?? []).filter((c) => sim(c) >= 0.9);
  }
  // one candidacy per election year; prefer the best name match
  const porAno = groupBy(pool, (c) => String(c.ano));
  return [...porAno.values()].map((cs) => cs.sort((a, b) => sim(b) - sim(a))[0]).sort((a, b) => a.ano - b.ano);
}

/** Recent candidacies of each person (2018 to 2026), the starting point to follow their whole life. */
export function ancorasTSE(politicos: PoliticoParcial[], tse: CandidatoTSE[]): Map<string, CandidatoTSE[]> {
  const porNasc = groupBy(
    tse.filter((c) => c.nascimento),
    (c) => c.nascimento!,
  );
  const porUf = groupBy(tse, (c) => c.uf);
  return new Map(politicos.map((p) => [p.id, vincularTSE(p, porNasc, porUf)]));
}

/** Identity keys of a person taken from their recent candidacies. */
export function chavesDaPessoa(pid: string, ancoras: CandidatoTSE[], p?: PoliticoParcial): ChavesPessoa {
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
  // Two different birth dates among the anchors mean a doubtful link: follow nobody
  const nascimentos = uniq(ancoras.map((c) => c.nascimento));
  if (nascimentos.length > 1) return { pid, titulos: [], cpfs: [], nomes: [] };
  return {
    pid,
    titulos: uniq(ancoras.map((c) => tituloNorm(c.titulo))),
    cpfs: uniq(ancoras.map((c) => cpfNorm(c.cpf))),
    nascimento: nascimentos[0] ?? p?.perfil?.nascimento,
    nomes: uniq([...ancoras.map((c) => c.nome), p?.nomeCivil]),
  };
}

const DIVULGA = "https://divulgacandcontas.tse.jus.br/divulga/#/candidato";

function resultado2026(cs: CandidatoTSE[], cargoAtual: string): string | undefined {
  const c = cs.find((x) => x.ano === 2026);
  if (!c) return undefined;
  const s = (c.situacao ?? "").toLowerCase();
  const mesmoCargo = norm(c.cargo).startsWith(norm(cargoAtual).split(" ")[0]);
  if (/2.? ?turno/.test(s)) return `Disputa o 2º turno para ${c.cargo.toLowerCase()}`;
  if (eleito(c.situacao)) return mesmoCargo ? "Reeleito(a)" : `Eleito(a) ${c.cargo.toLowerCase()}`;
  if (/suplente/.test(s)) return `Suplente (${c.cargo.toLowerCase()})`;
  if (/n[aã]o eleito/.test(s)) return `Não eleito(a) para ${c.cargo.toLowerCase()}`;
  if (/indefer|cancel|renun|cassad/.test(s)) return `Candidatura ${s}`;
  return `Candidato(a) a ${c.cargo.toLowerCase()}`;
}

/** Years in office per elected position; senators serve 8, everyone else 4. Substitutes only serve if called, which the TSE files do not say. */
const DURACAO: Record<number, number> = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 8, 6: 4, 7: 4, 8: 4, 11: 4, 12: 4, 13: 4 };

function mandatosTSE(cs: CandidatoTSE[]): Mandato[] {
  return cs
    .filter((c) => eleito(c.situacao) && c.ano < new Date().getUTCFullYear() && DURACAO[c.codCargo])
    .map((c) => ({
      cargo: capitalizar(c.cargo),
      inicio: c.ano + 1,
      fim: c.ano + DURACAO[c.codCargo],
      uf: c.uf,
      municipio: c.municipio,
      partido: c.partido,
      fonte: `TSE - Eleições ${c.ano}`,
    }));
}

function mesclarCarreira(a: Mandato[], b: Mandato[]) {
  const all = [...a];
  for (const m of b) {
    const dup = all.some((x) => Math.abs(x.inicio - m.inicio) <= 1 && norm(x.cargo).slice(0, 6) === norm(m.cargo).slice(0, 6));
    if (!dup) all.push(m);
  }
  return all.sort((x, y) => x.inicio - y.inicio);
}

/**
 * Anchors (recent candidacies) and the history found by título/CPF describe the same candidacies
 * for recent years; keep one per election (year + candidacy id), preferring the richer record.
 */
export function juntarCandidaturas(ancoras: CandidatoTSE[], historico: CandidatoTSE[]): CandidatoTSE[] {
  const m = new Map<string, CandidatoTSE>();
  for (const c of [...historico, ...ancoras]) {
    const k = `${c.ano}:${c.sq}`;
    const prev = m.get(k);
    m.set(k, prev ? { ...c, ...prev, votos: prev.votos ?? c.votos, bens: prev.bens ?? c.bens, patrimonio: prev.patrimonio ?? c.patrimonio } : c);
  }
  return [...m.values()].sort((a, b) => a.ano - b.ano || a.codCargo - b.codCargo);
}

/** "BELO HORIZONTE" -> "Belo Horizonte" */
const nomeProprioMunicipio = (s: string) => (s === s.toUpperCase() ? nomeProprio(s) : s);

// ------------------------------------------------------------ emendas

function vincularEmendas(p: PoliticoParcial, agg: Map<string, EmendaAgg>): Emendas | undefined {
  if (p.casa === "assembleia") return undefined;
  const keys = [p.nome, p.nomeCivil].filter(Boolean).map((n) => norm(n));
  let a: EmendaAgg | undefined;
  for (const k of keys) if ((a = agg.get(k))) break;
  if (!a) {
    let best = 0;
    for (const [k, v] of agg) {
      const s = Math.max(...keys.map((x) => nameSimilarity(x, k)));
      if (s > best && s >= 0.92) [a, best] = [v, s];
    }
  }
  if (!a) return undefined;
  return {
    total: round(a.total, 2)!,
    porAno: [...a.porAno.entries()].map(([ano, valor]) => ({ ano, valor: round(valor, 2)! })).sort((x, y) => x.ano - y.ano),
    destinos: [...a.destinos.values()]
      .sort((x, y) => y.valor - x.valor)
      .slice(0, 15)
      .map((d) => ({ ...d, valor: round(d.valor, 2)! })),
    fonte: a.fonte,
  };
}

/**
 * Lists, for each Câmara roll call, the deputies in office that day (from the house's status
 * history) who are missing from the official list. The Senado list already names every senator
 * with a code (leave, mission, absence), and its exercise history is not collected, so it gets none.
 */
export function marcarSemRegistro(votacoes: VotacaoDetalhe[], politicos: PoliticoParcial[]) {
  const deputados = politicos.filter((p) => p.casa === "camara");
  for (const v of votacoes) {
    if (v.casa !== "camara" || !v.votos.length) continue;
    const votaram = new Set(v.votos.map((x) => x.pid));
    v.semRegistro = deputados
      .filter((p) => !votaram.has(p.id) && emExercicioEm(p, v.data))
      .map((p) => ({ pid: p.id, nome: p.nome, partido: p.partido, uf: p.uf }))
      .sort((a, b) => a.pid.localeCompare(b.pid));
  }
}

/** One candidacy as shown on the site: plain result, assets, campaign money and its TSE page. */
export function eleicaoDe(c: CandidatoTSE, contas?: Map<string, CampanhaFinancas>): EleicaoTSE {
  return {
    ano: c.ano,
    cargo: capitalizar(c.cargo),
    uf: c.uf,
    municipio: c.municipio ? nomeProprioMunicipio(c.municipio) : undefined,
    partido: c.partido,
    numero: c.numero,
    situacao: c.situacao,
    resultado: resultadoDe(c.situacao),
    situacaoRegistro: c.situacaoRegistro,
    votos: c.votos,
    patrimonio: c.patrimonio != null ? round(c.patrimonio, 2) : undefined,
    bens: c.bens?.slice(0, 12),
    ocupacao: c.ocupacao ? capitalizar(c.ocupacao) : undefined,
    instrucao: c.instrucao ? capitalizar(c.instrucao) : undefined,
    campanha: contas?.get(`${c.ano}:${c.sq}`),
    url: ELEICAO_DIVULGA[c.ano] && c.uf.length === 2 ? `${DIVULGA}/${c.ano}/${ELEICAO_DIVULGA[c.ano]}/${c.uf}/${c.sq}` : undefined,
  };
}

// ------------------------------------------------------------ main

export function montar(inp: BuildInput): BuildResult {
  const { hoje } = inp;
  enriquecerVotacoes(inp.votacoes);
  marcarSemRegistro(inp.votacoes, inp.politicos);
  const v = calcularVotos(inp.votacoes, inp.politicos, SEN_PRESENTE);
  const presenca = calcularPresenca(inp.sessoes, inp.politicos);
  const gastosPorCasa = new Map<string, ReturnType<typeof calcularGastos>>();
  const casaDe = new Map(inp.politicos.map((p) => [p.id, p.casa]));
  for (const [casa, ds] of groupBy(inp.despesas, (d) => casaDe.get(d.pid) ?? "?")) gastosPorCasa.set(casa, calcularGastos(ds, hoje));

  const porNasc = groupBy(
    inp.tse.filter((c) => c.nascimento),
    (c) => c.nascimento!,
  );
  const porUf = groupBy(inp.tse, (c) => c.uf);
  const falasPorPid = groupBy(inp.falas, (f) => f.pid);
  const redesTodas: RedeSocial[] = [];

  const detalhes: PoliticoDetalhe[] = inp.politicos.map((p) => {
    const cands = juntarCandidaturas(vincularTSE(p, porNasc, porUf), inp.historico?.get(p.id) ?? []);
    const eleicoes: EleicaoTSE[] = cands.map((c) => eleicaoDe(c, inp.contas));
    const carreira = mesclarCarreira(p.carreira ?? [], mandatosTSE(cands));
    const comPatrimonio = eleicoes.filter((e) => e.patrimonio != null);
    const ultimoPat = comPatrimonio[comPatrimonio.length - 1];
    const penultPat = comPatrimonio[comPatrimonio.length - 2];

    // social links: official house profile + what the candidate declared to TSE (latest election first)
    const redes: RedeSocial[] = [];
    const addRede = (raw: string, fonte: string, fonteUrl: string) => {
      const url = normalizaUrl(raw);
      if (!url || redes.some((r) => r.url.toLowerCase() === url.toLowerCase())) return;
      redes.push({ pid: p.id, plataforma: plataforma(url), url, handle: handleDe(url), fonte, fonteUrl });
    };
    for (const r of p.perfil?.redes ?? []) addRede(r, p.casa === "camara" ? "Câmara dos Deputados" : "Casa legislativa", p.fontes?.[0]?.url ?? "");
    for (const c of [...cands].sort((a, b) => b.ano - a.ano))
      for (const r of inp.tseRedes.get(`${c.ano}:${c.sq}`) ?? []) addRede(r, `TSE - Candidatura ${c.ano}`, `https://dadosabertos.tse.jus.br/dataset/candidatos-${c.ano}`);
    redesTodas.push(...redes);

    const vm = v.metricas.get(p.id) ?? {};
    const pr = presenca.get(p.id);
    const g = gastosPorCasa.get(p.casa)?.get(p.id);
    const emendas = vincularEmendas(p, inp.emendas);
    const falas = falasPorPid.get(p.id) ?? [];

    const m: Metricas = {
      presenca: pr ? round(pr.presente / pr.sessoes) : undefined,
      presencaBase: pr?.sessoes,
      ...vm,
      gasto12m: g?.total12m,
      gastoAno: g?.gastoAno,
      alertas: g?.alertas.length,
      proposicoes: p.proposicoesTotal,
      proposicoesLei: p.proposicoesLei,
      emendas: emendas?.total,
      patrimonio: ultimoPat?.patrimonio,
      patrimonioVariacao: ultimoPat && penultPat && penultPat.patrimonio ? round(ultimoPat.patrimonio! / penultPat.patrimonio - 1) : undefined,
      votosRecebidos: eleicoes.find((e) => e.ano === 2022)?.votos,
    };
    for (const k of Object.keys(m) as (keyof Metricas)[]) if (m[k] === undefined) delete m[k];

    const inicioPolitica = carreira.length ? Math.min(...carreira.map((c) => c.inicio)) : undefined;
    const fontes = [...(p.fontes ?? [])];
    if (cands.length) fontes.push({ nome: "TSE - Dados Abertos (candidaturas, bens, redes)", url: "https://dadosabertos.tse.jus.br" });
    if (emendas) fontes.push({ nome: emendas.fonte, url: "https://api.transferegov.gestao.gov.br/transferenciasespeciais/" });

    const d: PoliticoDetalhe = {
      id: p.id,
      casa: p.casa,
      cargo: p.cargo,
      nome: p.nome,
      nomeCivil: p.nomeCivil,
      partido: p.partido,
      uf: p.uf,
      foto: p.foto || undefined,
      sexo: p.sexo,
      emExercicio: p.emExercicio,
      inicioPolitica,
      mandatos: carreira.length || undefined,
      eleicao2026: resultado2026(cands, p.cargo),
      m,
      atualizadoEm: hoje.toISOString(),
      perfil: { ...(p.perfil ?? {}), redes: undefined },
      carreira,
      presenca: pr ? { sessoes: pr.sessoes, presente: pr.presente, justificadas: pr.justificadas || undefined, periodo: `${pr.ini} a ${pr.fim}` } : undefined,
      votos: (v.votos.get(p.id) ?? []).slice(0, 400),
      proposicoesLista: (p.proposicoesLista ?? []).slice(0, 100),
      proposicoesPorTipo: p.proposicoesPorTipo ?? {},
      proposicoesPorPapel: p.proposicoesPorPapel,
      gastos: g ? { ...g, mediaPares12m: undefined } : undefined,
      comissoes: p.comissoes ?? [],
      frentes: p.frentes ?? [],
      emendas,
      eleicoes,
      redes,
      nFalas: falas.length || undefined,
      fontes,
    };
    return d;
  });

  // peer comparison for spending: same house and same state (quota caps differ by state)
  for (const [, grupo] of groupBy(detalhes, (d) => `${d.casa}|${d.uf}`)) {
    const med = median(grupo.map((d) => d.gastos?.total12m ?? NaN));
    for (const d of grupo) if (d.gastos && med != null) d.gastos.mediaPares12m = round(med, 2);
  }

  const resumos = detalhes.map(resumoDe);
  return { detalhes, resumos, votacoes: inp.votacoes, redes: redesTodas, gastosGerais: gastosGerais(inp.despesas, detalhes, hoje) };
}

/** National overview over the same 12-month window used for individual spending. */
export function gastosGerais(desp: Despesa[], detalhes: PoliticoDetalhe[], hoje: Date): GastosGerais | undefined {
  if (!desp.length) return undefined;
  const casaDe = new Map(detalhes.map((d) => [d.id, d.casa]));
  const fim = ultimoMesCompleto(desp, hoje)!;
  const meses = janela12(fim);
  const dentro = new Set(meses);
  const j = desp.filter((d) => dentro.has(`${d.ano}-${String(d.mes).padStart(2, "0")}`) && casaDe.has(d.pid));

  const porCasa = [...groupBy(j, (d) => casaDe.get(d.pid)!).entries()].map(([casa, ds]) => {
    const pm = new Map(meses.map((m) => [m, 0]));
    for (const d of ds) {
      const k = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
      pm.set(k, pm.get(k)! + d.valor);
    }
    return {
      casa: casa as PoliticoDetalhe["casa"],
      total: round(
        ds.reduce((s, d) => s + d.valor, 0),
        2,
      )!,
      parlamentares: new Set(ds.map((d) => d.pid)).size,
      porMes: [...pm.entries()].map(([mes, valor]) => ({ mes, valor: round(valor, 2)! })),
    };
  });

  const cat = new Map<string, { casa: PoliticoDetalhe["casa"]; categoria: string; valor: number }>();
  for (const d of j) {
    const casa = casaDe.get(d.pid)!;
    const k = `${casa}|${d.categoria}`;
    const c = cat.get(k) ?? { casa, categoria: d.categoria, valor: 0 };
    c.valor += d.valor;
    cat.set(k, c);
  }

  const forn = new Map<string, { nome: string; doc?: string; valor: number; pids: Set<string>; n: number }>();
  for (const d of j) {
    const k = d.doc || norm(d.fornecedor);
    if (!k) continue;
    const f = forn.get(k) ?? { nome: d.fornecedor, doc: documentoPublicavel(d.doc), valor: 0, pids: new Set<string>(), n: 0 };
    f.valor += d.valor;
    f.pids.add(d.pid);
    f.n++;
    forn.set(k, f);
  }

  const alertasPorRegra: Record<string, number> = {};
  for (const d of detalhes) for (const a of d.gastos?.alertas ?? []) alertasPorRegra[a.regra] = (alertasPorRegra[a.regra] ?? 0) + 1;

  return {
    periodo: { inicio: meses[0], fim },
    porCasa,
    categorias: [...cat.values()].map((c) => ({ ...c, valor: round(c.valor, 2)! })).sort((a, b) => b.valor - a.valor),
    fornecedores: [...forn.values()]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 50)
      .map((f) => ({ nome: f.nome, doc: f.doc, valor: round(f.valor, 2)!, parlamentares: f.pids.size, n: f.n })),
    alertasPorRegra,
  };
}

export function resumoDe(d: PoliticoDetalhe): PoliticoResumo {
  return {
    id: d.id,
    casa: d.casa,
    cargo: d.cargo,
    nome: d.nome,
    nomeCivil: d.nomeCivil,
    partido: d.partido,
    uf: d.uf,
    foto: d.foto,
    sexo: d.sexo,
    emExercicio: d.emExercicio,
    inicioPolitica: d.inicioPolitica,
    mandatos: d.mandatos,
    eleicao2026: d.eleicao2026,
    nFalas: d.nFalas,
    m: d.m,
  };
}

const METRIC_KEYS: (keyof Metricas)[] = [
  "presenca",
  "participacao",
  "fidelidade",
  "governismo",
  "gasto12m",
  "gastoAno",
  "alertas",
  "proposicoes",
  "proposicoesLei",
  "emendas",
  "patrimonio",
  "patrimonioVariacao",
  "votosRecebidos",
];

export function agregar(resumos: PoliticoResumo[], chave: (r: PoliticoResumo) => string): Agregado[] {
  return [...groupBy(resumos, chave).entries()]
    .map(([k, rs]) => {
      const medianas: Metricas = {};
      const medias: Metricas = {};
      for (const key of METRIC_KEYS) {
        const xs = rs.map((r) => r.m[key]).filter((x): x is number => typeof x === "number");
        if (!xs.length) continue;
        (medianas as Record<string, number>)[key] = round(median(xs)!, 4)!;
        (medias as Record<string, number>)[key] = round(mean(xs)!, 4)!;
      }
      return { chave: k, n: rs.length, medianas, medias };
    })
    .sort((a, b) => b.n - a.n);
}

export function resumoVotacao(v: VotacaoDetalhe): VotacaoResumo {
  return {
    id: v.id,
    casa: v.casa,
    data: v.data,
    titulo: v.titulo,
    descricao: v.descricao,
    resultado: v.resultado,
    sim: v.sim,
    nao: v.nao,
    outros: v.outros,
    orientacaoGoverno: v.orientacaoGoverno,
    secreta: v.secreta,
    porPartido: v.porPartido,
    materia: v.materia,
    assuntos: v.assuntos,
    objeto: v.objeto,
  };
}

// ------------------------------------------------------------ writing

export async function escrever(dir: string, files: Record<string, unknown>) {
  for (const [rel, data] of Object.entries(files)) {
    const p = path.join(dir, rel);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(data));
  }
}

export async function limparDir(dir: string) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

export const TEXTO_SNAPSHOT = 1500;

export interface PublicarOpts {
  demo: boolean;
  /** Official details of the bills voted */
  materias?: MateriaVotada[];
  arquivos?: Meta["arquivos"];
  qualidade?: Meta["qualidade"];
  /** Presidency page; written only when the stage produced it */
  presidencia?: Presidencia;
  fontes: FonteStatus[];
  totais: Record<string, number>;
  hoje: Date;
}

/** Write the public snapshot: one file per politician/vote plus compact indexes for list pages. */
export async function publicar(out: string, r: BuildResult, falas: Fala[], o: PublicarOpts) {
  for (const sub of ["politicos", "votacoes", "falas"]) await limparDir(path.join(out, sub));

  const todas = [...falas].sort((a, b) => b.data.localeCompare(a.data));
  const porPid = groupBy(todas, (f) => f.pid);
  for (const d of r.detalhes) d.nFalas = porPid.get(d.id)?.length || undefined;

  const files: Record<string, unknown> = {};
  for (const d of r.detalhes) files[`politicos/${d.id}.json`] = d;
  for (const v of r.votacoes) files[`votacoes/${v.id}.json`] = v;
  // Snapshot keeps the official summary and the opening of each transcript; the full text lives in
  // the database and at the official URL linked from every statement.
  for (const [pid, fs] of porPid) files[`falas/${pid}.json`] = { pid, falas: fs.slice(0, 500).map((f) => ({ ...f, texto: f.texto.slice(0, TEXTO_SNAPSHOT) })) };

  const resumos = r.detalhes.map(resumoDe);
  files["politicos.json"] = resumos;
  files["votacoes.json"] = r.votacoes.map(resumoVotacao).sort((a, b) => b.data.localeCompare(a.data));
  files["falas-recentes.json"] = todas.slice(0, 300).map((f) => ({ ...f, texto: f.texto.slice(0, 600) }));
  if (r.gastosGerais) files["gastos.json"] = r.gastosGerais;
  if (o.presidencia?.pessoas.length || o.presidencia?.atos.length) files["presidencia.json"] = o.presidencia;
  files["agregados.json"] = {
    porCasa: agregar(resumos, (x) => x.casa),
    porPartido: agregar(resumos, (x) => `${x.casa}|${x.partido}`),
    porUf: agregar(resumos, (x) => `${x.casa}|${x.uf}`),
  };
  const meta: Meta = {
    versao: DATA_VERSION,
    geradoEm: o.hoje.toISOString(),
    demo: o.demo,
    fontes: o.fontes,
    totais: {
      ...o.totais,
      votacoes: r.votacoes.length,
      votosIndividuais: r.votacoes.reduce((s, v) => s + v.votos.length, 0),
      falas: todas.length,
      redesSociais: r.redes.length,
    },
    subsidios: [
      { cargo: "Deputado(a) Federal", valor: 46366.19, fonte: "https://www2.camara.leg.br/transparencia/recursos-humanos/remuneracao" },
      { cargo: "Senador(a)", valor: 46366.19, fonte: "https://www12.senado.leg.br/transparencia" },
      { cargo: "Deputado(a) Estadual", valor: 34774.64, fonte: "Constituição Federal, art. 27, § 2º (até 75% do subsídio federal)" },
    ],
    arquivos: o.arquivos,
    qualidade: o.qualidade,
  };
  files["meta.json"] = meta;
  // Only bills referenced by a published vote
  const usadas = new Set(r.votacoes.map((v) => v.materia));
  files["materias.json"] = (o.materias ?? []).filter((m) => usadas.has(m.id));
  await escrever(out, files);
}
