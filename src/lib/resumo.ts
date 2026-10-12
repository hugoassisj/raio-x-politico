import type { Metricas, PoliticoResumo } from "./types";
import { metrica, NOME_PARES, type ChaveMetrica, type DefMetrica } from "./metricas";
import { median } from "./stats";
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
    frases.push(
      anos <= 0 ? `Está no primeiro mandato encontrado nos registros públicos.` : `Tem mandatos registrados desde ${p.inicioPolitica} (${anos} ${anos === 1 ? "ano" : "anos"}).`,
    );
  }
  return frases.join(" ");
}

/**
 * The four headline answers for a profile. Each comes with one plain sentence and the typical value
 * (median) among colleagues of the same house, so the number is never read without context.
 */
export function resumoRapido(p: PoliticoResumo & { presenca?: { sessoes: number; presente: number } }, todos: PoliticoResumo[]) {
  const pares = todos.filter((x) => x.casa === p.casa);
  const tipico = (k: ChaveMetrica, fmt: (n: number | undefined) => string) => {
    const m = median(pares.map((x) => x.m[k]).filter((x): x is number => typeof x === "number"));
    return m == null ? undefined : `Valor típico ${NOME_PARES[p.casa]}: ${fmt(m)}`;
  };
  const m: Metricas = p.m;
  const itens: { def: DefMetrica; valor: number | undefined; frase: string; tipico?: string }[] = [];
  const add = (k: ChaveMetrica, frase: string) => {
    const def = metrica(k);
    if (m[k] == null) return;
    itens.push({ def, valor: m[k], frase, tipico: tipico(k, def.formato) });
  };
  if (p.casa !== "assembleia") {
    add("presenca", p.presenca ? `Foi a ${p.presenca.presente} de ${p.presenca.sessoes} sessões do Plenário.` : "Das sessões do Plenário em que estava em exercício.");
    add("participacao", `Votou em ${m.votacoesBase ? `${Math.round((m.participacao ?? 0) * m.votacoesBase)} de ${m.votacoesBase}` : "parte das"} votações registradas.`);
    if (p.casa === "camara") add("governismo", "Das vezes em que votou igual ao que o governo federal pediu.");
    else add("fidelidade", "Das vezes em que votou igual à maioria do seu partido.");
  } else {
    add("votosRecebidos", "Votos recebidos na eleição de 2022.");
    add("patrimonio", "Bens declarados ao TSE na última candidatura.");
  }
  add("gasto12m", "Gastos do mandato reembolsados nos últimos 12 meses.");
  return itens.slice(0, 4);
}
