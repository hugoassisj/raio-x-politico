import type { Casa, PoliticoResumo, VotacaoResumo } from "./types";
import { median } from "./stats";

/** Full party names, so the acronym is never the only thing a reader sees. */
export const NOMES_PARTIDOS: Record<string, string> = {
  AVANTE: "Avante",
  CIDADANIA: "Cidadania",
  DC: "Democracia Cristã",
  MDB: "Movimento Democrático Brasileiro",
  MISSÃO: "Missão",
  NOVO: "Partido Novo",
  PCdoB: "Partido Comunista do Brasil",
  PDT: "Partido Democrático Trabalhista",
  PL: "Partido Liberal",
  PMB: "Partido da Mulher Brasileira",
  PODE: "Podemos",
  PP: "Progressistas",
  PRD: "Partido Renovação Democrática",
  PSB: "Partido Socialista Brasileiro",
  PSD: "Partido Social Democrático",
  PSDB: "Partido da Social Democracia Brasileira",
  PSOL: "Partido Socialismo e Liberdade",
  PT: "Partido dos Trabalhadores",
  PV: "Partido Verde",
  REDE: "Rede Sustentabilidade",
  REPUBLICANOS: "Republicanos",
  SOLIDARIEDADE: "Solidariedade",
  UNIÃO: "União Brasil",
  AGIR: "Agir",
  MOBILIZA: "Mobiliza",
  PCB: "Partido Comunista Brasileiro",
  PSTU: "Partido Socialista dos Trabalhadores Unificado",
  UP: "Unidade Popular",
  PCO: "Partido da Causa Operária",
  PRTB: "Partido Renovador Trabalhista Brasileiro",
  // Parties that merged, changed name or ended, still seen in older candidacies
  PMDB: "Partido do Movimento Democrático Brasileiro",
  PFL: "Partido da Frente Liberal",
  DEM: "Democratas",
  PPS: "Partido Popular Socialista",
  PR: "Partido da República",
  PRB: "Partido Republicano Brasileiro",
  PTB: "Partido Trabalhista Brasileiro",
  PSL: "Partido Social Liberal",
  PSC: "Partido Social Cristão",
  PROS: "Partido Republicano da Ordem Social",
  PATRIOTA: "Patriota",
  PEN: "Partido Ecológico Nacional",
  PTC: "Partido Trabalhista Cristão",
  PMN: "Partido da Mobilização Nacional",
  PHS: "Partido Humanista da Solidariedade",
  PPL: "Partido Pátria Livre",
  PRP: "Partido Republicano Progressista",
  SD: "Solidariedade",
  "PT do B": "Partido Trabalhista do Brasil",
  PTN: "Partido Trabalhista Nacional",
  PSDC: "Partido Social Democrata Cristão",
  PRONA: "Partido de Reedificação da Ordem Nacional",
  PPB: "Partido Progressista Brasileiro",
  PRN: "Partido da Reconstrução Nacional",
};

export const nomePartido = (sigla: string) => NOMES_PARTIDOS[sigla] ?? sigla;

/**
 * How much a party votes with the federal government, binned into five neutral steps.
 * Diverging colors: blue = votes with the government, orange = votes against, gray = in between.
 */
export const FAIXAS_GOVERNO = [
  { ate: 0.3, cor: "#b8501a", rotulo: "Com o governo em menos de 30% das vezes" },
  { ate: 0.45, cor: "#ef9a62", rotulo: "De 30% a 45%" },
  { ate: 0.55, cor: "#d5d8dd", rotulo: "De 45% a 55%" },
  { ate: 0.7, cor: "#6ea1e2", rotulo: "De 55% a 70%" },
  { ate: 1.01, cor: "#1f5aa8", rotulo: "Com o governo em 70% ou mais das vezes" },
];
export const COR_SEM_DADO = "#dfe3e8";

export function faixaGoverno(g: number | undefined) {
  if (g == null) return undefined;
  return FAIXAS_GOVERNO.find((f) => g < f.ate) ?? FAIXAS_GOVERNO[FAIXAS_GOVERNO.length - 1];
}

export interface ResumoPartido {
  sigla: string;
  nome: string;
  cadeiras: Record<Casa, number>;
  /** Median government alignment of its federal deputies (Câmara publishes the orientation) */
  governismo?: number;
  /** Median share of votes following the party orientation */
  fidelidade?: number;
  presenca?: number;
  gastoMediano?: number;
  gastoTotal: number;
  /** Average share of members voting on the same side in roll calls (0.5..1) */
  unidade?: number;
  membros: PoliticoResumo[];
}

/**
 * Party unity: in each roll call where the party had at least 3 members voting Sim or Não, the
 * share on the majority side; averaged over roll calls.
 */
export function unidadePartido(sigla: string, votacoes: VotacaoResumo[], casa?: Casa): number | undefined {
  const xs: number[] = [];
  for (const v of votacoes) {
    if (casa && v.casa !== casa) continue;
    const g = v.porPartido.find((p) => p.partido === sigla);
    if (!g) continue;
    const t = g.sim + g.nao;
    if (t < 3) continue;
    xs.push(Math.max(g.sim, g.nao) / t);
  }
  return xs.length >= 5 ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

export function resumirPartidos(pols: PoliticoResumo[], votacoes: VotacaoResumo[]): ResumoPartido[] {
  const por = new Map<string, PoliticoResumo[]>();
  for (const p of pols) if (p.emExercicio) por.set(p.partido, [...(por.get(p.partido) ?? []), p]);
  return [...por.entries()]
    .map(([sigla, membros]) => {
      const cam = membros.filter((m) => m.casa === "camara");
      const fed = membros.filter((m) => m.casa !== "assembleia");
      const vals = (xs: PoliticoResumo[], k: keyof PoliticoResumo["m"]) => xs.map((m) => m.m[k]).filter((x): x is number => typeof x === "number");
      return {
        sigla,
        nome: nomePartido(sigla),
        cadeiras: {
          camara: cam.length,
          senado: membros.filter((m) => m.casa === "senado").length,
          assembleia: membros.filter((m) => m.casa === "assembleia").length,
        },
        governismo: median(vals(cam, "governismo")),
        fidelidade: median(vals(fed, "fidelidade")),
        presenca: median(vals(fed, "presenca")),
        gastoMediano: median(vals(fed, "gasto12m")),
        gastoTotal: vals(membros, "gasto12m").reduce((a, b) => a + b, 0),
        unidade: unidadePartido(sigla, votacoes),
        membros,
      };
    })
    .sort((a, b) => b.cadeiras.camara + b.cadeiras.senado - (a.cadeiras.camara + a.cadeiras.senado) || b.cadeiras.assembleia - a.cadeiras.assembleia);
}

/** Seats of one house ordered by party position (most with the government first), then party, then name. */
export function ordenarParaPlenario(membros: PoliticoResumo[], partidos: ResumoPartido[]) {
  const pos = new Map(partidos.map((p) => [p.sigla, p.governismo ?? -1]));
  return [...membros].sort((a, b) => (pos.get(b.partido) ?? -1) - (pos.get(a.partido) ?? -1) || a.partido.localeCompare(b.partido) || a.nome.localeCompare(b.nome, "pt-BR"));
}
