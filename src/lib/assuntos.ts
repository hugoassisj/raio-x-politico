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
  /**
   * Words looked for in the official themes and, when there is none, in the summary (lowercase,
   * without accents). A word ending in "…" matches anything that starts with it ("educac…" matches
   * educação and educacional); the others must appear as whole words. This list is also the
   * published criterion, so the rule and its explanation are the same thing.
   */
  termos: string[];
}

const A = (id: string, nome: string, icone: string, termos: string[]): Assunto => ({ id, nome, icone, termos });

export const ASSUNTOS: Assunto[] = [
  A("saude", "Saúde", "HeartPulse", ["saude", "sus", "hospita…", "medicament…", "vacina…", "doenca…", "medico", "medicos", "medica", "medicas", "sanitari…"]),
  A("educacao", "Educação", "GraduationCap", ["educac…", "escola…", "ensino…", "universidad…", "professor…", "estudant…", "creche…"]),
  A("impostos", "Impostos e dinheiro público", "Landmark", [
    "tribut…",
    "imposto…",
    "financas publicas",
    "orcament…",
    "fiscal…",
    "empenho…",
    "icms",
    "ipi",
    "contribuicao social",
    "contribuicoes sociais",
    "divida publica",
    "precatori…",
  ]),
  A("economia", "Economia e empresas", "Store", [
    "economia…",
    "industria…",
    "comercio…",
    "empresa…",
    "credito…",
    "bancari…",
    "consumidor…",
    "mercado…",
    "microempreend…",
    "servico",
    "servicos",
  ]),
  A("trabalho", "Trabalho e aposentadoria", "Briefcase", [
    "trabalh…",
    "emprego…",
    "salari…",
    "previdenc…",
    "aposentad…",
    "assistencia social",
    "beneficio de prestacao…",
    "bolsa familia",
    "seguro-desemprego",
  ]),
  A("seguranca", "Segurança e justiça", "Shield", [
    "seguranca publica",
    "penal…",
    "crime…",
    "criminal…",
    "policia…",
    "prisao…",
    "prisional…",
    "violencia…",
    "arma",
    "armas",
    "defesa e seguranca",
    "direito e justica",
    "processual…",
  ]),
  A("ambiente", "Meio ambiente e energia", "Leaf", [
    "meio ambiente",
    "ambiental…",
    "clima…",
    "florest…",
    "energia…",
    "recursos hidricos",
    "mineracao…",
    "minerais…",
    "sustentavel…",
    "saneamento…",
    "combustive…",
  ]),
  A("campo", "Campo e agricultura", "Wheat", ["agricult…", "pecuari…", "pesca…", "rural…", "agropecu…", "estrutura fundiaria", "agrari…"]),
  A("cidades", "Cidades e transporte", "Bus", [
    "cidades",
    "urban…",
    "transporte…",
    "transito…",
    "mobilidade…",
    "viacao…",
    "rodovi…",
    "ferrovi…",
    "aeroport…",
    "porto",
    "portos",
    "habitac…",
    "moradia…",
    "marinha mercante",
  ]),
  A("direitos", "Direitos e família", "Users", [
    "direitos humanos",
    "minorias…",
    "mulher…",
    "crianca…",
    "adolescente…",
    "idos…",
    "deficiencia…",
    "familia…",
    "indigena…",
    "igualdade…",
    "racial…",
    "violencia domestica",
  ]),
  A("governo", "Política e governo", "Building2", [
    "politica, partidos",
    "eleic…",
    "eleitora…",
    "partido…",
    "administracao publica",
    "servidor…",
    "processo legislativo",
    "direito constitucional",
    "ministro…",
    "tribunal de contas",
    "atuacao parlamentar",
  ]),
  A("tecnologia", "Tecnologia e comunicação", "Cpu", [
    "tecnolog…",
    "ciencia…",
    "inovac…",
    "comunicac…",
    "internet…",
    "digital…",
    "telecomunic…",
    "dados pessoais",
    "inteligencia artificial",
    "radiodifus…",
  ]),
  A("cultura", "Cultura, esporte e homenagens", "Music", ["cultura…", "arte…", "esporte…", "turismo…", "homenage…", "datas comemorativas", "religi…", "denomina…"]),
  A("exterior", "Outros países", "Globe", [
    "relacoes internacionais",
    "comercio exterior",
    "acordo entre",
    "tratado…",
    "convencao…",
    "republica de",
    "republica da",
    "republica do",
    "republica federal",
  ]),
];

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Regular expression built from the word list (see `termos`). */
function padrao(a: Assunto): RegExp {
  const partes = a.termos.map((t) => (t.endsWith("…") ? `\\b${escapar(t.slice(0, -1))}` : `\\b${escapar(t)}\\b`));
  return new RegExp(partes.join("|"));
}
const PADROES = new Map(ASSUNTOS.map((a) => [a.id, padrao(a)]));

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Up to two subject areas for a bill. Official themes decide first; the summary is used only when
 * the house assigned no theme.
 */
export function classificarAssuntos(temas: string[] | undefined, ementa: string): string[] {
  const achar = (texto: string) => ASSUNTOS.filter((a) => PADROES.get(a.id)!.test(semAcento(texto))).map((a) => a.id);
  const porTema = [...new Set((temas ?? []).flatMap(achar))];
  const ids = porTema.length ? porTema : achar(ementa);
  return ids.slice(0, 2);
}

export const assunto = (id: string) => ASSUNTOS.find((a) => a.id === id);
