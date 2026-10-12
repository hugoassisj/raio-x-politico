/**
 * The questions the site exists to answer, in the words people use. One list feeds the home page,
 * the "Sobre" page and the README, so the promise and the product never drift apart.
 */
export interface Pergunta {
  pergunta: string;
  /** Where and how the site answers it, in one sentence */
  resposta: string;
  href: string;
  /** lucide-react icon name, resolved in the interface */
  icone:
    | "MapPin"
    | "CalendarCheck"
    | "Vote"
    | "Scale"
    | "Wallet"
    | "Users"
    | "MessageSquareQuote"
    | "Landmark"
    | "GitCompare"
    | "HandCoins"
    | "FileText"
    | "History"
    | "PiggyBank"
    | "Wrench";
}

export const PERGUNTAS: Pergunta[] = [
  {
    pergunta: "Quem me representa?",
    resposta: "Toque no seu estado no mapa e veja os 3 senadores, os deputados federais e os estaduais, com foto e partido.",
    href: "/#mapa",
    icone: "MapPin",
  },
  {
    pergunta: "O que foi votado e o que muda para mim?",
    resposta: "Cada projeto explicado em palavras simples, com o resultado e o que significava votar Sim ou Não.",
    href: "/votacoes",
    icone: "Vote",
  },
  {
    pergunta: "Quem resolve o problema da minha rua?",
    resposta: "Digite o problema (buraco, polícia, aposentadoria) e veja se é da cidade, do estado ou do país, e quem cobrar.",
    href: "/como-funciona#quem-resolve",
    icone: "Wrench",
  },
  {
    pergunta: "Meu deputado vai trabalhar?",
    resposta: "Cada perfil mostra quantas sessões a pessoa compareceu e em quantas votações registrou voto, comparado com os colegas.",
    href: "/politicos?casa=camara&ordem=presenca&dir=asc",
    icone: "CalendarCheck",
  },
  {
    pergunta: "Quem pagou a campanha?",
    resposta: "No perfil, quanto cada campanha arrecadou, quanto foi dinheiro público, quem mais doou e com quem mais gastou.",
    href: "/politicos",
    icone: "PiggyBank",
  },
  {
    pergunta: "Que cargos já disputou e por quais partidos passou?",
    resposta: "A vida pública de cada pessoa: todas as candidaturas desde 1994, de vereador a senador, com resultado, partido e bens declarados.",
    href: "/politicos",
    icone: "History",
  },
  {
    pergunta: "Como votaram os representantes do meu estado?",
    resposta: "Em toda votação, escolha seu estado uma vez e veja o voto de cada um, com foto.",
    href: "/votacoes",
    icone: "Users",
  },
  {
    pergunta: "Quantos votos uma lei precisa para passar?",
    resposta: "Mudar a Constituição exige 308 deputados; uma lei comum, mais Sim do que Não. Desenhamos cada regra no plenário.",
    href: "/como-funciona#votos",
    icone: "Scale",
  },
  {
    pergunta: "Quanto gastam da verba do mandato, e com o quê?",
    resposta: "Gastos da cota parlamentar mês a mês, por tipo de despesa e por fornecedor, com o link de cada nota fiscal.",
    href: "/gastos",
    icone: "Wallet",
  },
  {
    pergunta: "Meu partido vota com o governo? Vota unido?",
    resposta: "Cada partido no plenário, quantas vezes vota junto com o governo e o quanto seus membros votam iguais.",
    href: "/partidos",
    icone: "Landmark",
  },
  {
    pergunta: "Para onde mandam dinheiro do orçamento?",
    resposta: "As emendas que cada parlamentar indicou para cidades e estados, com valores e destinos.",
    href: "/politicos?casa=camara&ordem=emendas&dir=desc",
    icone: "HandCoins",
  },
  {
    pergunta: "O que andam dizendo?",
    resposta: "Discursos oficiais com busca por tema e link para o registro original.",
    href: "/falas",
    icone: "MessageSquareQuote",
  },
  {
    pergunta: "Como um político se compara com outro?",
    resposta: "Até 4 pessoas lado a lado: presença, votos, gastos, projetos e as votações em que discordaram.",
    href: "/comparar",
    icone: "GitCompare",
  },
];
