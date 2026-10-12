/**
 * What each elected office does and who to look for when something in daily life goes wrong.
 * Written for people who have never followed politics; each office cites the article of the
 * Constitution that defines it.
 */
export type Nivel = "municipio" | "estado" | "uniao";

export interface Cargo {
  id: string;
  nome: string;
  nivel: Nivel;
  /** One sentence: what the person in this office does */
  faz: string;
  /** Concrete examples of their decisions */
  exemplos: string[];
  quantos: string;
  mandato: string;
  comoEleito: string;
  artigo: string;
  /** Whether the site shows people in this office today */
  acompanhado: boolean;
}

export const NIVEL: Record<Nivel, { nome: string; quem: string }> = {
  municipio: { nome: "Cidade", quem: "Prefeitura e Câmara de Vereadores" },
  estado: { nome: "Estado", quem: "Governo do estado e Assembleia Legislativa" },
  uniao: { nome: "País", quem: "Governo federal e Congresso Nacional" },
};

export const CARGOS: Cargo[] = [
  {
    id: "vereador",
    nome: "Vereador",
    nivel: "municipio",
    faz: "Faz as leis da cidade e fiscaliza o prefeito.",
    exemplos: ["Aprova o orçamento da prefeitura", "Muda regras de construção e de uso das ruas", "Pode abrir investigação sobre a prefeitura"],
    quantos: "De 9 a 55 por cidade, conforme o número de moradores",
    mandato: "4 anos",
    comoEleito: "Eleição proporcional: os votos contam primeiro para o partido",
    artigo: "Constituição, art. 29",
    acompanhado: false,
  },
  {
    id: "prefeito",
    nome: "Prefeito",
    nivel: "municipio",
    faz: "Administra a cidade e cuida dos serviços mais próximos do dia a dia.",
    exemplos: ["Postos de saúde e creches", "Escolas de ensino infantil e fundamental", "Ônibus da cidade, coleta de lixo, ruas e praças"],
    quantos: "1 por cidade, com um vice",
    mandato: "4 anos, com uma reeleição seguida permitida",
    comoEleito: "Quem tiver mais votos; nas cidades com mais de 200 mil eleitores pode haver 2º turno",
    artigo: "Constituição, art. 29",
    acompanhado: false,
  },
  {
    id: "deputado-estadual",
    nome: "Deputado estadual",
    nivel: "estado",
    faz: "Faz as leis do estado e fiscaliza o governador.",
    exemplos: ["Aprova o orçamento do estado", "Define regras de impostos estaduais, como o IPVA", "Pode investigar o governo do estado"],
    quantos: "De 24 a 94 por estado (no Distrito Federal, deputados distritais)",
    mandato: "4 anos",
    comoEleito: "Eleição proporcional: os votos contam primeiro para o partido",
    artigo: "Constituição, art. 27",
    acompanhado: true,
  },
  {
    id: "governador",
    nome: "Governador",
    nivel: "estado",
    faz: "Administra o estado.",
    exemplos: ["Polícias Militar e Civil", "Escolas de ensino médio e hospitais estaduais", "Rodovias estaduais e presídios"],
    quantos: "1 por estado, com um vice",
    mandato: "4 anos, com uma reeleição seguida permitida",
    comoEleito: "Precisa de mais da metade dos votos válidos, senão há 2º turno",
    artigo: "Constituição, art. 28",
    acompanhado: false,
  },
  {
    id: "deputado-federal",
    nome: "Deputado federal",
    nivel: "uniao",
    faz: "Faz as leis do país, aprova o orçamento federal e fiscaliza o governo federal.",
    exemplos: ["Vota mudanças na Constituição, nos impostos e na aposentadoria", "Pode abrir um processo de impeachment", "Indica dinheiro do orçamento para cidades (emendas)"],
    quantos: "513, divididos pelos estados conforme a população",
    mandato: "4 anos",
    comoEleito: "Eleição proporcional: os votos contam primeiro para o partido",
    artigo: "Constituição, arts. 45 e 51",
    acompanhado: true,
  },
  {
    id: "senador",
    nome: "Senador",
    nivel: "uniao",
    faz: "Faz as leis do país junto com a Câmara e representa o seu estado.",
    exemplos: ["Revisa as leis aprovadas pela Câmara", "Aprova quem vai para o Supremo e para as embaixadas", "Julga o impeachment do Presidente"],
    quantos: "81, sendo 3 por estado",
    mandato: "8 anos (a cada 4 anos, parte das cadeiras é renovada)",
    comoEleito: "Quem tiver mais votos no estado",
    artigo: "Constituição, arts. 46 e 52",
    acompanhado: true,
  },
  {
    id: "presidente",
    nome: "Presidente da República",
    nivel: "uniao",
    faz: "Governa o país: executa as leis, comanda os ministérios e propõe o orçamento.",
    exemplos: ["Aprova (sanciona) ou barra (veta) as leis do Congresso", "Edita medidas provisórias", "Comanda as Forças Armadas"],
    quantos: "1, com um vice",
    mandato: "4 anos, com uma reeleição seguida permitida",
    comoEleito: "Precisa de mais da metade dos votos válidos, senão há 2º turno",
    artigo: "Constituição, arts. 76 a 84",
    acompanhado: false,
  },
];

export interface Problema {
  problema: string;
  /** Words people may type for it */
  termos: string[];
  /** Who runs the service */
  executa: string;
  /** Who makes the rules and oversees */
  legisla: string;
  nivel: Nivel;
  nota?: string;
}

/** "Quem resolve isso?": everyday problems and the level of government responsible. */
export const PROBLEMAS: Problema[] = [
  {
    problema: "Buraco na rua, calçada, praça",
    termos: ["asfalto", "rua", "buraco", "calçada", "praça", "iluminação"],
    executa: "Prefeito",
    legisla: "Vereadores",
    nivel: "municipio",
  },
  { problema: "Coleta de lixo", termos: ["lixo", "coleta", "entulho"], executa: "Prefeito", legisla: "Vereadores", nivel: "municipio" },
  {
    problema: "Ônibus da cidade",
    termos: ["ônibus", "transporte", "passagem", "tarifa"],
    executa: "Prefeito",
    legisla: "Vereadores",
    nivel: "municipio",
    nota: "Ônibus entre cidades e metrôs costumam ser do estado.",
  },
  {
    problema: "Creche e escola até o 9º ano",
    termos: ["creche", "escola", "ensino fundamental", "educação infantil", "vaga"],
    executa: "Prefeito",
    legisla: "Vereadores",
    nivel: "municipio",
  },
  {
    problema: "Posto de saúde",
    termos: ["posto", "saúde", "consulta", "ubs", "vacina"],
    executa: "Prefeito",
    legisla: "Vereadores",
    nivel: "municipio",
    nota: "O SUS é dividido entre cidade, estado e União; o atendimento básico é da cidade.",
  },
  { problema: "IPTU", termos: ["iptu", "imposto da casa"], executa: "Prefeito", legisla: "Vereadores", nivel: "municipio" },
  {
    problema: "Polícia e segurança na rua",
    termos: ["polícia", "segurança", "violência", "assalto", "pm"],
    executa: "Governador",
    legisla: "Deputados estaduais",
    nivel: "estado",
    nota: "As leis penais (o que é crime e qual a pena) são do Congresso Nacional.",
  },
  { problema: "Escola de ensino médio", termos: ["ensino médio", "escola estadual", "colégio"], executa: "Governador", legisla: "Deputados estaduais", nivel: "estado" },
  {
    problema: "Hospital estadual",
    termos: ["hospital", "cirurgia", "pronto-socorro"],
    executa: "Governador",
    legisla: "Deputados estaduais",
    nivel: "estado",
    nota: "Alguns hospitais são da cidade ou federais; confira quem administra.",
  },
  { problema: "IPVA", termos: ["ipva", "imposto do carro"], executa: "Governador", legisla: "Deputados estaduais", nivel: "estado" },
  { problema: "Rodovia estadual", termos: ["estrada", "rodovia estadual"], executa: "Governador", legisla: "Deputados estaduais", nivel: "estado" },
  { problema: "Presídios", termos: ["presídio", "cadeia", "prisão"], executa: "Governador", legisla: "Deputados estaduais", nivel: "estado" },
  {
    problema: "Aposentadoria e INSS",
    termos: ["aposentadoria", "inss", "previdência", "benefício"],
    executa: "Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
  },
  {
    problema: "Bolsa Família e programas sociais federais",
    termos: ["bolsa família", "auxílio", "programa social"],
    executa: "Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
  },
  { problema: "Imposto de renda", termos: ["imposto de renda", "receita federal"], executa: "Presidente", legisla: "Deputados federais e senadores", nivel: "uniao" },
  { problema: "Salário mínimo", termos: ["salário mínimo", "salário"], executa: "Presidente", legisla: "Deputados federais e senadores", nivel: "uniao" },
  {
    problema: "Leis trabalhistas e jornada de trabalho",
    termos: ["trabalho", "clt", "férias", "jornada", "6x1"],
    executa: "Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
  },
  {
    problema: "O que é crime e qual a pena",
    termos: ["crime", "pena", "lei penal", "código penal"],
    executa: "Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
  },
  {
    problema: "Remédio de graça (Farmácia Popular)",
    termos: ["remédio", "medicamento", "farmácia popular"],
    executa: "Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
    nota: "Remédios entregues no posto de saúde dependem também da cidade e do estado.",
  },
  { problema: "Universidade federal", termos: ["universidade", "faculdade federal", "enem"], executa: "Presidente", legisla: "Deputados federais e senadores", nivel: "uniao" },
  { problema: "Rodovia federal (BR)", termos: ["rodovia federal", "estrada federal"], executa: "Presidente", legisla: "Deputados federais e senadores", nivel: "uniao" },
  {
    problema: "Juros e inflação",
    termos: ["juros", "inflação", "preços", "selic"],
    executa: "Banco Central e Presidente",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
    nota: "O Banco Central decide a taxa de juros com autonomia, pela lei.",
  },
  {
    problema: "Preço da gasolina e da luz",
    termos: ["gasolina", "combustível", "conta de luz", "energia"],
    executa: "Presidente e agências federais",
    legisla: "Deputados federais e senadores",
    nivel: "uniao",
    nota: "Parte do preço é imposto estadual (ICMS), decidido também pelos estados.",
  },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Problems matching what someone typed, best matches first. */
export function buscarProblema(q: string): Problema[] {
  const t = semAcento(q.trim());
  if (t.length < 2) return [];
  return PROBLEMAS.map((p) => ({ p, n: [p.problema, ...p.termos].filter((x) => semAcento(x).includes(t) || t.includes(semAcento(x))).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.p);
}
