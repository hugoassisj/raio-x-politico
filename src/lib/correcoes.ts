/**
 * Public log of corrections to what the site published. Every fix to data or to a rule that
 * changed what people saw goes here, newest first, written in plain words. Kept by hand in the
 * code, so each entry also has its history in the repository.
 */
export interface Correcao {
  data: string;
  /** What was wrong, as someone reading the site would have seen it */
  erro: string;
  /** What changed */
  correcao: string;
  /** Pages or data affected */
  onde: string;
}

export const CORRECOES: Correcao[] = [
  {
    data: "2026-10-12",
    erro: "A página da Presidência dizia que as candidaturas a Presidente ainda não tinham sido coletadas, em todas as eleições desde 1994, e nenhuma empresa aparecia ligada a campanhas.",
    correcao:
      "O arquivo nacional do TSE deixa números sem aspas (os arquivos por estado põem aspas em tudo), e o leitor deslocava todas as colunas. O leitor passou a respeitar as aspas campo a campo; a próxima coleta publica as candidaturas e as contas.",
    onde: "Presidência, Eleições, Empresas (ligações com campanhas), Dinheiro das campanhas nos perfis",
  },
  {
    data: "2026-10-12",
    erro: "Fornecedores pessoas físicas pagos com a cota parlamentar apareciam com o CPF, como vem no arquivo oficial.",
    correcao: "Só CNPJ válido é publicado. CPF de pessoa nunca aparece, nem dentro do nome de microempreendedor.",
    onde: "Perfis (gastos), página de gastos, alertas de dígito inválido",
  },
  {
    data: "2026-10-12",
    erro: "No plenário de cada votação, licenças, missões oficiais e quem presidia a sessão eram contados como “abstenção ou obstrução”.",
    correcao: "Cada código oficial de voto passou a ter um grupo próprio (ausência registrada, outro registro, sem voto registrado), o mesmo em totais, lista e plenário.",
    onde: "Páginas de votação",
  },
  {
    data: "2026-10-12",
    erro: "Quem estava no cargo hoje mas não na data da votação aparecia como “não votou” (546 pessoas numa casa de 513).",
    correcao: "“Sem voto registrado” só lista quem a própria Câmara registra como em exercício no dia. No Senado, a lista oficial já traz todos.",
    onde: "Páginas de votação, plenário",
  },
  {
    data: "2026-10-12",
    erro: "16 de 212 projetos votados estavam em assuntos errados, por exemplo “agricultura” contado como “cultura” e “partidos” como “direitos”.",
    correcao: "Os assuntos passaram a ser listas de palavras inteiras, publicadas em Como funciona.",
    onde: "Votações por assunto",
  },
  {
    data: "2026-10-12",
    erro: "Quando dois políticos tinham o mesmo nome, as emendas publicadas com esse nome podiam ser mostradas para os dois.",
    correcao: "Autor de emenda com nome igual ao de duas pessoas não é ligado a nenhuma.",
    onde: "Emendas no perfil e por cidade",
  },
  {
    data: "2026-10-12",
    erro: "Um deputado estadual do Acre, listado duas vezes pelo sistema da assembleia, aparecia duas vezes no site.",
    correcao: "Cada pessoa aparece uma única vez; a verificação antes de publicar bloqueia repetições.",
    onde: "Lista de deputados estaduais",
  },
];
