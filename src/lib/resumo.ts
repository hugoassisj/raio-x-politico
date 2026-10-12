import type { PoliticoResumo } from "./types";
import { moedaCurta, pct } from "./format";

/**
 * Plain-language one-paragraph summary built only from computed metrics (no AI involved),
 * so it always matches the numbers on the page.
 */
export function fraseResumo(p: PoliticoResumo, anoAtual = new Date().getUTCFullYear()): string {
  const m = p.m;
  const partes: string[] = [];
  if (m.presenca != null) partes.push(`esteve em ${pct(m.presenca)} das sessões do Plenário`);
  if (m.participacao != null) partes.push(`registrou voto em ${pct(m.participacao)} das votações nominais`);
  if (m.fidelidade != null) partes.push(`votou como o partido em ${pct(m.fidelidade)} das vezes`);
  if (m.gasto12m != null) partes.push(`usou ${moedaCurta(m.gasto12m)} da cota parlamentar`);

  const frases: string[] = [];
  if (partes.length) {
    const ult = partes.pop()!;
    frases.push(`Nos últimos 12 meses, ${partes.length ? `${partes.join(", ")} e ${ult}` : ult}.`);
  }
  if (m.proposicoes != null) {
    const lei = m.proposicoesLei ? `, ${m.proposicoesLei === 1 ? "um virou lei" : `${m.proposicoesLei} viraram lei`}` : "";
    const autor = p.sexo === "F" ? "autora ou coautora" : p.sexo === "M" ? "autor ou coautor" : "autor(a) ou coautor(a)";
    frases.push(`É ${autor} de ${m.proposicoes} ${m.proposicoes === 1 ? "projeto" : "projetos"}${lei}.`);
  }
  if (p.inicioPolitica) {
    const anos = anoAtual - p.inicioPolitica;
    frases.push(anos <= 0 ? `Está no primeiro mandato encontrado nos registros públicos.` : `Tem mandatos registrados desde ${p.inicioPolitica} (${anos} ${anos === 1 ? "ano" : "anos"}).`);
  }
  return frases.join(" ");
}
