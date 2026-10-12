/**
 * Generates a FICTIONAL dataset in ./data-demo for local UI development when the official
 * APIs are unreachable. It runs the same build and publish code as the real pipeline.
 * Every name is invented and meta.demo = true makes the app show a "demonstration data" banner.
 * This output is git-ignored and must never be published.
 *
 *   npm run demo && DATA_DIR=data-demo npm run dev
 */
import path from "node:path";
import type { Fala, VotacaoDetalhe } from "../src/lib/types";
import { montar, publicar } from "./build";
import { montarPresidencia } from "./presidencia";
import { montarEmpresas } from "./empresas";
import type { CandidatoTSE, Despesa, EmendaAgg, PoliticoParcial, Sessao } from "./model";
import { UFS, addDays, ymd } from "./lib/util";

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);

const NOMES_F = [
  "Ana",
  "Beatriz",
  "Camila",
  "Daniela",
  "Elisa",
  "Fernanda",
  "Gabriela",
  "Helena",
  "Isadora",
  "Júlia",
  "Larissa",
  "Marina",
  "Natália",
  "Paula",
  "Renata",
  "Simone",
  "Tânia",
  "Vera",
];
const NOMES_M = [
  "André",
  "Bruno",
  "Carlos",
  "Diego",
  "Eduardo",
  "Fábio",
  "Gustavo",
  "Henrique",
  "Igor",
  "João",
  "Leonardo",
  "Marcos",
  "Otávio",
  "Paulo",
  "Rafael",
  "Sérgio",
  "Tiago",
  "Vinícius",
];
const SOBRENOMES = [
  "Albuquerque",
  "Barros",
  "Cardoso",
  "Duarte",
  "Esteves",
  "Falcão",
  "Guimarães",
  "Holanda",
  "Igarashi",
  "Junqueira",
  "Lacerda",
  "Macedo",
  "Nogueira",
  "Orsini",
  "Pacheco",
  "Queiroz",
  "Rezende",
  "Sampaio",
  "Toledo",
  "Uchôa",
  "Vasconcelos",
  "Xavier",
];
const PARTIDOS = ["PL", "PT", "UNIÃO", "PP", "MDB", "PSD", "REPUBLICANOS", "PDT", "PSB", "PSDB", "PSOL", "PODE", "AVANTE", "NOVO", "PCdoB", "PV", "CIDADANIA", "SOLIDARIEDADE"];
const CATEGORIAS = [
  "Divulgação da atividade parlamentar",
  "Combustíveis e lubrificantes",
  "Passagem aérea - reembolso",
  "Locação ou fretamento de veículos automotores",
  "Manutenção de escritório de apoio",
  "Fornecimento de alimentação do parlamentar",
  "Consultorias, pesquisas e trabalhos técnicos",
  "Telefonia",
  "Hospedagem",
];
const TEMAS = [
  ["reforma tributária", "a simplificação de impostos para pequenas empresas"],
  ["segurança pública", "o aumento do efetivo policial nos municípios"],
  ["saúde", "a ampliação de leitos no SUS"],
  ["educação", "o piso salarial dos professores"],
  ["meio ambiente", "o combate ao desmatamento ilegal"],
  ["agronegócio", "o crédito rural para agricultura familiar"],
];

function pessoa(i: number) {
  const f = rnd() < 0.2;
  return { nome: `${pick(f ? NOMES_F : NOMES_M)} ${pick(SOBRENOMES)}`, sexo: f ? ("F" as const) : ("M" as const), i };
}

export function gerarDemo(saida = path.resolve("data-demo"), hoje = new Date()) {
  seed = 42;
  const politicos: PoliticoParcial[] = [];
  const tse: CandidatoTSE[] = [];

  const add = (casa: PoliticoParcial["casa"], n: number) => {
    for (let i = 0; i < n; i++) {
      const p = pessoa(i);
      const uf = pick(UFS);
      const partido = pick(PARTIDOS);
      const prefixo = casa === "camara" ? "dep" : casa === "senado" ? "sen" : `est-${uf.toLowerCase()}`;
      const id = `${prefixo}-${9000 + politicos.length}`;
      const nasc = `${Math.floor(between(1950, 1992))}-0${Math.floor(between(1, 9))}-1${Math.floor(between(0, 9))}`;
      const inicio = Math.floor(between(1990, 2023));
      politicos.push({
        id,
        casa,
        cargo: casa === "camara" ? "Deputado(a) Federal" : casa === "senado" ? "Senador(a)" : uf === "DF" ? "Deputado(a) Distrital" : "Deputado(a) Estadual",
        nome: p.nome,
        nomeCivil: `${p.nome} ${pick(SOBRENOMES)}`,
        partido,
        uf,
        sexo: p.sexo,
        emExercicio: true,
        perfil: {
          nascimento: nasc,
          escolaridade: pick(["Superior completo", "Pós-graduação", "Ensino médio"]),
          profissoes: [pick(["Advogado(a)", "Médico(a)", "Empresário(a)", "Professor(a)", "Engenheiro(a)", "Policial"])],
          redes: [`https://instagram.com/${p.nome.toLowerCase().replace(/\W/g, "")}`, `https://www.youtube.com/@${p.nome.toLowerCase().replace(/\W/g, "")}`],
        },
        carreira: [
          ...(inicio < 2015 ? [{ cargo: "Vereador(a)", inicio, fim: inicio + 4, uf, fonte: "Demonstração" }] : []),
          { cargo: casa === "senado" ? "Senador(a)" : "Deputado(a)", inicio: 2023, fim: 2027, uf, fonte: "Demonstração" },
        ],
        comissoes: [
          { sigla: "CCJ", nome: "Comissão de Constituição e Justiça", papel: pick(["Titular", "Suplente", "Presidente"]), atual: true },
          { sigla: "CFT", nome: "Comissão de Finanças e Tributação", papel: "Suplente", atual: true },
        ],
        frentes: ["Frente Parlamentar da Saúde", "Frente Parlamentar do Empreendedorismo"].slice(0, Math.floor(between(0, 3))),
        proposicoesTotal: Math.floor(between(0, 120)),
        proposicoesLei: Math.floor(between(0, 4)),
        proposicoesPorTipo: { PL: Math.floor(between(0, 90)), PEC: Math.floor(between(0, 4)), PLP: Math.floor(between(0, 8)) },
        proposicoesLista: Array.from({ length: 8 }, (_, k) => ({
          id: `${id}-p${k}`,
          tipo: pick(["PL", "PL", "PL", "PLP", "PEC"]),
          numero: Math.floor(between(100, 5000)),
          ano: pick([2024, 2025, 2026]),
          ementa: `Dispõe sobre ${pick(TEMAS)[1]} e dá outras providências.`,
          data: ymd(addDays(hoje, -Math.floor(between(10, 700)))),
          situacao: pick(["Aguardando parecer do relator", "Em tramitação na comissão", "Arquivada", "Transformado em norma jurídica"]),
          url: "https://www.camara.leg.br",
        })),
        fontes: [{ nome: "Dados fictícios de demonstração", url: "https://github.com/hugoassisj/raio-x-politico" }],
      });
      for (const ano of [2018, 2022, 2026])
        tse.push({
          ano,
          sq: `${id}-${ano}`,
          nome: `${p.nome} ${pick(SOBRENOMES)}`.toUpperCase(),
          nomeUrna: p.nome.toUpperCase(),
          nascimento: nasc,
          uf,
          cargo: casa === "senado" ? "SENADOR" : casa === "camara" ? "DEPUTADO FEDERAL" : "DEPUTADO ESTADUAL",
          codCargo: casa === "senado" ? 5 : casa === "camara" ? 6 : 7,
          partido,
          numero: String(Math.floor(between(1000, 9999))),
          situacao: ano === 2026 ? pick(["ELEITO POR QP", "NÃO ELEITO", "SUPLENTE", "ELEITO POR MÉDIA"]) : pick(["ELEITO POR QP", "SUPLENTE"]),
          votos: Math.floor(between(40_000, 400_000)),
          patrimonio: between(200_000, 8_000_000) * (ano === 2026 ? between(0.8, 2.2) : 1),
          bens: [{ tipo: "Apartamento", descricao: "Imóvel residencial", valor: between(300_000, 2_000_000) }],
        });
    }
  };
  add("camara", 140);
  add("senado", 40);
  add("assembleia", 90);
  for (const p of politicos) {
    p.perfil!.nascimento = tse.find((c) => c.sq.startsWith(p.id))!.nascimento;
  }

  const votacoes: VotacaoDetalhe[] = [];
  for (let i = 0; i < 70; i++) {
    const casa = i % 4 === 0 ? "senado" : "camara";
    const tema = pick(TEMAS);
    const gov = pick(["Sim", "Não"]);
    const membros = politicos.filter((p) => p.casa === casa);
    const ori = PARTIDOS.map((sigla) => ({ sigla, orientacao: rnd() < 0.6 ? gov : gov === "Sim" ? "Não" : "Sim" }));
    votacoes.push({
      id: `${casa === "camara" ? "cam" : "sen"}-demo-${i}`,
      casa,
      data: ymd(addDays(hoje, -Math.floor(between(1, 330)))),
      titulo: `${pick(["PL", "PEC", "PLP", "MPV"])} ${Math.floor(between(100, 4000))}/2026`,
      descricao: `Votação da proposta sobre ${tema[1]} (${tema[0]}).`,
      resultado: pick(["Aprovada", "Aprovada", "Rejeitada"]),
      sim: 0,
      nao: 0,
      outros: 0,
      porPartido: [],
      orientacaoGoverno: casa === "camara" ? gov : undefined,
      orientacoes: casa === "camara" ? [...ori, { sigla: "Governo", orientacao: gov }] : [],
      votos: membros
        .filter(() => rnd() < 0.86)
        .map((p) => {
          const o = ori.find((x) => x.sigla === p.partido)!.orientacao;
          const voto = rnd() < 0.82 ? o : rnd() < 0.7 ? (o === "Sim" ? "Não" : "Sim") : "Abstenção";
          return { pid: p.id, nome: p.nome, partido: p.partido, uf: p.uf, voto };
        }),
    });
  }

  const sessoes: Sessao[] = [];
  for (let d = 1; d < 330; d += 3) {
    const data = ymd(addDays(hoje, -d));
    sessoes.push({ id: `${d}`, data, presentes: politicos.filter((p) => p.casa === "camara" && rnd() < 0.88).map((p) => p.id) });
    sessoes.push({ id: `sen-${data}`, data, presentes: politicos.filter((p) => p.casa === "senado" && rnd() < 0.85).map((p) => p.id), justificadas: [] });
  }

  const FORNECEDORES: [string, string][] = [
    ["Gráfica Exemplo Ltda", "12345678000195"],
    ["Auto Posto Central", "22334455000186"],
    ["Companhia Aérea Fictícia", "33445566000186"],
    ["Locadora Modelo", "44556677000186"],
    ["Restaurante Demonstração", "55667788000186"],
  ];
  const despesas: Despesa[] = [];
  for (const p of politicos) {
    const intensidade = between(0.4, 1.4);
    for (let m = 0; m < 20; m++) {
      const dt = addDays(hoje, -m * 30 - 20);
      for (let k = 0; k < 6; k++) {
        // Fictional suppliers with valid check digits (1% with a wrong one, to exercise the alert)
        const f = Math.floor(rnd() * FORNECEDORES.length);
        const doc = rnd() < 0.01 ? "11222333000182" : FORNECEDORES[f][1];
        despesas.push({
          pid: p.id,
          ano: dt.getUTCFullYear(),
          mes: dt.getUTCMonth() + 1,
          data: ymd(dt),
          categoria: pick(CATEGORIAS),
          fornecedor: FORNECEDORES[f][0],
          doc,
          valor: Math.round(between(150, 7000) * intensidade * 100) / 100,
          docId: `${p.id}-${m}-${k}`,
        });
      }
    }
  }

  const emendas = new Map<string, EmendaAgg>();
  for (const p of politicos.filter((x) => x.casa !== "assembleia" && rnd() < 0.7)) {
    const total = between(1_000_000, 25_000_000);
    emendas.set(p.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), {
      nome: p.nome,
      total,
      porAno: new Map([
        [2025, total * 0.45],
        [2026, total * 0.55],
      ]),
      destinos: new Map([["x", { nome: `Município de ${pick(SOBRENOMES)}`, uf: p.uf, valor: total * 0.6 }]]),
      fonte: "Dados fictícios",
    });
  }

  const falas: Fala[] = [];
  for (const p of politicos.filter((x) => x.casa !== "assembleia")) {
    for (let k = 0; k < Math.floor(between(0, 14)); k++) {
      const tema = pick(TEMAS);
      falas.push({
        id: `demo-fala-${p.id}-${k}`,
        pid: p.id,
        data: ymd(addDays(hoje, -Math.floor(between(0, 120)))),
        tipo: pick(["discurso", "discurso", "youtube"]),
        titulo: pick(["Breves comunicações", "Grande expediente", "Vídeo no canal oficial"]),
        texto: `Senhor presidente, venho a esta tribuna falar sobre ${tema[0]}. Defendo ${tema[1]} porque é uma demanda da população do meu estado.`,
        url: "https://www.camara.leg.br",
        fonte: "Dados fictícios de demonstração",
      });
    }
  }

  const r = montar({ hoje, politicos, votacoes, despesas, sessoes, tse, tseRedes: new Map(), emendas, falas });

  // Fictional presidential elections: invented names and parties, same build code as the real data
  const presCands: CandidatoTSE[] = [];
  const donos = new Map<string, string>();
  const nomes = ["ALBA RIBEIRO", "BRUNO TAVARES", "CLARA MOTTA", "DIOGO PRADO"];
  for (const [i, ano] of [2018, 2022, 2026].entries()) {
    for (const [j, nome] of nomes.entries()) {
      const sq = `${ano}${j}`;
      const resultado = ano === 2026 ? (j < 2 ? "2º TURNO" : "NÃO ELEITO") : j === i ? "ELEITO" : "NÃO ELEITO";
      presCands.push({
        ano,
        sq,
        nome,
        nomeUrna: nome.split(" ")[0],
        uf: "BR",
        cargo: "PRESIDENTE",
        codCargo: 1,
        partido: `PD${j + 1}`,
        numero: String(10 + j),
        situacao: resultado,
        patrimonio: 100_000 * (j + 1) * (i + 1),
        genero: j % 2 ? "MASCULINO" : "FEMININO",
      });
      donos.set(`${ano}:${sq}`, `pres-demo${j}`);
    }
  }
  const presidencia = montarPresidencia({
    hoje,
    candidaturas: presCands,
    donoPorCandidatura: donos,
    historico: new Map(),
    perfis: new Set(),
    atos: Array.from({ length: 40 }, (_, k) => ({
      id: String(9000 + k),
      tipo: k % 4 ? "MPV" : "PL",
      numero: 1000 + k,
      ano: 2026 - (k % 3),
      ementa: `Ato fictício de demonstração número ${k + 1}.`,
      data: ymd(addDays(hoje, -k * 20)),
      url: "https://www.camara.leg.br",
      origem: k % 4 ? ("medida-provisoria" as const) : ("projeto-do-executivo" as const),
    })),
  });

  const datas = despesas.map((d) => d.data!).sort();
  const empresas = montarEmpresas({
    despesas,
    campanhas: [],
    donoCandidatura: new Map(),
    nomes: new Map(r.detalhes.map((d) => [d.id, d.nome])),
    periodoCota: { inicio: datas[0], fim: datas[datas.length - 1] },
  });

  return publicar(saida, r, falas, {
    demo: true,
    presidencia,
    empresas,
    hoje,
    fontes: [{ id: "demo", nome: "Dados fictícios de demonstração", url: "", status: "ok", registros: politicos.length, duracaoMs: 0 }],
    totais: { deputadosFederais: 140, senadores: 40, deputadosEstaduais: 90, despesas: despesas.length, candidaturasTSE: tse.length },
  });
}

if (process.argv[1]?.endsWith("demo.ts")) {
  gerarDemo()
    .then(() => console.log("data-demo gerado (dados fictícios)."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
