import type { EleicaoPresidencial, Presidencia } from "./types";

type Candidato = EleicaoPresidencial["candidatos"][number];

export interface SituacaoPresidencia {
  /** Elected in the most recent election whose term has already started */
  emExercicio?: { ano: number; candidato: Candidato; inicio: number; fim: number };
  /** The most recent election, when its term has not started yet */
  proxima?: { ano: number; eleito?: Candidato; segundoTurno: Candidato[]; candidatos: number };
}

/**
 * Who holds the office according to the TSE results alone: the winner of the last election whose
 * four-year term already began. Impeachments, resignations and deaths are not in these files, so
 * the page always says so next to this answer.
 */
export function situacaoDaPresidencia(eleicoes: EleicaoPresidencial[], hoje: Date): SituacaoPresidencia {
  const ano = hoje.getUTCFullYear();
  const ordem = [...eleicoes].sort((a, b) => b.ano - a.ano);
  const out: SituacaoPresidencia = {};
  const ultima = ordem[0];
  if (ultima && ultima.ano + 1 > ano) {
    out.proxima = {
      ano: ultima.ano,
      eleito: ultima.candidatos.find((c) => c.resultado === "eleito"),
      segundoTurno: ultima.candidatos.filter((c) => c.resultado === "segundo-turno"),
      candidatos: ultima.candidatos.length,
    };
  }
  for (const e of ordem) {
    if (e.ano + 1 > ano) continue;
    const eleito = e.candidatos.find((c) => c.resultado === "eleito");
    if (eleito) {
      out.emExercicio = { ano: e.ano, candidato: eleito, inicio: e.ano + 1, fim: e.ano + 4 };
      break;
    }
  }
  return out;
}

/** People who ran, newest candidacy first, for the "who ran" list. */
export function pessoasPorUltimaDisputa(p: Presidencia): { id: string; nomeUrna: string; perfil?: string; anos: number[] }[] {
  const anos = new Map<string, number[]>();
  for (const e of p.eleicoes) for (const c of e.candidatos) anos.set(c.pessoa, [...(anos.get(c.pessoa) ?? []), e.ano]);
  return p.pessoas
    .map((x) => ({ id: x.id, nomeUrna: x.nomeUrna, perfil: x.perfil, anos: (anos.get(x.id) ?? []).sort((a, b) => b - a) }))
    .sort((a, b) => (b.anos[0] ?? 0) - (a.anos[0] ?? 0) || a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"));
}
