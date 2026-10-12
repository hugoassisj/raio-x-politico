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
