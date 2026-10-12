/**
 * Plain subject areas used to group votes ("o que votaram sobre saúde?"). The houses assign official
 * themes to each bill; this maps them, and the bill summary when there is no theme, to a short list
 * people recognise. Shared by the pipeline (classification) and the app (filters and labels).
 */
export interface Assunto {
  id: string;
  nome: string;
  /** lucide-react icon name, resolved in the interface */
  icone: string;
  /** Matches official themes and summaries (accent-insensitive, lowercase input) */
  padrao: RegExp;
}

export const ASSUNTOS: Assunto[] = [
  { id: "saude", nome: "Saúde", icone: "HeartPulse", padrao: /saude|\bsus\b|hospita|medicament|vacina|doenca|medic[oa]s?\b|sanitari/ },
  { id: "educacao", nome: "Educação", icone: "GraduationCap", padrao: /educac|escola|ensino|universidad|professor|estudant|creche/ },
  {
    id: "impostos",
    nome: "Impostos e dinheiro público",
    icone: "Landmark",
    padrao: /tribut|imposto|financas publicas|orcament|fiscal|empenho|\bicms\b|\bipi\b|imposto de renda|contribuic(ao|oes) social|divida publica|precatori/,
  },
  { id: "economia", nome: "Economia e empresas", icone: "Store", padrao: /economia|industria|comercio|empresa|credito|bancari|consumidor|mercado|microempreend|servicos?\b/ },
  {
    id: "trabalho",
    nome: "Trabalho e aposentadoria",
    icone: "Briefcase",
    padrao: /trabalh|emprego|salari|previdenc|aposentad|assistencia social|beneficio de prestacao|bolsa familia|seguro-desemprego/,
  },
  {
    id: "seguranca",
    nome: "Segurança e justiça",
    icone: "Shield",
    padrao: /seguranca publica|penal|crime|criminal|policia|prisao|prisional|violencia|armas?\b|defesa e seguranca|direito e justica|processual/,
  },
  {
    id: "ambiente",
    nome: "Meio ambiente e energia",
    icone: "Leaf",
    padrao: /meio ambiente|ambiental|clima|florest|energia|recursos hidricos|mineracao|minerais|sustentavel|saneamento|combustive/,
  },
  { id: "campo", nome: "Campo e agricultura", icone: "Wheat", padrao: /agricult|pecuari|pesca|rural|agropecu|estrutura fundiaria|agrari/ },
  {
    id: "cidades",
    nome: "Cidades e transporte",
    icone: "Bus",
    padrao: /cidades|urban|transporte|transito|mobilidade|viacao|rodovi|ferrovi|aeroport|portos?\b|habitac|moradia|marinha mercante/,
  },
  {
    id: "direitos",
    nome: "Direitos e família",
    icone: "Users",
    padrao: /direitos humanos|minorias|mulher|crianca|adolescente|idos|deficiencia|familia|indigena|igualdade|racial|violencia domestica/,
  },
  {
    id: "governo",
    nome: "Política e governo",
    icone: "Building2",
    padrao: /politica, partidos|eleic|eleitora|partido|administracao publica|servidor|processo legislativo|direito constitucional|ministro|tribunal de contas|atuacao parlamentar/,
  },
  {
    id: "tecnologia",
    nome: "Tecnologia e comunicação",
    icone: "Cpu",
    padrao: /tecnolog|ciencia|inovac|comunicac|internet|digital|telecomunic|dados pessoais|inteligencia artificial|radiodifus/,
  },
  { id: "cultura", nome: "Cultura, esporte e homenagens", icone: "Music", padrao: /cultura|\barte|esporte|turismo|homenage|datas comemorativas|religi|denomina/ },
  { id: "exterior", nome: "Outros países", icone: "Globe", padrao: /relacoes internacionais|comercio exterior|acordo entre|tratado|convencao|republica (de|da|do|federal)/ },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Up to two subject areas for a bill. Official themes decide first; the summary is used only when
 * the house assigned no theme.
 */
export function classificarAssuntos(temas: string[] | undefined, ementa: string): string[] {
  const achar = (texto: string) => ASSUNTOS.filter((a) => a.padrao.test(semAcento(texto))).map((a) => a.id);
  const porTema = [...new Set((temas ?? []).flatMap(achar))];
  const ids = porTema.length ? porTema : achar(ementa);
  return ids.slice(0, 2);
}

export const assunto = (id: string) => ASSUNTOS.find((a) => a.id === id);
