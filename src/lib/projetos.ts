/**
 * People think in bills ("a PEC das igrejas"), not in roll calls. One bill often goes through
 * several roll calls on the same day: requests, the main text, separate excerpts. This groups the
 * roll calls of each bill and picks the one that best answers "what happened to it?".
 */
import { partesDescricao } from "./format";
import { explicarEtapa } from "./linguagem";
import type { ExplicacaoIA, MateriaVotada, VotacaoResumo } from "./types";

export interface ProjetoVotado {
  chave: string;
  casa: VotacaoResumo["casa"];
  sigla: string;
  ementa: string;
  materia?: MateriaVotada;
  explicacao?: ExplicacaoIA;
  assuntos: string[];
  /** Newest first */
  votacoes: VotacaoResumo[];
  /** The roll call that decided the content most recently (or the newest one) */
  principal: VotacaoResumo;
  ultimaData: string;
}

/** Content votes outrank procedural ones; among them, the newest wins. */
export function votacaoPrincipal(vs: VotacaoResumo[]): VotacaoResumo {
  const peso = (v: VotacaoResumo) => {
    const e = explicarEtapa(partesDescricao(v.descricao).procedimento, v.objeto);
    if (!e) return 1;
    if (e.tipo === "procedimento") return 0;
    // The whole text outranks single amendments or excerpts
    return /trecho|mudança/i.test(e.titulo) ? 2 : 3;
  };
  return [...vs].sort((a, b) => peso(b) - peso(a) || b.data.localeCompare(a.data))[0];
}

export function agruparPorProjeto(votacoes: VotacaoResumo[], materias: Map<string, MateriaVotada>, explicacoes: Map<string, ExplicacaoIA>): ProjetoVotado[] {
  const grupos = new Map<string, VotacaoResumo[]>();
  for (const v of votacoes) {
    const chave = v.materia ?? `${v.casa}-${v.titulo}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), v]);
  }
  return [...grupos.entries()]
    .map(([chave, vs]) => {
      const ordenadas = [...vs].sort((a, b) => b.data.localeCompare(a.data));
      const materia = materias.get(chave);
      return {
        chave,
        casa: ordenadas[0].casa,
        sigla: materia?.sigla || ordenadas[0].titulo,
        ementa: materia?.ementa || partesDescricao(ordenadas[0].descricao).ementa,
        materia,
        explicacao: explicacoes.get(chave),
        assuntos: ordenadas.find((v) => v.assuntos?.length)?.assuntos ?? [],
        votacoes: ordenadas,
        principal: votacaoPrincipal(ordenadas),
        ultimaData: ordenadas[0].data,
      };
    })
    .sort((a, b) => b.ultimaData.localeCompare(a.ultimaData));
}
