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
  /** One-sentence explanation for someone who has never followed politics */
  explicacao: string;
  /** lucide icon name used next to the metric */
  icone: "calendar-check" | "vote" | "flag" | "landmark" | "wallet" | "search-check" | "file-text" | "scroll" | "send" | "home" | "users";
  formato: (n: number | undefined) => string;
  /** Sentence template for the comparison line; `parcela` is already formatted, e.g. "72%" or "menos de 1%" */
  comparacao: (parcela: string, pares: string) => string;
  casas: Casa[];
  calculo: string;
  fontes: { nome: string; url: string }[];
  /** What the number does not tell (shown as "O que isso não diz") */
  limites: string;
  /** Period the number refers to, in plain words */
  periodo: string;
  /** Houses where the data is missing or partial, and why: shown instead of a silent blank */
  cobertura?: Partial<Record<Casa, { estado: "parcial" | "indisponivel"; motivo: string }>>;
}

/** Plain words for the coverage states shown next to each number. */
export const ROTULO_COBERTURA = { disponivel: "Dados completos", parcial: "Dados parciais", indisponivel: "Sem dados", "nao-se-aplica": "Não se aplica" } as const;

const CAM = { nome: "Câmara dos Deputados - Dados Abertos", url: "https://dadosabertos.camara.leg.br" };
const SEN = { nome: "Senado Federal - Dados Abertos", url: "https://www12.senado.leg.br/dados-abertos" };
const TSE = { nome: "TSE - Portal de Dados Abertos", url: "https://dadosabertos.tse.jus.br" };

export const METRICAS: DefMetrica[] = [
  {
    chave: "presenca",
    explicacao: "Deputados e senadores devem ir às sessões do Plenário, onde as leis são votadas. Este número mostra em quantas delas a pessoa esteve.",
    icone: "calendar-check",
    titulo: "Presença",
    pergunta: "Aparece para trabalhar?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Presença maior que a de ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Câmara: sessões deliberativas do Plenário já encerradas em que o deputado registrou presença, divididas pelo total dessas sessões desde o início do seu exercício atual. Senado: dias com votação nominal em que o senador registrou voto ou presença, divididos pelos dias com votação nominal em que ele estava em exercício. Período: últimos 12 meses.",
    fontes: [CAM, SEN],
    periodo: "Últimos 12 meses, contando só o tempo em que a pessoa estava no cargo.",
    cobertura: { assembleia: { estado: "indisponivel", motivo: "As assembleias estaduais ainda não publicam a presença de cada deputado em formato aberto." } },
    limites:
      "A Câmara não publica em formato aberto se a ausência foi justificada (licença médica, missão oficial). No Senado, ausências justificadas aparecem separadas no detalhe do perfil.",
  },
  {
    chave: "participacao",
    explicacao: "Nas votações nominais, cada voto fica registrado com o nome de quem votou. Este número mostra em quantas a pessoa votou.",
    icone: "vote",
    titulo: "Votações nominais",
    pergunta: "Vota quando é chamado?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Participou de mais votações que ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Votações nominais do Plenário em que registrou voto (Sim, Não, Abstenção, Obstrução ou presença sem voto), divididas pelas votações nominais ocorridas enquanto estava em exercício, nos últimos 12 meses. Votações secretas do Senado não entram.",
    fontes: [CAM, SEN],
    periodo: "Votações nominais dos últimos 12 meses em que a pessoa estava no cargo.",
    cobertura: { assembleia: { estado: "indisponivel", motivo: "As assembleias estaduais ainda não publicam o voto de cada deputado em formato aberto." } },
    limites: "Quem preside a sessão normalmente não vota. Votações simbólicas (sem registro individual) não entram.",
  },
  {
    chave: "fidelidade",
    explicacao: "Antes de cada votação, o partido diz como seus membros devem votar. Este número mostra quantas vezes a pessoa seguiu essa orientação.",
    icone: "flag",
    titulo: "Segue o partido",
    pergunta: "Vota como o partido orienta?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Segue o partido mais que ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Entre as votações em que votou Sim, Não, Abstenção ou Obstrução e o partido deu orientação, a porcentagem em que o voto foi igual à orientação. Votos liberados e ausências não contam. Mínimo de 10 votações comparáveis. Câmara: orientação oficial da liderança do partido, federação ou bloco. Senado: como o Senado não publica orientações neste formato, usa-se a posição da maioria da bancada do partido naquela votação.",
    fontes: [CAM, SEN],
    periodo: "Votações nominais dos últimos 12 meses.",
    limites: "Seguir ou não o partido não é bom nem ruim por si só: indica alinhamento, não qualidade.",
  },
  {
    chave: "governismo",
    explicacao: "O governo federal também diz como gostaria que cada proposta fosse votada. Este número mostra quantas vezes a pessoa votou igual ao governo.",
    icone: "landmark",
    titulo: "Vota com o governo",
    pergunta: "Acompanha o governo federal?",
    formato: (n) => pct(n),
    comparacao: (p, pares) => `Vota com o governo mais que ${p} ${pares}`,
    casas: ["camara"],
    calculo:
      "Entre as votações em que a liderança do Governo orientou Sim ou Não (ou Obstrução/Abstenção) e o deputado votou, a porcentagem em que o voto coincidiu com a orientação do Governo. Mínimo de 10 votações comparáveis.",
    fontes: [CAM],
    periodo: "Votações nominais dos últimos 12 meses.",
    limites: "Disponível apenas para a Câmara, que publica a orientação do Governo em cada votação.",
  },
  {
    chave: "gasto12m",
    explicacao: "Além do salário, cada parlamentar tem uma verba para pagar despesas do trabalho, como passagens, combustível e escritório. Este é o total gasto em 12 meses.",
    icone: "wallet",
    titulo: "Gastos da cota",
    pergunta: "Quanto gastou de verba do mandato?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Gastou mais que ${p} ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo:
      "Soma dos reembolsos da Cota para o Exercício da Atividade Parlamentar (CEAP na Câmara, CEAPS no Senado; verba indenizatória nas assembleias que publicam) nos últimos 12 meses completos. Como os lançamentos chegam com atraso, os dois meses mais recentes só entram quando o total da casa atinge 80% da mediana dos 12 meses anteriores. Meses de gasto naturalmente menor, como recesso e período eleitoral, continuam na conta.",
    fontes: [
      { nome: "Câmara - Cota parlamentar", url: "https://www.camara.leg.br/transparencia/gastos-parlamentares" },
      { nome: "Senado - CEAPS", url: "https://www12.senado.leg.br/transparencia/sen/" },
    ],
    periodo: "Os últimos 12 meses completos.",
    cobertura: { assembleia: { estado: "parcial", motivo: "Só algumas assembleias (como as de São Paulo e Minas Gerais) publicam os gastos de cada deputado." } },
    limites:
      "O teto da cota varia por estado (passagens para Brasília custam diferente), por isso a comparação justa é com colegas do mesmo estado. Salários e verba de gabinete não entram.",
  },
  {
    chave: "alertas",
    explicacao: "Gastos fora do padrão encontrados por regras automáticas. Não é acusação: é um convite para conferir a nota fiscal.",
    icone: "search-check",
    titulo: "Gastos para conferir",
    pergunta: "Algum gasto merece um segundo olhar?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais pontos de atenção que ${p} ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo:
      "Regras automáticas inspiradas na Operação Serenata de Amor: CNPJ/CPF do fornecedor com dígito verificador inválido (códigos internos que a casa usa para serviços próprios não entram); refeição com valor muito acima do padrão da casa (média + 4 desvios-padrão); valor entre os 0,1% maiores da categoria; o mesmo documento fiscal (fornecedor, número, valor e data de emissão iguais) reembolsado mais de uma vez; mais de 50% do gasto de 12 meses concentrado em um único fornecedor.",
    fontes: [{ nome: "Serenata de Amor (metodologia de referência)", url: "https://github.com/okfn-brasil/serenata-de-amor" }],
    periodo: "Os últimos 12 meses completos.",
    limites: "Um ponto de atenção não é acusação de irregularidade: é um gasto fora do padrão que vale conferir no documento original, sempre linkado.",
  },
  {
    chave: "proposicoes",
    explicacao: "Projetos são ideias de novas leis ou de mudanças nas leis. Este é o número de projetos que a pessoa assinou como autora ou coautora.",
    icone: "file-text",
    titulo: "Projetos apresentados",
    pergunta: "O que propõe?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Apresentou mais projetos que ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Projetos de lei (PL), projetos de lei complementar (PLP), propostas de emenda à Constituição (PEC) e projetos de decreto legislativo (PDL) em que é autor ou coautor, em toda a carreira registrada pela casa.",
    fontes: [CAM, SEN],
    periodo: "Toda a carreira: na Câmara, projetos apresentados desde 1988; no Senado, todas as matérias de autoria.",
    limites: "Quantidade não mede qualidade nem impacto. Coautorias contam como autoria. Requerimentos e indicações não entram.",
  },
  {
    chave: "proposicoesLei",
    explicacao: "Projetos que foram aprovados e viraram lei de fato.",
    icone: "scroll",
    titulo: "Viraram lei",
    pergunta: "Algum projeto virou lei?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais projetos transformados em lei que ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo: "Projetos da lista acima cuja situação atual é 'Transformado em Norma Jurídica' (Câmara) ou que geraram norma (Senado).",
    fontes: [CAM, SEN],
    periodo: "Toda a carreira, com a situação atual de cada projeto.",
    limites: "Considera os 100 projetos mais recentes de cada parlamentar.",
  },
  {
    chave: "emendas",
    explicacao: "Parlamentares podem indicar dinheiro do orçamento federal para cidades e estados. As “emendas Pix” chegam direto ao caixa da prefeitura ou do estado.",
    icone: "send",
    titulo: "Emendas Pix",
    pergunta: "Quanto dinheiro mandou para cidades?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Indicou mais recursos que ${p} ${pares}`,
    casas: ["camara", "senado"],
    calculo:
      "Soma dos valores de investimento e custeio dos planos de ação de transferências especiais (as chamadas 'emendas Pix') indicadas pelo parlamentar desde 2020, segundo o Transferegov. Quando a chave da API do Portal da Transparência está configurada, usa todas as emendas individuais pagas.",
    fontes: [{ nome: "Transferegov - Transferências Especiais", url: "https://api.transferegov.gestao.gov.br/transferenciasespeciais/" }],
    periodo: "Desde 2020.",
    limites: "A ligação entre emenda e parlamentar é feita pelo nome do autor, que pode falhar em nomes muito comuns.",
  },
  {
    chave: "patrimonio",
    explicacao: "Valor dos bens (casas, carros, aplicações) que a pessoa declarou ao se candidatar.",
    icone: "home",
    titulo: "Patrimônio declarado",
    pergunta: "Quanto declarou ter de bens?",
    formato: (n) => moedaCurta(n),
    comparacao: (p, pares) => `Patrimônio maior que o de ${p} ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo: "Soma dos bens declarados ao TSE no registro da candidatura mais recente encontrada. A seção Vida pública mostra a declaração de cada eleição desde 2006.",
    fontes: [TSE],
    periodo: "A declaração mais recente entregue ao TSE.",
    limites: "É o valor declarado pelo próprio candidato, geralmente pelo valor histórico de compra, não pelo valor de mercado.",
  },
  {
    chave: "votosRecebidos",
    explicacao: "Quantas pessoas votaram nela na última eleição.",
    icone: "users",
    titulo: "Votos em 2022",
    pergunta: "Quantos votos recebeu?",
    formato: (n) => numero(n),
    comparacao: (p, pares) => `Mais votado que ${p} ${pares}`,
    casas: ["camara", "senado", "assembleia"],
    calculo: "Votos nominais recebidos no 1º turno das eleições de 2022, segundo os resultados oficiais do TSE.",
    fontes: [TSE],
    periodo: "Eleição de 2022, 1º turno.",
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

/** "72%", or "menos de 1%" / "mais de 99%" so rounding never states 0% or 100% when that is not true. */
export function parcela(p: number) {
  if (p > 0 && p < 1) return "menos de 1%";
  if (p > 99 && p < 100) return "mais de 99%";
  return `${Math.round(p)}%`;
}

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
