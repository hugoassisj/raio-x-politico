/**
 * The list of who voted how in one roll call, and the filters people apply to it. Pure functions,
 * shared by the vote page, the plenary chart and the tests, so a filter means the same thing
 * everywhere and the official totals are never changed by what is shown.
 */
import { CATEGORIAS_VOTO, rotuloVoto, type CategoriaVoto } from "./linguagem";
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
    });
  }
  return linhas;
}

export type Contagem = Record<CategoriaVoto, number>;

export function contar(linhas: LinhaVoto[]): Contagem {
  const c = Object.fromEntries(ORDEM_CATEGORIAS.map((k) => [k, 0])) as Contagem;
  for (const l of linhas) c[l.categoria]++;
  return c;
}

export type Ordem = "nome" | "partido" | "uf" | "voto";
export type Visao = "lista" | "detalhe" | "partido";

export interface FiltroVotos {
  /** Groups shown; empty means all */
  votos: CategoriaVoto[];
  partidos: string[];
  uf: string;
  q: string;
  ordem: Ordem;
  visao: Visao;
  pagina: number;
}

export const FILTRO_INICIAL: FiltroVotos = { votos: [], partidos: [], uf: "", q: "", ordem: "nome", visao: "lista", pagina: 1 };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Whether a group is visible under the filter. */
export const mostra = (f: FiltroVotos, c: CategoriaVoto) => !f.votos.length || f.votos.includes(c);

/** Applies every filter except the vote group: used to count each group within the other filters. */
export function filtrarSemVoto(linhas: LinhaVoto[], f: FiltroVotos): LinhaVoto[] {
  const t = norm(f.q.trim());
  const partidos = new Set(f.partidos);
  return linhas.filter((l) => (!partidos.size || partidos.has(l.partido)) && (!f.uf || l.uf === f.uf) && (!t || norm(`${l.nome} ${l.partido} ${l.uf}`).includes(t)));
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

/** Shows or hides one group, keeping the others as they are. */
export function alternar(f: FiltroVotos, c: CategoriaVoto, presentes: CategoriaVoto[]): FiltroVotos {
  const atuais = f.votos.length ? f.votos : presentes;
  const novos = atuais.includes(c) ? atuais.filter((x) => x !== c) : [...atuais, c];
  const todos = presentes.every((p) => novos.includes(p));
  return { ...f, votos: todos ? [] : ORDEM_CATEGORIAS.filter((x) => novos.includes(x)), pagina: 1 };
}

export function alternarPartido(f: FiltroVotos, partido: string): FiltroVotos {
  const partidos = f.partidos.includes(partido) ? f.partidos.filter((p) => p !== partido) : [...f.partidos, partido].sort();
  return { ...f, partidos, pagina: 1 };
}

/** True when anything narrows the list (view and order do not). */
export const temFiltro = (f: FiltroVotos) => f.votos.length > 0 || f.partidos.length > 0 || !!f.uf || !!f.q.trim();

export function limpar(f: FiltroVotos): FiltroVotos {
  return { ...FILTRO_INICIAL, ordem: f.ordem, visao: f.visao };
}

const ORDENS: Ordem[] = ["nome", "partido", "uf", "voto"];
const VISOES: Visao[] = ["lista", "detalhe", "partido"];

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

export interface GrupoPartido {
  partido: string;
  linhas: LinhaVoto[];
  contagem: Contagem;
  /** Members with a recorded vote (any group except "sem-registro") */
  comRegistro: number;
}

/** Groups by party in alphabetical order, keeping every individual vote. */
export function porPartido(linhas: LinhaVoto[]): GrupoPartido[] {
  const m = new Map<string, LinhaVoto[]>();
  for (const l of linhas) m.set(l.partido, [...(m.get(l.partido) ?? []), l]);
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([partido, ls]) => {
      const contagem = contar(ls);
      return { partido, linhas: ls, contagem, comRegistro: ls.length - contagem["sem-registro"] };
    });
}
