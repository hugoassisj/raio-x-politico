import type { Casa } from "./types";

/**
 * Votes needed to approve each kind of proposal, from the Federal Constitution.
 * Used by vote pages and the "how a law is approved" guide, so both always state the same rule.
 */
export const MEMBROS: Record<"camara" | "senado", number> = { camara: 513, senado: 81 };

export type Exigencia = "simples" | "absoluta" | "tres_quintos" | "dois_tercos";

export interface Regra {
  tipo: string;
  /** Plain-language name of the kind of proposal */
  nome: string;
  /** What it is, in one sentence anyone understands */
  oQueE: string;
  exigencia: Exigencia;
  turnos: number;
  artigo: string;
  url: string;
}

const CF = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

export const REGRAS: Regra[] = [
  {
    tipo: "PEC",
    nome: "Mudança na Constituição",
    oQueE: "Muda a Constituição, a lei mais importante do país. Por isso é a mais difícil de aprovar.",
    exigencia: "tres_quintos",
    turnos: 2,
    artigo: "Constituição, art. 60, § 2º",
    url: CF,
  },
  {
    tipo: "PLP",
    nome: "Lei complementar",
    oQueE: "Detalha temas que a Constituição manda regulamentar, como impostos e regras de aposentadoria.",
    exigencia: "absoluta",
    turnos: 1,
    artigo: "Constituição, art. 69",
    url: CF,
  },
  {
    tipo: "PL",
    nome: "Lei comum",
    oQueE: "A maioria das leis do país: cria programas, regras e direitos do dia a dia.",
    exigencia: "simples",
    turnos: 1,
    artigo: "Constituição, art. 47",
    url: CF,
  },
  {
    tipo: "MPV",
    nome: "Medida provisória",
    oQueE: "Decisão do Presidente que já vale como lei, mas precisa ser confirmada pelo Congresso em até 120 dias.",
    exigencia: "simples",
    turnos: 1,
    artigo: "Constituição, arts. 47 e 62",
    url: CF,
  },
  {
    tipo: "PDL",
    nome: "Decreto legislativo",
    oQueE: "Decisão que só o Congresso pode tomar, como aprovar tratados ou suspender atos do governo.",
    exigencia: "simples",
    turnos: 1,
    artigo: "Constituição, art. 47",
    url: CF,
  },
  {
    tipo: "VET",
    nome: "Veto do Presidente",
    oQueE: "Quando o Presidente barra parte de uma lei, o Congresso pode derrubar o veto em sessão conjunta.",
    exigencia: "absoluta",
    turnos: 1,
    artigo: "Constituição, art. 66, § 4º",
    url: CF,
  },
  {
    tipo: "REQ",
    nome: "Pedido durante a votação",
    oQueE: "Pedidos sobre o andamento da votação, como adiar, retirar de pauta ou acelerar um projeto.",
    exigencia: "simples",
    turnos: 1,
    artigo: "Constituição, art. 47",
    url: CF,
  },
  {
    tipo: "AUT",
    nome: "Indicação para cargo",
    oQueE: "Algumas pessoas só assumem um cargo, como embaixadores e diretores do Banco Central e de agências, se o Senado aprovar.",
    exigencia: "simples",
    turnos: 1,
    artigo: "Constituição, art. 52, incisos III e IV",
    url: CF,
  },
  {
    tipo: "AUT_ABS",
    nome: "Indicação para cargo",
    oQueE: "Para tribunais superiores, Procuradoria-Geral da República e os conselhos nacionais de Justiça e do Ministério Público, o Senado precisa aprovar a pessoa indicada.",
    exigencia: "absoluta",
    turnos: 1,
    artigo: "Constituição, arts. 101, 103-B, 104, 128 e 130-A",
    url: CF,
  },
];

const DESCRICAO: Record<Exigencia, string> = {
  simples: "mais votos Sim do que Não, com pelo menos metade dos membros presente",
  absoluta: "votos Sim de mais da metade de todos os membros",
  tres_quintos: "votos Sim de 3 em cada 5 membros",
  dois_tercos: "votos Sim de 2 em cada 3 membros",
};

export function descricaoExigencia(e: Exigencia) {
  return DESCRICAO[e];
}

/** Minimum Sim votes (or minimum presence, for simple majority) in a house. */
export function votosNecessarios(e: Exigencia, casa: "camara" | "senado") {
  const n = MEMBROS[casa];
  const maioriaAbsoluta = Math.floor(n / 2) + 1;
  if (e === "simples" || e === "absoluta") return maioriaAbsoluta;
  if (e === "tres_quintos") return Math.ceil((n * 3) / 5);
  return Math.ceil((n * 2) / 3);
}

/** Kind of proposal from a vote title such as "PEC 38/2025" or its description. */
export function regraDaVotacao(titulo: string, descricao = ""): Regra | undefined {
  // Procedural requests inside any debate follow the simple-majority rule of the house
  if (/(^|\|)\s*(aprovad|rejeitad)[oa]s? o requerimento|requerimento de (adiamento|retirada|urg[eê]ncia|encerramento)/i.test(descricao))
    return REGRAS.find((r) => r.tipo === "REQ");
  const sigla = titulo.trim().split(/\s+/)[0]?.toUpperCase();
  // Nominations voted by the Senado: higher courts, PGR and national councils need an absolute majority
  if (sigla === "MSF" || sigla === "OFS") {
    const absoluta = /art\. ?(101|103-b|104|128|130-a)\b|supremo tribunal|superior tribunal|procurador-geral da rep|conselho nacional de justi|conselho nacional do minist/i.test(
      descricao,
    );
    return REGRAS.find((r) => r.tipo === (absoluta ? "AUT_ABS" : "AUT"));
  }
  const porSigla = REGRAS.find((r) => r.tipo === sigla || (sigla === "PLV" && r.tipo === "MPV") || (sigla === "PLS" && r.tipo === "PL"));
  if (porSigla) return porSigla;
  const t = descricao.toLowerCase();
  if (/emenda (à|a) constitui/.test(t)) return REGRAS[0];
  if (/lei complementar/.test(t)) return REGRAS[1];
  if (/medida provis/.test(t)) return REGRAS[3];
  if (/projeto de lei/.test(t)) return REGRAS[2];
  return undefined;
}

export interface ResultadoQuorum {
  regra: Regra;
  necessario: number;
  membros: number;
  /** For simple majority the bar is presence; otherwise it is Sim votes */
  medida: "sim" | "presenca";
  atingiu: boolean;
}

/**
 * Whether the counted votes reached the constitutional threshold. This explains the rule; the
 * official result published by the house is always what the page states as the outcome.
 */
export function avaliarQuorum(regra: Regra, casa: Casa, sim: number, nao: number, outros: number): ResultadoQuorum | undefined {
  if (casa === "assembleia") return undefined;
  const necessario = votosNecessarios(regra.exigencia, casa);
  if (regra.exigencia === "simples") {
    return { regra, necessario, membros: MEMBROS[casa], medida: "presenca", atingiu: sim + nao + outros >= necessario && sim > nao };
  }
  return { regra, necessario, membros: MEMBROS[casa], medida: "sim", atingiu: sim >= necessario };
}
