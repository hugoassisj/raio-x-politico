/**
 * Plain-language layer for legislative jargon. Deterministic and auditable: each rule turns an
 * official phrase into everyday words, and the official text is always shown next to it.
 * Writing follows the Política Nacional de Linguagem Simples (Lei 15.263/2025): short sentences,
 * direct order, active voice, common words.
 */

export interface EtapaSimples {
  /** "conteudo": the vote decided what the law says; "procedimento": only the pace or order of voting */
  tipo: "conteudo" | "procedimento";
  /** Short name of the step, e.g. "Pedido de urgência" */
  titulo: string;
  /** One or two sentences explaining what was decided */
  texto: string;
  /** What a Sim vote meant in this step */
  sim?: string;
  /** What a Não vote meant in this step */
  nao?: string;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Regra {
  padrao: RegExp;
  etapa: EtapaSimples;
}

/** Ordered from the most specific to the most general; the first match wins. */
const REGRAS: Regra[] = [
  {
    padrao: /requerimento de urgencia|regime de urgencia|solicita urgencia/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido de urgência",
      texto: "Pedido para acelerar o projeto. Com urgência, ele pode ser votado direto no Plenário, sem esperar as comissões.",
      sim: "Votar Sim era a favor de acelerar o projeto.",
      nao: "Votar Não era contra acelerar o projeto.",
    },
  },
  {
    padrao: /retirada de pauta|retirar de pauta/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido para tirar da pauta",
      texto: "Pedido para não votar o projeto neste dia.",
      sim: "Votar Sim era a favor de tirar o projeto da pauta.",
      nao: "Votar Não era a favor de continuar com a votação.",
    },
  },
  {
    padrao: /adiamento/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido de adiamento",
      texto: "Pedido para adiar a discussão ou a votação do projeto para outro dia.",
      sim: "Votar Sim era a favor de adiar.",
      nao: "Votar Não era a favor de seguir agora.",
    },
  },
  {
    padrao: /encerramento da discussao|encerrar a discussao/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido para encerrar o debate",
      texto: "Pedido para parar a discussão e passar logo para a votação.",
      sim: "Votar Sim era a favor de encerrar o debate.",
      nao: "Votar Não era a favor de continuar debatendo.",
    },
  },
  {
    padrao: /calendario especial/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido de calendário especial",
      texto: "Pedido para encurtar os prazos de uma mudança na Constituição, que normalmente exige várias sessões de debate.",
      sim: "Votar Sim era a favor de acelerar a tramitação.",
      nao: "Votar Não era a favor de seguir os prazos normais.",
    },
  },
  {
    padrao: /requerimento de votacao|votacao por partes|votacao em globo|metodo de votacao/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido sobre a forma de votar",
      texto: "Pedido sobre como a votação seria feita, por exemplo por partes ou com o nome de cada um registrado.",
      sim: "Votar Sim era a favor do pedido.",
      nao: "Votar Não era contra o pedido.",
    },
  },
  {
    padrao: /preferencia/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido de preferência",
      texto: "Pedido para votar primeiro uma versão do texto em vez de outra. A versão escolhida passa na frente.",
      sim: "Votar Sim era a favor de votar aquela versão primeiro.",
      nao: "Votar Não era contra mudar a ordem.",
    },
  },
  {
    padrao: /\brecurso\b/,
    etapa: {
      tipo: "procedimento",
      titulo: "Recurso ao Plenário",
      texto: "Pedido para que todos os deputados revejam uma decisão tomada antes por uma comissão ou pela Mesa.",
      sim: "Votar Sim era a favor de rever a decisão.",
      nao: "Votar Não era a favor de manter a decisão.",
    },
  },
  {
    padrao: /requerimento/,
    etapa: {
      tipo: "procedimento",
      titulo: "Pedido durante a votação",
      texto: "Votação de um pedido (requerimento) sobre o andamento do projeto. Esses pedidos decidem o ritmo ou a ordem da votação, não o que a lei diz.",
      sim: "Votar Sim era a favor do pedido.",
      nao: "Votar Não era contra o pedido.",
    },
  },

  {
    padrao: /emenda.*, destacada/,
    etapa: {
      tipo: "conteudo",
      titulo: "Proposta de mudança votada em separado",
      texto: "Votação, em separado, de uma mudança no texto (emenda) pedida por um partido ou parlamentar.",
      sim: "Votar Sim era a favor da mudança.",
      nao: "Votar Não era contra a mudança.",
    },
  },
  {
    padrao: /mantido o texto|suprimido o texto|\bdvs\b|destaque para votacao em separado|(?<!emenda.*), destacad[oa]\b/,
    etapa: {
      tipo: "conteudo",
      titulo: "Votação de um trecho separado",
      texto: "Um partido pediu para votar um trecho sozinho, para tentar tirá-lo do texto. O resto do projeto já tinha sido decidido.",
      sim: "Votar Sim era manter o trecho no texto.",
      nao: "Votar Não era tirar o trecho do texto.",
    },
  },
  {
    padrao: /primeiro turno|1º turno/,
    etapa: {
      tipo: "conteudo",
      titulo: "Primeira votação da mudança na Constituição",
      texto: "Mudanças na Constituição passam por duas votações em cada casa. Esta foi a primeira.",
      sim: "Votar Sim era a favor da mudança na Constituição.",
      nao: "Votar Não era contra a mudança na Constituição.",
    },
  },
  {
    padrao: /segundo turno|2º turno/,
    etapa: {
      tipo: "conteudo",
      titulo: "Segunda votação da mudança na Constituição",
      texto: "Mudanças na Constituição passam por duas votações em cada casa. Esta foi a segunda e última nesta casa.",
      sim: "Votar Sim era a favor da mudança na Constituição.",
      nao: "Votar Não era contra a mudança na Constituição.",
    },
  },
  {
    padrao: /emenda aglutinativa/,
    etapa: {
      tipo: "conteudo",
      titulo: "Nova versão que junta propostas",
      texto: "Votação de uma versão do texto que junta várias propostas de mudança em uma só.",
      sim: "Votar Sim era a favor dessa versão.",
      nao: "Votar Não era contra essa versão.",
    },
  },
  {
    padrao: /subemenda substitutiva|substitutivo/,
    etapa: {
      tipo: "conteudo",
      titulo: "Nova versão do relator",
      texto: "Votação do texto principal na versão escrita pelo relator, que substitui a proposta original.",
      sim: "Votar Sim era a favor dessa versão do projeto.",
      nao: "Votar Não era contra essa versão do projeto.",
    },
  },
  {
    padrao: /emenda de redacao|redacao final/,
    etapa: {
      tipo: "conteudo",
      titulo: "Ajuste final da redação",
      texto: "Votação da versão final do texto, com ajustes de escrita. O conteúdo já tinha sido decidido.",
      sim: "Votar Sim era aprovar a redação final.",
      nao: "Votar Não era rejeitar a redação final.",
    },
  },
  {
    padrao: /(?<!proposta de )\bemendas?\b(?! a constituicao)/,
    etapa: {
      tipo: "conteudo",
      titulo: "Proposta de mudança no texto",
      texto: "Votação de uma mudança no texto (emenda), proposta por um parlamentar ou partido.",
      sim: "Votar Sim era a favor da mudança.",
      nao: "Votar Não era contra a mudança.",
    },
  },

  {
    padrao: /sustacao/,
    etapa: {
      tipo: "conteudo",
      titulo: "Pedido para suspender um processo contra parlamentar",
      texto: "A Constituição permite que a casa suspenda um processo criminal contra um de seus membros. Os deputados votaram o parecer da comissão sobre esse pedido.",
      sim: "Votar Sim era a favor do parecer da comissão.",
      nao: "Votar Não era contra o parecer da comissão.",
    },
  },
  {
    padrao: /parecer .*representacao|representacao .*parecer/,
    etapa: {
      tipo: "conteudo",
      titulo: "Caso sobre a conduta de um parlamentar",
      texto: "Votação do parecer de uma comissão sobre uma acusação contra um parlamentar.",
      sim: "Votar Sim era a favor do parecer da comissão.",
      nao: "Votar Não era contra o parecer da comissão.",
    },
  },
  {
    padrao: /mensagem n|oficio n|indicacao d[oa] senhor|submete a apreciacao do senado federal/,
    etapa: {
      tipo: "conteudo",
      titulo: "Aprovação de uma indicação para cargo",
      texto:
        "Algumas pessoas só assumem cargos (embaixadores, ministros de tribunais, diretores de agências) se o Senado aprovar. Os senadores votaram se aprovam a pessoa indicada.",
      sim: "Votar Sim era aprovar a pessoa indicada.",
      nao: "Votar Não era rejeitar a pessoa indicada.",
    },
  },
  {
    padrao: /aprovad[oa] o projeto|rejeitad[oa] o projeto|votacao nominal d[oa] (projeto|proposta)|nos termos do parecer|aprovad[oa] a proposta|aprovada a medida/,
    etapa: {
      tipo: "conteudo",
      titulo: "Votação do texto principal",
      texto: "Votação do projeto em si: se ele segue adiante ou não.",
      sim: "Votar Sim era a favor do projeto.",
      nao: "Votar Não era contra o projeto.",
    },
  },
];

const RESSALVA = /ressalvad[oa]s? (o|os|a|as) destaques?/;

/**
 * Explains a voting step in plain words. Uses what was opened for voting when the house provides
 * it (more specific), then the result text. Returns undefined when no rule applies, so the
 * interface shows only the official text instead of guessing.
 */
export function explicarEtapa(procedimento: string, objeto?: string): EtapaSimples | undefined {
  const textos = [objeto, procedimento].filter((t): t is string => !!t).map(semAcento);
  for (const t of textos) {
    const r = REGRAS.find((x) => x.padrao.test(t));
    if (!r) continue;
    if (RESSALVA.test(t) && r.etapa.tipo === "conteudo") return { ...r.etapa, texto: `${r.etapa.texto} Trechos destacados ficaram para ser votados depois, um por um.` };
    return r.etapa;
  }
  return undefined;
}

/** Glossary of terms people meet on vote and profile pages, in everyday words. */
export const GLOSSARIO: { termo: string; padrao: RegExp; explicacao: string }[] = [
  // Longer, more specific terms first: the first matching pattern wins in running text
  {
    termo: "Emenda parlamentar",
    padrao: /emendas? parlamentar(es)?|emendas? pix/i,
    explicacao: "Dinheiro do orçamento federal que cada parlamentar pode indicar para obras e serviços em cidades e estados.",
  },
  {
    termo: "Cota parlamentar",
    padrao: /cota parlamentar|\bCEAPS?\b/,
    explicacao: "Verba mensal para despesas do mandato, como passagens e escritório. É reembolsada mediante nota fiscal.",
  },
  { termo: "Maioria absoluta", padrao: /maioria absoluta/i, explicacao: "Mais da metade de todos os membros da casa: 257 deputados ou 41 senadores, contando quem faltou." },
  { termo: "Maioria simples", padrao: /maioria simples/i, explicacao: "Mais votos Sim do que Não entre os que votaram, desde que pelo menos metade dos membros esteja presente." },
  {
    termo: "Votação nominal",
    padrao: /votação nominal/i,
    explicacao: "Votação em que cada parlamentar registra Sim, Não ou Abstenção no painel, e o voto fica público com o nome.",
  },
  { termo: "Votação simbólica", padrao: /votação simbólica/i, explicacao: "Votação rápida em que quem concorda permanece como está. Não registra o voto de cada um." },
  { termo: "PEC", padrao: /\bPEC\b|Proposta de Emenda à Constituição/, explicacao: "Proposta de Emenda à Constituição: muda a Constituição, a lei mais importante do país." },
  {
    termo: "PLP",
    padrao: /\bPLP\b|Projeto de Lei Complementar/,
    explicacao: "Projeto de Lei Complementar: detalha regras que a Constituição manda organizar por lei. Precisa da maioria de todos os membros.",
  },
  {
    termo: "PDL",
    padrao: /\bPDL\b|Projeto de Decreto Legislativo/,
    explicacao: "Projeto de Decreto Legislativo: decisão que só o Congresso toma, como aprovar acordos com outros países.",
  },
  {
    termo: "Medida provisória",
    padrao: /medida provisória|\bMPV?\b/i,
    explicacao: "Decisão do Presidente que já vale como lei, mas precisa ser confirmada pelo Congresso em até 120 dias.",
  },
  { termo: "Ementa", padrao: /\bementa\b/i, explicacao: "Resumo oficial do que o projeto propõe." },
  { termo: "Substitutivo", padrao: /substitutivo/i, explicacao: "Nova versão do projeto, escrita pelo relator, que substitui o texto original." },
  { termo: "Relator", padrao: /\brelator[a]?\b/i, explicacao: "Parlamentar escolhido para estudar o projeto, ouvir as partes e propor o texto final." },
  { termo: "Emenda", padrao: /\bemendas?\b/i, explicacao: "Proposta de mudança em um trecho do projeto." },
  { termo: "Destaque", padrao: /\bdestaques?\b|destacad[oa]/i, explicacao: "Pedido para votar um trecho separadamente, para tentar tirá-lo ou mudá-lo." },
  { termo: "Urgência", padrao: /urgência/i, explicacao: "Regime que acelera o projeto: ele pode ir direto ao Plenário, sem esperar as comissões." },
  { termo: "Turno", padrao: /\bturnos?\b/i, explicacao: "Cada rodada de votação. Mudanças na Constituição precisam de dois turnos em cada casa." },
  { termo: "Quórum", padrao: /quórum/i, explicacao: "Número mínimo de parlamentares presentes ou de votos para que uma decisão valha." },
  {
    termo: "Obstrução",
    padrao: /obstrução/i,
    explicacao: "Forma de protesto: o parlamentar está presente, mas não vota, para tentar impedir que a votação atinja o número mínimo.",
  },
  { termo: "Abstenção", padrao: /abstenção/i, explicacao: "O parlamentar registra presença, mas não vota nem a favor nem contra." },
  { termo: "Orientação", padrao: /orientação|orientou/i, explicacao: "Voto que a liderança do partido ou do governo pede aos seus parlamentares." },
  { termo: "Redação final", padrao: /redação final/i, explicacao: "Última versão do texto, com ajustes de escrita, antes de seguir para a outra casa ou para o Presidente." },
  { termo: "Sanção", padrao: /\bsanção\b|sancionad[oa]/i, explicacao: "Quando o Presidente aprova a lei votada pelo Congresso e ela passa a valer." },
  { termo: "Veto", padrao: /\bvetos?\b|vetad[oa]/i, explicacao: "Quando o Presidente recusa a lei, toda ou em parte. O Congresso pode derrubar o veto." },
  { termo: "Plenário", padrao: /plenário/i, explicacao: "O salão onde todos os parlamentares de uma casa se reúnem para votar. Também é o nome dessa reunião." },
  { termo: "Comissão", padrao: /\bcomiss(ão|ões)\b/i, explicacao: "Grupo menor de parlamentares que estuda os projetos de um tema antes do Plenário." },
  { termo: "Mesa", padrao: /\bMesa\b/, explicacao: "Grupo que dirige os trabalhos da casa, liderado pelo presidente da Câmara ou do Senado." },
  { termo: "Requerimento", padrao: /requerimento/i, explicacao: "Pedido formal feito durante os trabalhos, por exemplo para adiar ou acelerar uma votação." },
  { termo: "Lei complementar", padrao: /lei complementar/i, explicacao: "Lei que detalha regras previstas na Constituição. Precisa da maioria de todos os membros para passar." },
  { termo: "Imunidade tributária", padrao: /imunidade tributária/i, explicacao: "Quando a Constituição proíbe cobrar certos impostos de algumas pessoas ou instituições." },
];

/** Expense categories of the parliamentary quota, in everyday words. */
const CATEGORIAS: [RegExp, string][] = [
  [/locomocao/, "Viagens: transporte, hotel, refeições e combustível."],
  [/divulga/, "Propaganda do mandato: anúncios, impressos, sites e redes sociais."],
  [/fretamento de aeronaves/, "Aluguel de avião ou helicóptero."],
  [/(locacao|fretamento) de veiculos|aluguel de veiculos/, "Aluguel de carro."],
  [/escritorio|imoveis|locacao de bens imoveis/, "Aluguel e contas do escritório político no estado."],
  [/combustive/, "Gasolina e outros combustíveis."],
  [/passage/, "Passagens de avião, ônibus ou barco."],
  [/hospedagem/, "Hotel durante viagens a trabalho."],
  [/alimentacao/, "Refeições durante o trabalho."],
  [/telefon/, "Contas de telefone e internet."],
  [/postais|correio/, "Envio de cartas e encomendas pelos Correios."],
  [/consultori|assessori|pesquisas|trabalhos tecnicos/, "Contratação de consultorias, pesquisas e serviços técnicos."],
  [/seguranca/, "Serviço de segurança."],
  [/graficos|copias|reproducao/, "Impressão e cópias de documentos."],
  [/assinatura|publicacoes/, "Assinaturas de jornais, revistas e serviços de informação."],
  [/curso|palestra|evento/, "Cursos, palestras e eventos."],
];

export function explicarCategoria(categoria: string): string | undefined {
  const t = semAcento(categoria);
  return CATEGORIAS.find(([re]) => re.test(t))?.[1];
}

/** Cuts a text at a word boundary, adding an ellipsis when shortened. */
export function encurtar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), max * 0.6)).replace(/[\s,;:.]+$/, "")}…`;
}
