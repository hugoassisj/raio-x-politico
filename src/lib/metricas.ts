import type { Casa, Metricas, PoliticoResumo } from "./types";
import { moedaCurta, numero, pct } from "./format";

/**
 * Single source of truth for every metric shown in the app: plain-language label, how it is
 * calculated, where it comes from and its known limits. Tiles, rankings and the methodology page
 * all read from here, so the explanation a visitor sees is always the one the code implements.
 */
export type ChaveMetrica = keyof Pick<
  Metricas,
  "presenca" | "participacao" | "fidelidade" | "governismo" | "gasto12m" | "alertas" | "proposicoes" | "proposicoesLei" | "emendas" | "patrimonio" | "votosRecebidos"
>;

export interface DefMetrica {
  chave: ChaveMetrica;
  titulo: string;
  /** Short question a regular person would ask */
  pergunta: string;
  formato: (n: number | undefined) => string;
  /** Sentence template for the comparison line, e.g. "mais presente que 72% dos deputados" */
  comparacao: (pctAbaixo: number, pares: string) => string;
  casas: Casa[];
  calculo: string;
  fontes: { nome: string; url: string }[];
  limites: string;
}

const CAM = { nome: "Câmara dos Deputados - Dados Abertos", url: "https://dadosabertos.camara.leg.br" };
const SEN = { nome: "Senado Federal - Dados Abertos", url: "https://www12.senado.leg.br/dados-abertos" };
const TSE = { nome: "TSE - Portal de Dados Abertos", url: "https://dadosabertos.tse.jus.br" };

export const METRICAS: DefMetrica[] = [
  {
    chave: "presenca",
    titulo: "Presença",
    pergunta: "Aparece para trabalhar?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Presença maior que a de ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Câmara: sessões deliberativas do Plenário já encerradas em que o deputado registrou presença, divididas pelo total dessas sessões desde o início do seu exercício atual. Senado: dias com votação nominal em que o senador registrou voto ou presença, divididos pelos dias com votação nominal em que ele estava em exercício. Período: últimos 12 meses.",
    fontes: [CAM, SEN],
    limites:
      "A Câmara não publica em formato aberto se a ausência foi justificada (licença médica, missão oficial). No Senado, ausências justificadas aparecem separadas no detalhe do perfil.",
  },
  {
    chave: "participacao",
    titulo: "Votações nominais",
    pergunta: "Vota quando é chamado?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Participou de mais votações que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Votações nominais do Plenário em que registrou voto (Sim, Não, Abstenção, Obstrução ou presença sem voto), divididas pelas votações nominais ocorridas enquanto estava em exercício, nos últimos 12 meses. Votações secretas do Senado não entram.",
    fontes: [CAM, SEN],
    limites: "Quem preside a sessão normalmente não vota. Votações simbólicas (sem registro individual) não entram.",
  },
  {
    chave: "fidelidade",
    titulo: "Segue o partido",
    pergunta: "Vota como o partido orienta?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Segue o partido mais que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Entre as votações em que votou Sim, Não, Abstenção ou Obstrução e o partido deu orientação, a porcentagem em que o voto foi igual à orientação. Votos liberados e ausências não contam. Mínimo de 10 votações comparáveis. Câmara: orientação oficial da liderança do partido, federação ou bloco. Senado: como o Senado não publica orientações neste formato, usa-se a posição da maioria da bancada do partido naquela votação.",
    fontes: [CAM, SEN],
    limites: "Seguir ou não o partido não é bom nem ruim por si só: indica alinhamento, não qualidade.",
  },
  {
    chave: "governismo",
    titulo: "Vota com o governo",
    pergunta: "Acompanha o governo federal?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Vota com o governo mais que ${Math.round(p)}% ${pares}`,
    casas: ["camara"],
    calculo:
      "Entre as votações em que a liderança do Governo orientou Sim ou Não (ou Obstrução/Abstenção) e o deputado votou, a porcentagem em que o voto coincidiu com a orientação do Governo. Mínimo de 10 votações comparáveis.",
    fontes: [CAM],
    limites: "Disponível apenas para a Câmara, que publica a orientação do Governo em cada votação.",
  },
  {
    chave: "gasto12m",
    titulo: "Gastos da cota",
    pergunta: "Quanto gastou de verba do mandato?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Gastou mais que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo:
      "Soma dos reembolsos da Cota para o Exercício da Atividade Parlamentar (CEAP na Câmara, CEAPS no Senado; verba indenizatória nas assembleias que publicam) nos últimos 12 meses completos. O mês mais recente só entra quando o total da casa atinge 80% da mediana dos 12 meses anteriores, porque os lançamentos chegam com atraso.",
    fontes: [
      { nome: "Câmara - Cota parlamentar", url: "https://www.camara.leg.br/transparencia/gastos-parlamentares" },
      { nome: "Senado - CEAPS", url: "https://www12.senado.leg.br/transparencia/sen/" },
    ],
    limites: "O teto da cota varia por estado (passagens para Brasília custam diferente), por isso a comparação justa é com colegas do mesmo estado. Salários e verba de gabinete não entram.",
  },
  {
    chave: "alertas",
    titulo: "Gastos para conferir",
    pergunta: "Algum gasto merece um segundo olhar?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais pontos de atenção que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo:
      "Regras automáticas inspiradas na Operação Serenata de Amor: CNPJ/CPF do fornecedor com dígito verificador inválido; refeição com valor muito acima do padrão da casa (média + 4 desvios-padrão); valor entre os 0,5% maiores da categoria; dois reembolsos com mesmo fornecedor, data e valor; mais de 50% do gasto anual concentrado em um único fornecedor.",
    fontes: [{ nome: "Serenata de Amor (metodologia de referência)", url: "https://github.com/okfn-brasil/serenata-de-amor" }],
    limites: "Um ponto de atenção não é acusação de irregularidade: é um gasto fora do padrão que vale conferir no documento original, sempre linkado.",
  },
  {
    chave: "proposicoes",
    titulo: "Projetos apresentados",
    pergunta: "O que propõe?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Apresentou mais projetos que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo: "Projetos de lei (PL), projetos de lei complementar (PLP), propostas de emenda à Constituição (PEC) e projetos de decreto legislativo (PDL) em que é autor ou coautor, em toda a carreira registrada pela casa.",
    fontes: [CAM, SEN],
    limites: "Quantidade não mede qualidade nem impacto. Coautorias contam como autoria. Requerimentos e indicações não entram.",
  },
  {
    chave: "proposicoesLei",
    titulo: "Viraram lei",
    pergunta: "Algum projeto virou lei?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais projetos transformados em lei que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo: "Projetos da lista acima cuja situação atual é 'Transformado em Norma Jurídica' (Câmara) ou que geraram norma (Senado).",
    fontes: [CAM, SEN],
    limites: "Considera os 100 projetos mais recentes de cada parlamentar.",
  },
  {
    chave: "emendas",
    titulo: "Emendas Pix",
    pergunta: "Quanto dinheiro mandou para cidades?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Indicou mais recursos que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Soma dos valores de investimento e custeio dos planos de ação de transferências especiais (as chamadas 'emendas Pix') indicadas pelo parlamentar desde 2020, segundo o Transferegov. Quando a chave da API do Portal da Transparência está configurada, usa todas as emendas individuais pagas.",
    fontes: [{ nome: "Transferegov - Transferências Especiais", url: "https://api.transferegov.gestao.gov.br/transferenciasespeciais/" }],
    limites: "A ligação entre emenda e parlamentar é feita pelo nome do autor, que pode falhar em nomes muito comuns.",
  },
  {
    chave: "patrimonio",
    titulo: "Patrimônio declarado",
    pergunta: "Quanto declarou ter de bens?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Patrimônio maior que o de ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo: "Soma dos bens declarados ao TSE no registro da candidatura mais recente encontrada (2018, 2022 ou 2026).",
    fontes: [TSE],
    limites: "É o valor declarado pelo próprio candidato, geralmente pelo valor histórico de compra, não pelo valor de mercado.",
  },
  {
    chave: "votosRecebidos",
    titulo: "Votos em 2022",
    pergunta: "Quantos votos recebeu?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais votado que ${Math.round(p)}% ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo: "Votos nominais recebidos no 1º turno das eleições de 2022, segundo os resultados oficiais do TSE.",
    fontes: [TSE],
    limites: "Suplentes que assumiram o mandato recebem menos votos por definição.",
  },
];

export const metrica = (k: ChaveMetrica) => METRICAS.find((m) => m.chave === k)!;

export const NOME_PARES: Record<Casa, string> = {
  camara: "dos deputados federais",
  senado: "dos senadores",
  assembleia: "dos deputados estaduais",
};

export const NOME_CASA: Record<Casa, string> = {
  camara: "Câmara dos Deputados",
  senado: "Senado Federal",
  assembleia: "Assembleias Legislativas",
};

/** Share of peers with a strictly lower value (0..100), or undefined if no data. */
export function percentil(valor: number | undefined, pares: (number | undefined)[]) {
  if (valor == null) return undefined;
  const xs = pares.filter((x): x is number => x != null);
  if (xs.length < 5) return undefined;
  return (xs.filter((x) => x < valor).length / xs.length) * 100;
}

export function distribuicao(pols: PoliticoResumo[], casa: Casa, k: ChaveMetrica) {
  const xs = pols
    .filter((p) => p.casa === casa)
    .map((p) => p.m[k])
    .filter((x): x is number => x != null)
    .sort((a, b) => a - b);
  if (!xs.length) return undefined;
  const q = (f: number) => xs[Math.min(xs.length - 1, Math.floor(f * (xs.length - 1)))];
  return { min: xs[0], max: xs[xs.length - 1], mediana: q(0.5), p10: q(0.1), p90: q(0.9), n: xs.length, valores: xs };
}
