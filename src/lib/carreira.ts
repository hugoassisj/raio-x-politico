/**
 * Reading a person's public life from their candidacies: results in plain words, party changes
 * and a short summary. Shared by the pipeline (which stores the result) and the interface.
 */
import type { EleicaoTSE } from "./types";

/** Plain reading of the TSE result text. */
export function resultadoDe(situacao: string | undefined): NonNullable<EleicaoTSE["resultado"]> {
  const s = (situacao ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/^eleito|eleito por/.test(s)) return "eleito";
  if (/2.? ?turno/.test(s)) return "segundo-turno";
  if (/suplente/.test(s)) return "suplente";
  if (/nao eleito/.test(s)) return "nao-eleito";
  if (/indefer|cancel|cassad|renun|falecid|inapto|nao conhecimento/.test(s)) return "registro-negado";
  return "sem-resultado";
}

export const ROTULO_RESULTADO: Record<NonNullable<EleicaoTSE["resultado"]>, string> = {
  eleito: "Eleito",
  "segundo-turno": "Foi ao 2º turno",
  suplente: "Ficou como suplente",
  "nao-eleito": "Não foi eleito",
  "registro-negado": "Candidatura não seguiu",
  "sem-resultado": "Sem resultado ainda",
};

/** Gendered "Eleito/Eleita" when the sex is known. */
export function rotuloResultado(r: EleicaoTSE["resultado"], sexo?: string) {
  const base = ROTULO_RESULTADO[r ?? "sem-resultado"];
  return sexo === "F" ? base.replace(/^Eleito/, "Eleita").replace("Não foi eleito", "Não foi eleita") : base;
}

/** Each moment the party in a candidacy differs from the previous candidacy. */
export function trocasDePartido(eleicoes: EleicaoTSE[]): { ano: number; de: string; para: string }[] {
  const ordem = [...eleicoes].filter((e) => e.partido).sort((a, b) => a.ano - b.ano);
  const trocas: { ano: number; de: string; para: string }[] = [];
  for (let i = 1; i < ordem.length; i++) if (ordem[i].partido !== ordem[i - 1].partido) trocas.push({ ano: ordem[i].ano, de: ordem[i - 1].partido!, para: ordem[i].partido! });
  return trocas;
}

/** "3 partidos: PMDB, PP e PL", in the order they were used. */
export function partidosDaCarreira(eleicoes: EleicaoTSE[]): string[] {
  const vistos: string[] = [];
  for (const e of [...eleicoes].sort((a, b) => a.ano - b.ano)) if (e.partido && !vistos.includes(e.partido)) vistos.push(e.partido);
  return vistos;
}

export function resumoEleicoes(eleicoes: EleicaoTSE[]) {
  const disputadas = eleicoes.filter((e) => e.resultado !== "registro-negado" && e.resultado !== "sem-resultado");
  return {
    disputadas: disputadas.length,
    vitorias: eleicoes.filter((e) => e.resultado === "eleito").length,
    primeiroAno: eleicoes.length ? Math.min(...eleicoes.map((e) => e.ano)) : undefined,
    partidos: partidosDaCarreira(eleicoes),
  };
}

/** Lists in Portuguese: "A, B e C". */
export function listaNatural(itens: string[]) {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** One stretch of time in which the records show the same party. */
export interface PeriodoPartido {
  partido: string;
  /** First and last time a record shows this party (year, or date for votes) */
  de: string;
  ate: string;
  /** Where it was seen: "Candidatura 2018 (TSE)", "Votos na Câmara" */
  fontes: string[];
}

/**
 * Party over time from what the records show, never guessed in between: candidacies (TSE, one
 * point per election), the party recorded in each roll call, and the current party. Consecutive
 * points with the same party form one stretch; a change starts a new one. Gaps stay gaps.
 */
export function filiacoesNoTempo(p: {
  eleicoes: EleicaoTSE[];
  votos?: { data: string; partido?: string }[];
  partido?: string;
  atualizadoEm?: string;
  casa?: string;
}): PeriodoPartido[] {
  const casa = p.casa === "senado" ? "Senado" : p.casa === "camara" ? "Câmara" : "Casa";
  const pontos: { quando: string; partido: string; fonte: string }[] = [];
  for (const e of p.eleicoes) if (e.partido) pontos.push({ quando: String(e.ano), partido: e.partido, fonte: `Candidatura ${e.ano} (TSE)` });
  for (const v of p.votos ?? []) if (v.partido) pontos.push({ quando: v.data, partido: v.partido, fonte: `Votos no plenário (${casa})` });
  if (p.partido && p.atualizadoEm) pontos.push({ quando: p.atualizadoEm.slice(0, 10), partido: p.partido, fonte: `Cadastro atual (${casa})` });
  // Election years sort before any date of the same year (candidacies are registered mid-year)
  pontos.sort((a, b) => a.quando.localeCompare(b.quando) || a.fonte.localeCompare(b.fonte));
  const out: PeriodoPartido[] = [];
  for (const x of pontos) {
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.partido === x.partido) {
      ultimo.ate = x.quando;
      if (!ultimo.fontes.includes(x.fonte)) ultimo.fontes.push(x.fonte);
    } else out.push({ partido: x.partido, de: x.quando, ate: x.quando, fontes: [x.fonte] });
  }
  return out;
}
