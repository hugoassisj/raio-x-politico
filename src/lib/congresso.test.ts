import { describe, expect, it } from "vitest";
import { classificarAssuntos } from "./assuntos";
import { listaNatural, resultadoDe, resumoEleicoes, trocasDePartido } from "./carreira";
import { explicarEtapa } from "./linguagem";
import { cadeirasPorVoto } from "./cadeiras";
import { partesDescricao } from "./format";
import { faixaGoverno, ordenarParaPlenario, resumirPartidos, unidadePartido } from "./partidos";
import { layoutPlenario } from "./plenario";
import { agruparPorProjeto, votacaoPrincipal } from "./projetos";
import { avaliarQuorum, regraDaVotacao, votosNecessarios } from "./quorum";
import { correlacao, forcaCorrelacao, median } from "./stats";
import type { PoliticoResumo, VotacaoDetalhe, VotacaoResumo } from "./types";

const pol = (id: string, over: Partial<PoliticoResumo> = {}): PoliticoResumo => ({
  id,
  casa: "camara",
  cargo: "Deputado(a) Federal",
  nome: id,
  partido: "PL",
  uf: "MG",
  emExercicio: true,
  m: {},
  ...over,
});

const votacao = (porPartido: VotacaoResumo["porPartido"], over: Partial<VotacaoResumo> = {}): VotacaoResumo => ({
  id: "v",
  casa: "camara",
  data: "2026-01-01",
  titulo: "PL 1/2026",
  descricao: "",
  sim: 0,
  nao: 0,
  outros: 0,
  porPartido,
  ...over,
});

describe("quorum", () => {
  it("matches the constitutional thresholds", () => {
    expect(votosNecessarios("tres_quintos", "camara")).toBe(308);
    expect(votosNecessarios("tres_quintos", "senado")).toBe(49);
    expect(votosNecessarios("absoluta", "camara")).toBe(257);
    expect(votosNecessarios("absoluta", "senado")).toBe(41);
    expect(votosNecessarios("simples", "camara")).toBe(257);
  });

  it("detects the kind of proposal from the title or the description", () => {
    expect(regraDaVotacao("PEC 5/2023")?.tipo).toBe("PEC");
    expect(regraDaVotacao("PLP 74/2026")?.tipo).toBe("PLP");
    expect(regraDaVotacao("PLV 2/2026")?.tipo).toBe("MPV");
    expect(regraDaVotacao("Votação", "Proposta de emenda à Constituição")?.tipo).toBe("PEC");
    expect(regraDaVotacao("Votação", "sem pistas")).toBeUndefined();
  });

  it("knows which nominations need an absolute majority in the Senado", () => {
    expect(regraDaVotacao("MSF 19/2026", "o nome do Senhor X para exercer o cargo de Embaixador do Brasil na República da Albânia")?.exigencia).toBe("simples");
    expect(regraDaVotacao("OFS 4/2026", "nos termos do art. 103-B, inciso II, da Constituição Federal, a indicação para o CNJ")?.exigencia).toBe("absoluta");
  });

  it("treats procedural requests as simple majority even inside a PEC debate", () => {
    expect(regraDaVotacao("PEC 5/2023", "Ementa | Aprovado o Requerimento de adiamento. Sim: 300")?.tipo).toBe("REQ");
  });

  it("evaluates Sim votes for qualified majorities and presence for simple majority", () => {
    const pec = regraDaVotacao("PEC 5/2023")!;
    expect(avaliarQuorum(pec, "camara", 368, 96, 7)).toMatchObject({ necessario: 308, medida: "sim", atingiu: true });
    expect(avaliarQuorum(pec, "camara", 300, 10, 0)?.atingiu).toBe(false);
    const pl = regraDaVotacao("PL 1/2026")!;
    expect(avaliarQuorum(pl, "camara", 150, 100, 10)).toMatchObject({ medida: "presenca", atingiu: true });
    expect(avaliarQuorum(pl, "camara", 150, 100, 0)?.atingiu).toBe(false);
    expect(avaliarQuorum(pl, "assembleia", 1, 0, 0)).toBeUndefined();
  });
});

describe("plenário", () => {
  it("places exactly one seat per member, left to right", () => {
    for (const n of [81, 513]) {
      const s = layoutPlenario(n);
      expect(s).toHaveLength(n);
      expect(new Set(s.map((a) => `${a.x.toFixed(1)},${a.y.toFixed(1)}`)).size).toBe(n);
    }
    const s = layoutPlenario(81);
    expect(s[0].x).toBeLessThan(s[80].x);
  });

  it("never lets two seats touch, including across the central aisle", () => {
    for (const n of [3, 20, 81, 100, 513]) {
      const s = layoutPlenario(n);
      let menor = Infinity;
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) menor = Math.min(menor, Math.hypot(s[i].x - s[j].x, s[i].y - s[j].y));
      expect(menor).toBeGreaterThanOrEqual(2 * s[0].r);
    }
  });

  it("colors seats by vote and fills the room with members who did not vote", () => {
    const membros = [pol("a"), pol("b"), pol("c", { partido: "PT" })];
    const v: VotacaoDetalhe = {
      ...votacao([]),
      votos: [
        { pid: "a", nome: "a", partido: "PL", uf: "MG", voto: "Sim" },
        { pid: "c", nome: "c", partido: "PT", uf: "MG", voto: "Não" },
      ],
      orientacoes: [],
    };
    const { cadeiras, legenda } = cadeirasPorVoto(v, membros);
    expect(cadeiras.map((c) => c.id)).toEqual(["a", "c", "b"]);
    expect(legenda.map((l) => [l.rotulo, l.n])).toEqual([
      ["Sim", 1],
      ["Não", 1],
      ["Não votou", 1],
    ]);
  });

  it("shows only participation in secret ballots", () => {
    const v: VotacaoDetalhe = { ...votacao([], { secreta: true }), votos: [{ pid: "a", nome: "a", partido: "PL", uf: "MG", voto: "Participou (voto secreto)" }], orientacoes: [] };
    const { legenda } = cadeirasPorVoto(v, [pol("a"), pol("b")]);
    expect(legenda.map((l) => [l.rotulo, l.n])).toEqual([
      ["Participou (voto secreto)", 1],
      ["Não votou", 1],
    ]);
  });
});

describe("partidos", () => {
  it("measures unity as the average share on the majority side", () => {
    const vs = Array.from({ length: 5 }, () => votacao([{ partido: "PL", sim: 9, nao: 1, outros: 3 }]));
    expect(unidadePartido("PL", vs)).toBeCloseTo(0.9);
    expect(unidadePartido("PL", vs.slice(0, 4))).toBeUndefined();
    expect(unidadePartido("PL", [...vs, votacao([{ partido: "PL", sim: 1, nao: 1, outros: 0 }])])).toBeCloseTo(0.9);
  });

  it("summarizes seats and orders the plenary by alignment with the government", () => {
    const pols = [pol("a", { partido: "PT", m: { governismo: 0.95 } }), pol("b", { m: { governismo: 0.2 } }), pol("c", { casa: "senado" }), pol("d", { emExercicio: false })];
    const ps = resumirPartidos(pols, []);
    expect(ps.find((p) => p.sigla === "PL")?.cadeiras).toEqual({ camara: 1, senado: 1, assembleia: 0 });
    expect(ordenarParaPlenario(pols.slice(0, 2), ps).map((p) => p.partido)).toEqual(["PT", "PL"]);
    expect(faixaGoverno(0.95)?.rotulo).toMatch(/70%/);
    expect(faixaGoverno(undefined)).toBeUndefined();
  });
});

describe("stats", () => {
  it("computes medians and Pearson correlation", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([])).toBeUndefined();
    const linha = Array.from({ length: 12 }, (_, i) => [i, 2 * i + 1] as [number, number]);
    expect(correlacao(linha)).toBeCloseTo(1);
    expect(correlacao(linha.map(([x, y]) => [x, -y]))).toBeCloseTo(-1);
    expect(correlacao(linha.slice(0, 9))).toBeUndefined();
  });

  it("describes strength in plain words without implying cause", () => {
    expect(forcaCorrelacao(undefined)).toMatch(/Poucos dados/);
    expect(forcaCorrelacao(0.05)).toMatch(/nenhuma relação/);
    expect(forcaCorrelacao(-0.7)).toMatch(/forte: quanto maior um, menor/);
  });
});

describe("descrição de votação", () => {
  it("splits the bill summary from the step that was voted", () => {
    expect(partesDescricao("Altera a lei X. | Aprovado o substitutivo. Sim: 300")).toEqual({ ementa: "Altera a lei X.", procedimento: "Aprovado o substitutivo. Sim: 300" });
    expect(partesDescricao("Só a ementa")).toEqual({ ementa: "Só a ementa", procedimento: "" });
  });
});

describe("assuntos", () => {
  it("uses the official themes first and the summary only as a fallback", () => {
    expect(classificarAssuntos(["Saúde", "Finanças Públicas e Orçamento"], "Altera a lei X")).toEqual(["saude", "impostos"]);
    expect(classificarAssuntos([], "Dispõe sobre o ensino médio nas escolas públicas")).toEqual(["educacao"]);
    expect(classificarAssuntos(undefined, "Texto sem pistas")).toEqual([]);
  });
});

describe("linguagem simples", () => {
  it("explains common voting steps and tells procedure from content", () => {
    expect(explicarEtapa("Aprovado o Requerimento de Urgência (Art. 155 do RICD).")).toMatchObject({ tipo: "procedimento", titulo: "Pedido de urgência" });
    expect(explicarEtapa("Rejeitado o Requerimento.", "Votação do Requerimento de retirada de pauta")).toMatchObject({ titulo: "Pedido para tirar da pauta" });
    expect(explicarEtapa("Mantido o texto.")).toMatchObject({ tipo: "conteudo", sim: "Votar Sim era manter o trecho no texto." });
    expect(explicarEtapa("Aprovada, em segundo turno, a Proposta de Emenda à Constituição nº 5, de 2023.")?.titulo).toBe("Segunda votação da mudança na Constituição");
    expect(explicarEtapa("Votação nominal da Emenda nº 3 ao Projeto de Lei Complementar nº 1, de 2026, destacada.")?.titulo).toBe("Proposta de mudança votada em separado");
    expect(explicarEtapa("Aprovado o Projeto de Lei nº 1, ressalvado o destaque.")?.texto).toMatch(/Trechos destacados/);
    expect(explicarEtapa("Resultado.")).toBeUndefined();
  });
});

describe("projetos", () => {
  const v = (id: string, data: string, proc: string, materia = "cam-1") => votacao([], { id, data, descricao: `Ementa do projeto | ${proc}`, materia, titulo: "PL 1/2026" });
  it("groups roll calls by bill and picks the main text over requests and excerpts", () => {
    const vs = [
      v("a", "2026-05-01", "Aprovado o Requerimento de Urgência."),
      v("b", "2026-05-02", "Aprovado o Projeto de Lei nº 1."),
      v("c", "2026-05-02", "Mantido o texto."),
      v("d", "2026-04-01", "Aprovado o Projeto.", "cam-2"),
    ];
    expect(votacaoPrincipal(vs.slice(0, 3)).id).toBe("b");
    const g = agruparPorProjeto(vs, new Map(), new Map());
    expect(g.map((p) => [p.chave, p.votacoes.length, p.principal.id])).toEqual([
      ["cam-1", 3, "b"],
      ["cam-2", 1, "d"],
    ]);
    expect(g[0].ementa).toBe("Ementa do projeto");
  });
});

describe("carreira", () => {
  it("reads TSE results in plain words", () => {
    expect(resultadoDe("ELEITO POR QP")).toBe("eleito");
    expect(resultadoDe("2º TURNO")).toBe("segundo-turno");
    expect(resultadoDe("SUPLENTE")).toBe("suplente");
    expect(resultadoDe("NÃO ELEITO")).toBe("nao-eleito");
    expect(resultadoDe("INDEFERIDO COM RECURSO")).toBe("registro-negado");
    expect(resultadoDe(undefined)).toBe("sem-resultado");
  });
  it("lists party changes in order and summarizes the career", () => {
    const e = [
      { ano: 2018, cargo: "Deputado federal", uf: "AL", partido: "PP", resultado: "eleito" as const },
      { ano: 2010, cargo: "Deputado estadual", uf: "AL", partido: "PMDB", resultado: "eleito" as const },
      { ano: 2022, cargo: "Deputado federal", uf: "AL", partido: "PP", resultado: "nao-eleito" as const },
    ];
    expect(trocasDePartido(e)).toEqual([{ ano: 2018, de: "PMDB", para: "PP" }]);
    expect(resumoEleicoes(e)).toEqual({ disputadas: 3, vitorias: 2, primeiroAno: 2010, partidos: ["PMDB", "PP"] });
    expect(listaNatural(["A", "B", "C"])).toBe("A, B e C");
  });
});
