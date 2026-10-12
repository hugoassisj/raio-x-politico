/**
 * The list of who voted how in one roll call, and the filters people apply to it. Pure functions,
 * shared by the vote page, the plenary chart and the tests, so a filter means the same thing
 * everywhere and the official totals are never changed by what is shown.
 */
import { CATEGORIAS_VOTO, rotuloVoto, type CategoriaVoto } from "./linguagem";
import { orientacaoDoPartido } from "./orientacao";
import type { PoliticoResumo, VotacaoDetalhe } from "./types";

export type { CategoriaVoto };

/** Color token of each group, used by chips, bars and seats. */
export const COR_CATEGORIA: Record<CategoriaVoto, string> = {
  sim: "var(--sim)",
  nao: "var(--nao)",
  abstencao: "var(--abst)",
  obstrucao: "var(--obst)",
  outro: "var(--outro)",
  ausencia: "var(--ausente)",
  "sem-registro": "var(--sem-registro)",
};

export const ORDEM_CATEGORIAS: CategoriaVoto[] = CATEGORIAS_VOTO.map((c) => c.id);

export interface LinhaVoto {
  pid: string;
  nome: string;
  /** Party recorded by the house for this vote; for people without a record, their current party */
  partido: string;
  /** True when the party shown is today's, because the house has no record for this vote */
  partidoAtual: boolean;
  uf: string;
  foto?: string;
  /** Whether the person has a profile page on the site */
  perfil: boolean;
  /** Exactly what the source published, kept for audit */
  original: string;
  categoria: CategoriaVoto;
  rotulo: string;
  explicacao: string;
  /** What the person's party (or its federation or bloc) asked, when the house published it */
  orientacao?: string;
  /** Voted Sim or Não while the party asked the opposite; never true without a recorded Sim or Não */
  diferente?: boolean;
}

/**
 * Every recorded vote plus the members the house counts as in office that day who are missing from
 * the official list ("sem voto registrado"). When that population is unknown, nobody is added.
 */
export function linhasDaVotacao(v: VotacaoDetalhe, membros: PoliticoResumo[]): LinhaVoto[] {
  const porId = new Map(membros.map((m) => [m.id, m]));
  const linhas: LinhaVoto[] = v.votos.map((x) => {
    const r = rotuloVoto(x.voto);
    const p = porId.get(x.pid);
    const orientacao = orientacaoDoPartido(v.orientacoes, x.partido)?.trim() || undefined;
    return {
      pid: x.pid,
      nome: p?.nome ?? x.nome,
      partido: x.partido,
      partidoAtual: false,
      uf: x.uf,
      foto: p?.foto,
      perfil: !!p,
      original: x.voto,
      categoria: r.categoria,
      rotulo: r.rotulo,
      explicacao: r.explicacao,
      orientacao,
      diferente: votouDiferente(x.voto, orientacao),
    };
  });
  const sem = rotuloVoto("");
  const votaram = new Set(v.votos.map((x) => x.pid));
  for (const m of v.semRegistro ?? []) {
    if (votaram.has(m.pid)) continue;
    const p = porId.get(m.pid);
    linhas.push({
      pid: m.pid,
      nome: p?.nome ?? m.nome,
      partido: m.partido,
      partidoAtual: true,
      uf: m.uf,
      foto: p?.foto,
      perfil: !!p,
      original: "",
      categoria: sem.categoria,
      rotulo: sem.rotulo,
      explicacao: sem.explicacao,
      diferente: false,
    });
  }
  return linhas;
}

/** How the recorded Sim and Não votes compare with what each party asked. */
export function compararComPartido(linhas: LinhaVoto[]): { diferente: number; igual: number; semOrientacao: number } {
  const r = { diferente: 0, igual: 0, semOrientacao: 0 };
  for (const l of linhas) {
    if (l.categoria !== "sim" && l.categoria !== "nao") continue;
    if (!l.orientacao || !POSICIONAL.test(canonVoto(l.orientacao))) r.semOrientacao++;
    else if (l.diferente) r.diferente++;
    else r.igual++;
  }
  return r;
}

/**
 * Official open-data record that lists every vote of this roll call. The Câmara publishes one list
 * per roll call; the Senado publishes the roll calls of a day in one list, so the link is to that day.
 */
export function urlListaOficial(v: Pick<VotacaoDetalhe, "id" | "casa" | "data">): string | undefined {
  if (v.casa === "camara" && v.id.startsWith("cam-")) return `https://dadosabertos.camara.leg.br/api/v2/votacoes/${v.id.slice(4)}/votos`;
  if (v.casa === "senado" && /^\d{4}-\d{2}-\d{2}$/.test(v.data)) return `https://legis.senado.leg.br/dadosabertos/votacao?dataInicio=${v.data}&dataFim=${v.data}`;
  return undefined;
}

export type Contagem = Record<CategoriaVoto, number>;

export function contar(linhas: LinhaVoto[]): Contagem {
  const c = Object.fromEntries(ORDEM_CATEGORIAS.map((k) => [k, 0])) as Contagem;
  for (const l of linhas) c[l.categoria]++;
  return c;
}

export type Ordem = "nome" | "partido" | "uf" | "voto";
export type Visao = "lista" | "detalhe" | "partido" | "estado";

export interface FiltroVotos {
  /** Groups shown; empty means all */
  votos: CategoriaVoto[];
  partidos: string[];
  uf: string;
  q: string;
  /** Only people who voted Sim or Não against what their party asked */
  diferente: boolean;
  ordem: Ordem;
  visao: Visao;
  pagina: number;
}

export const FILTRO_INICIAL: FiltroVotos = { votos: [], partidos: [], uf: "", q: "", diferente: false, ordem: "nome", visao: "lista", pagina: 1 };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Whether a group is visible under the filter. */
export const mostra = (f: FiltroVotos, c: CategoriaVoto) => !f.votos.length || f.votos.includes(c);

/** Applies every filter except the vote group: used to count each group within the other filters. */
export function filtrarSemVoto(linhas: LinhaVoto[], f: FiltroVotos): LinhaVoto[] {
  const t = norm(f.q.trim());
  const partidos = new Set(f.partidos);
  return linhas.filter(
    (l) => (!partidos.size || partidos.has(l.partido)) && (!f.uf || l.uf === f.uf) && (!f.diferente || l.diferente) && (!t || norm(`${l.nome} ${l.partido} ${l.uf}`).includes(t)),
  );
}

export function filtrar(linhas: LinhaVoto[], f: FiltroVotos): LinhaVoto[] {
  return filtrarSemVoto(linhas, f).filter((l) => mostra(f, l.categoria));
}

/** Sorts by the chosen column, then by name and id, so pages never shuffle. */
export function ordenar(linhas: LinhaVoto[], ordem: Ordem): LinhaVoto[] {
  const pos = new Map(ORDEM_CATEGORIAS.map((c, i) => [c, i]));
  const base = (a: LinhaVoto, b: LinhaVoto) => a.nome.localeCompare(b.nome, "pt-BR") || a.pid.localeCompare(b.pid);
  const chave: Record<Ordem, (a: LinhaVoto, b: LinhaVoto) => number> = {
    nome: () => 0,
    partido: (a, b) => a.partido.localeCompare(b.partido, "pt-BR"),
    uf: (a, b) => a.uf.localeCompare(b.uf),
    voto: (a, b) => pos.get(a.categoria)! - pos.get(b.categoria)!,
  };
  return [...linhas].sort((a, b) => chave[ordem](a, b) || base(a, b));
}

/**
 * "Only this group": tapping a total shows just that group; tapping it again shows everyone.
 */
export function soEsta(f: FiltroVotos, c: CategoriaVoto): FiltroVotos {
  const ja = f.votos.length === 1 && f.votos[0] === c;
  return { ...f, votos: ja ? [] : [c], pagina: 1 };
}

/**
 * Shows or hides one group, keeping the others as they are. Hiding the only group on screen means
 * "everyone except this group", never an empty list.
 */
export function alternar(f: FiltroVotos, c: CategoriaVoto, presentes: CategoriaVoto[]): FiltroVotos {
  const atuais = f.votos.length ? f.votos : presentes;
  let novos = atuais.includes(c) ? atuais.filter((x) => x !== c) : [...atuais, c];
  if (novos.length === 0) novos = presentes.filter((x) => x !== c);
  const todos = presentes.every((p) => novos.includes(p));
  return { ...f, votos: todos ? [] : ORDEM_CATEGORIAS.filter((x) => novos.includes(x)), pagina: 1 };
}

export function alternarPartido(f: FiltroVotos, partido: string): FiltroVotos {
  const partidos = f.partidos.includes(partido) ? f.partidos.filter((p) => p !== partido) : [...f.partidos, partido].sort();
  return { ...f, partidos, pagina: 1 };
}

/** True when anything narrows the list (view and order do not). */
export const temFiltro = (f: FiltroVotos) => f.votos.length > 0 || f.partidos.length > 0 || !!f.uf || !!f.q.trim() || f.diferente;

export function limpar(f: FiltroVotos): FiltroVotos {
  return { ...FILTRO_INICIAL, ordem: f.ordem, visao: f.visao };
}

const ORDENS: Ordem[] = ["nome", "partido", "uf", "voto"];
const VISOES: Visao[] = ["lista", "detalhe", "partido", "estado"];

/** Reads the filter from the page address; unknown values are ignored. */
export function lerFiltro(p: URLSearchParams): FiltroVotos {
  const lista = (k: string) =>
    (p.get(k) ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const ordem = p.get("ordem") as Ordem;
  const visao = p.get("visao") as Visao;
  const pagina = Number.parseInt(p.get("pagina") ?? "", 10);
  return {
    votos: ORDEM_CATEGORIAS.filter((c) => lista("voto").includes(c)),
    partidos: [...new Set(lista("partido"))].sort(),
    uf: (p.get("uf") ?? "").toUpperCase().slice(0, 2),
    q: (p.get("q") ?? "").slice(0, 80),
    diferente: p.get("diferente") === "1",
    ordem: ORDENS.includes(ordem) ? ordem : "nome",
    visao: VISOES.includes(visao) ? visao : "lista",
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Writes only what differs from the default, so shared links stay short. Other parameters are kept. */
export function escreverFiltro(f: FiltroVotos, base = new URLSearchParams()): URLSearchParams {
  const p = new URLSearchParams(base);
  const pares: [string, string][] = [
    ["voto", f.votos.join(",")],
    ["partido", f.partidos.join(",")],
    ["uf", f.uf],
    ["q", f.q.trim()],
    ["diferente", f.diferente ? "1" : ""],
    ["ordem", f.ordem === "nome" ? "" : f.ordem],
    ["visao", f.visao === "lista" ? "" : f.visao],
    ["pagina", f.pagina > 1 ? String(f.pagina) : ""],
  ];
  for (const [k, v] of pares) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  return p;
}

export interface Grupo {
  /** Party acronym or state code */
  chave: string;
  linhas: LinhaVoto[];
  contagem: Contagem;
  /** Members with a recorded vote (any group except "sem-registro") */
  comRegistro: number;
}

/** Groups by party or by state in alphabetical order, keeping every individual vote. */
export function agrupar(linhas: LinhaVoto[], por: "partido" | "uf"): Grupo[] {
  const m = new Map<string, LinhaVoto[]>();
  for (const l of linhas) m.set(l[por], [...(m.get(l[por]) ?? []), l]);
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([chave, ls]) => {
      const contagem = contar(ls);
      return { chave, linhas: ls, contagem, comRegistro: ls.length - contagem["sem-registro"] };
    });
}

export type GrupoPartido = Grupo & { partido: string };

export function porPartido(linhas: LinhaVoto[]): GrupoPartido[] {
  return agrupar(linhas, "partido").map((g) => ({ ...g, partido: g.chave }));
}

// ------------------------------------------------------------ one person's votes (profile)

/** A vote of one person, with what the list needs to filter it. */
export interface VotoDoPerfil {
  votacaoId: string;
  data: string;
  voto: string;
  orientacaoPartido?: string;
  orientacaoGoverno?: string;
  assuntos?: string[];
  /** Text searched by the box: title, summary, step */
  texto: string;
}

/** Groups of the profile list: a vote category, or a difference from the party or government request. */
export type FiltroPerfil = CategoriaVoto | "contra-partido" | "contra-governo";

const POSICIONAL = /^(sim|nao)$/;
const canonVoto = (s?: string) => norm(s ?? "").trim();

/**
 * True when the person voted Sim or Não and the request was the opposite. Abstaining, obstructing
 * or having no record is never counted as voting against.
 */
export function votouDiferente(voto: string, pedido?: string): boolean {
  const v = canonVoto(voto);
  const o = canonVoto(pedido);
  return POSICIONAL.test(v) && POSICIONAL.test(o) && v !== o;
}

export interface FiltroVotosPerfil {
  grupo: FiltroPerfil | "";
  assunto: string;
  ano: string;
  q: string;
  pagina: number;
}

export const FILTRO_PERFIL_INICIAL: FiltroVotosPerfil = { grupo: "", assunto: "", ano: "", q: "", pagina: 1 };

export function noGrupo(v: VotoDoPerfil, g: FiltroPerfil | ""): boolean {
  if (!g) return true;
  if (g === "contra-partido") return votouDiferente(v.voto, v.orientacaoPartido);
  if (g === "contra-governo") return votouDiferente(v.voto, v.orientacaoGoverno);
  return rotuloVoto(v.voto).categoria === g;
}

/** Filters one person's votes; newest first, then by id so pages never shuffle. */
export function filtrarVotosDoPerfil<T extends VotoDoPerfil>(votos: T[], f: FiltroVotosPerfil): T[] {
  const t = norm(f.q.trim());
  return votos
    .filter((v) => noGrupo(v, f.grupo) && (!f.assunto || v.assuntos?.includes(f.assunto)) && (!f.ano || v.data.startsWith(f.ano)) && (!t || norm(v.texto).includes(t)))
    .sort((a, b) => b.data.localeCompare(a.data) || a.votacaoId.localeCompare(b.votacaoId));
}

/** How many votes fall in each group, within the other filters (subject, year, search). */
export function contarGruposDoPerfil(votos: VotoDoPerfil[], f: FiltroVotosPerfil): Record<FiltroPerfil | "", number> {
  const base = filtrarVotosDoPerfil(votos, { ...f, grupo: "" });
  const grupos: (FiltroPerfil | "")[] = ["", ...ORDEM_CATEGORIAS, "contra-partido", "contra-governo"];
  return Object.fromEntries(grupos.map((g) => [g, base.filter((v) => noGrupo(v, g)).length])) as Record<FiltroPerfil | "", number>;
}

const GRUPOS_PERFIL: FiltroPerfil[] = [...ORDEM_CATEGORIAS, "contra-partido", "contra-governo"];

export function lerFiltroPerfil(p: URLSearchParams): FiltroVotosPerfil {
  const grupo = p.get("voto") as FiltroPerfil;
  const ano = p.get("ano") ?? "";
  const pagina = Number.parseInt(p.get("pagina") ?? "", 10);
  return {
    grupo: GRUPOS_PERFIL.includes(grupo) ? grupo : "",
    assunto: (p.get("assunto") ?? "").slice(0, 30),
    ano: /^\d{4}$/.test(ano) ? ano : "",
    q: (p.get("q") ?? "").slice(0, 80),
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

export function escreverFiltroPerfil(f: FiltroVotosPerfil, base = new URLSearchParams()): URLSearchParams {
  const p = new URLSearchParams(base);
  const pares: [string, string][] = [
    ["voto", f.grupo],
    ["assunto", f.assunto],
    ["ano", f.ano],
    ["q", f.q.trim()],
    ["pagina", f.pagina > 1 ? String(f.pagina) : ""],
  ];
  for (const [k, v] of pares) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  return p;
}
