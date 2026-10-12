// Shared data contract between the pipeline (writer) and the app (reader).
// Every file in /data follows these shapes. Bump DATA_VERSION on breaking changes.
export const DATA_VERSION = 1;

export type Casa = "camara" | "senado" | "assembleia";

export type Cargo = "Deputado(a) Federal" | "Senador(a)" | "Deputado(a) Estadual" | "Deputado(a) Distrital";

/** Compact metrics, all optional: a missing value means "no data", never zero. */
export interface Metricas {
  /** Plenary attendance, 0..1 */
  presenca?: number;
  /** Number of plenary sessions considered for `presenca` */
  presencaBase?: number;
  /** Share of roll-call votes where a vote was registered, 0..1 */
  participacao?: number;
  /** Number of roll-call votes considered */
  votacoesBase?: number;
  /** Votes following own party orientation / (followed + not followed), 0..1 */
  fidelidade?: number;
  /** "orientacao" when computed against official party orientation, "maioria" when against party majority */
  fidelidadeMetodo?: "orientacao" | "maioria";
  /** Votes following the Government leader orientation, 0..1 (Câmara only) */
  governismo?: number;
  /** Parliamentary quota spending in the last 12 complete months, R$ */
  gasto12m?: number;
  /** Spending in the current calendar year, R$ */
  gastoAno?: number;
  /** Number of automatically flagged expenses */
  alertas?: number;
  /** Bills authored or co-authored (main types) */
  proposicoes?: number;
  /** Bills that became law */
  proposicoesLei?: number;
  /** Special transfers (emendas Pix) planned, R$ */
  emendas?: number;
  /** Total declared assets at last election, R$ */
  patrimonio?: number;
  /** Relative change between the last two declarations, e.g. 0.35 = +35% */
  patrimonioVariacao?: number;
  /** Votes received at the last election */
  votosRecebidos?: number;
}

export interface PoliticoResumo {
  id: string;
  casa: Casa;
  cargo: Cargo;
  nome: string;
  nomeCivil?: string;
  partido: string;
  uf: string;
  foto?: string;
  sexo?: "M" | "F";
  emExercicio: boolean;
  /** First year in an elected office we could find */
  inicioPolitica?: number;
  /** Number of distinct mandates found */
  mandatos?: number;
  /** Result in the 2026 election, when matched */
  eleicao2026?: string;
  /** Number of collected statements (speeches/posts) */
  nFalas?: number;
  m: Metricas;
}

export interface Mandato {
  cargo: string;
  inicio: number;
  fim?: number;
  uf?: string;
  municipio?: string;
  partido?: string;
  fonte: string;
}

export interface VotoItem {
  votacaoId: string;
  data: string;
  titulo: string;
  descricao?: string;
  voto: string;
  orientacaoPartido?: string;
  orientacaoGoverno?: string;
  resultado?: string;
  /** What was opened for voting (see VotacaoResumo.objeto) */
  objeto?: string;
}

export interface Proposicao {
  id: string;
  tipo: string;
  numero?: number;
  ano?: number;
  ementa: string;
  data?: string;
  situacao?: string;
  virouLei?: boolean;
  url?: string;
}

export interface Alerta {
  regra: "documento_invalido" | "refeicao_atipica" | "duplicidade" | "fornecedor_concentrado" | "valor_atipico";
  descricao: string;
  valor: number;
  data?: string;
  fornecedor?: string;
  url?: string;
}

export interface Gastos {
  total12m: number;
  mediaPares12m?: number;
  porMes: { mes: string; valor: number }[];
  porCategoria: { categoria: string; valor: number }[];
  topFornecedores: { nome: string; doc?: string; valor: number; n: number }[];
  alertas: Alerta[];
  recentes: { data?: string; categoria: string; fornecedor: string; valor: number; url?: string }[];
}

export interface EleicaoTSE {
  ano: number;
  cargo: string;
  uf: string;
  partido?: string;
  numero?: string;
  situacao?: string;
  votos?: number;
  patrimonio?: number;
  bens?: { tipo: string; descricao: string; valor: number }[];
  ocupacao?: string;
  instrucao?: string;
}

export interface Emendas {
  total: number;
  porAno: { ano: number; valor: number }[];
  destinos: { nome: string; uf?: string; valor: number }[];
  fonte: string;
}

export interface PoliticoDetalhe extends PoliticoResumo {
  atualizadoEm: string;
  perfil: {
    nascimento?: string;
    naturalidade?: string;
    escolaridade?: string;
    profissoes?: string[];
    email?: string;
    telefone?: string;
    gabinete?: string;
    site?: string;
    redes?: string[];
    paginaOficial?: string;
    /** Original official photo URL; `foto` points to the optimized copy served by the site */
    fotoOficial?: string;
  };
  carreira: Mandato[];
  presenca?: { sessoes: number; presente: number; justificadas?: number; periodo: string };
  votos: VotoItem[];
  proposicoesLista: Proposicao[];
  proposicoesPorTipo: Record<string, number>;
  gastos?: Gastos;
  comissoes: { sigla?: string; nome: string; papel?: string; atual: boolean }[];
  frentes: string[];
  emendas?: Emendas;
  eleicoes: EleicaoTSE[];
  redes: RedeSocial[];
  fontes: { nome: string; url: string }[];
}

export interface VotacaoResumo {
  id: string;
  casa: Casa;
  data: string;
  titulo: string;
  descricao: string;
  resultado?: string;
  sim: number;
  nao: number;
  outros: number;
  orientacaoGoverno?: string;
  /** Secret ballot: only official totals are published; the list of voters shows presence, not the vote */
  secreta?: boolean;
  porPartido: { partido: string; sim: number; nao: number; outros: number }[];
  /** What was opened for voting, as the house describes it (e.g. a request to postpone) */
  objeto?: string;
  /** Key of the bill being voted (see MateriaVotada), e.g. "cam-2351506" */
  materia?: string;
  /** Plain subject areas (see src/lib/assuntos.ts), for filtering */
  assuntos?: string[];
}

/** Official details of a bill that went to a roll call, from the house that voted it. */
export interface MateriaVotada {
  /** "cam-{idProposicao}" or "sen-{codigoMateria}" */
  id: string;
  casa: "camara" | "senado";
  /** e.g. "PEC 5/2023" */
  sigla: string;
  ementa: string;
  /** Câmara: longer official summary */
  ementaDetalhada?: string;
  /** Senado: official plain explanation of the summary */
  explicacao?: string;
  palavrasChave?: string[];
  /** Official subject areas assigned by the house */
  temas?: string[];
  autores?: { nome: string; pid?: string; tipo?: string }[];
  autoresTotal?: number;
  apresentacao?: string;
  situacao?: string;
  /** Official page of the bill */
  url: string;
  /** Full text (PDF) */
  inteiroTeor?: string;
}

/**
 * Plain-language explanation of a bill written by a language model from the official texts only.
 * Every supporting quote must appear verbatim in those texts and every number in the explanation
 * must appear in them too; otherwise the explanation is discarded.
 */
export interface ExplicacaoIA {
  materia: string;
  /** One or two short sentences, direct order, everyday words */
  resumo: string;
  /** What changes in practice, up to 3 items */
  mudancas: string[];
  /** Who is affected, when the texts say so */
  quemAfeta?: string;
  /** Verbatim excerpts of the official texts that support the explanation */
  trechos: string[];
  modelo: string;
  geradoEm: string;
  /** Hash of the official texts used, to regenerate when they change */
  hashFonte: string;
}

export interface VotacaoDetalhe extends VotacaoResumo {
  votos: { pid: string; nome: string; partido: string; uf: string; voto: string }[];
  orientacoes: { sigla: string; orientacao: string }[];
  url?: string;
}

export interface Agregado {
  chave: string;
  n: number;
  medianas: Metricas;
  medias: Metricas;
}

export interface FonteStatus {
  id: string;
  nome: string;
  url: string;
  status: "ok" | "parcial" | "falhou" | "ignorado";
  registros: number;
  duracaoMs: number;
  erro?: string;
}

export interface Meta {
  versao: number;
  geradoEm: string;
  demo: boolean;
  fontes: FonteStatus[];
  totais: Record<string, number>;
  subsidios: { cargo: string; valor: number; fonte: string }[];
}

// ---------------- Speech, social media and AI ----------------

export interface RedeSocial {
  pid: string;
  plataforma: "x" | "instagram" | "tiktok" | "youtube" | "facebook" | "threads" | "bluesky" | "kwai" | "linkedin" | "telegram" | "site";
  url: string;
  handle?: string;
  /** Where we learned about this link (traceability) */
  fonte: string;
  fonteUrl: string;
  /** true once a connector resolved the account through the platform's official API */
  verificado?: boolean;
}

export interface Fala {
  id: string;
  pid: string;
  data: string;
  tipo: "discurso" | "youtube" | "x" | "instagram" | "tiktok" | "facebook" | "entrevista";
  titulo?: string;
  texto: string;
  resumoOficial?: string;
  palavrasChave?: string[];
  /** Canonical public URL where anyone can verify the content */
  url: string;
  midia?: string;
  fonte: string;
}

export interface Citacao {
  /** Fala.id or VotacaoDetalhe.id the claim is grounded on */
  ref: string;
  tipo: "fala" | "voto";
  trecho?: string;
}

export interface ResumoIA {
  pid: string;
  periodo: "dia" | "semana" | "mes" | "trimestre";
  inicio: string;
  fim: string;
  geradoEm: string;
  modelo: string;
  resumo: string;
  temas: { tema: string; posicao: string; citacoes: Citacao[] }[];
  mudancas: { descricao: string; antes: Citacao[]; depois: Citacao[] }[];
  contradicoes: { descricao: string; citacoes: Citacao[] }[];
  /** Inputs hash: the summary is regenerated only when its sources change */
  hash: string;
  nFontes: number;
}

export interface FalasArquivo {
  pid: string;
  falas: Fala[];
}

export interface IAArquivo {
  pid: string;
  resumos: ResumoIA[];
}

/** National spending overview (data/gastos.json) */
export interface GastosGerais {
  periodo: { inicio: string; fim: string };
  porCasa: { casa: Casa; total: number; parlamentares: number; porMes: { mes: string; valor: number }[] }[];
  categorias: { casa: Casa; categoria: string; valor: number }[];
  fornecedores: { nome: string; doc?: string; valor: number; parlamentares: number; n: number }[];
  alertasPorRegra: Record<string, number>;
}
