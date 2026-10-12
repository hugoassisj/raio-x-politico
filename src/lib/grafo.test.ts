import { describe, expect, it } from "vitest";
import { conferir, grafoDaEmpresa, grafoDaPessoa, juntarGrafos } from "./grafo";
import type { PoliticoDetalhe, PoliticoResumo } from "./types";

const pessoa = {
  id: "dep-1",
  casa: "camara",
  cargo: "Deputado(a) Federal",
  nome: "Ana",
  partido: "PL",
  uf: "SP",
  emExercicio: true,
  m: {},
  atualizadoEm: "2026-10-12",
  perfil: {},
  carreira: [],
  votos: [],
  proposicoesLista: [],
  proposicoesPorTipo: {},
  comissoes: [],
  frentes: [],
  redes: [],
  fontes: [{ nome: "Câmara dos Deputados - Dados Abertos", url: "https://dadosabertos.camara.leg.br/api/v2/deputados/1" }],
  gastos: {
    total12m: 0,
    porMes: [],
    porCategoria: [],
    alertas: [],
    recentes: [],
    topFornecedores: [
      { nome: "GRAFICA BOA", doc: "11222333000181", valor: 100, n: 2 },
      // A person (CPF) or an invalid CNPJ never becomes a company node
      { nome: "JOAO", doc: "12345678909", valor: 50, n: 1 },
      { nome: "ERRADA", doc: "11222333000182", valor: 10, n: 1 },
    ],
  },
  emendas: { total: 5, porAno: [], destinos: [{ nome: "Campinas", uf: "SP", valor: 5 }], fonte: "Transferegov" },
  eleicoes: [
    {
      ano: 2022,
      cargo: "Deputado Federal",
      uf: "SP",
      campanha: {
        ano: 2022,
        receitas: 10,
        dinheiroPublico: 0,
        porOrigem: [],
        doadores: [{ nome: "DIRECAO NACIONAL", cnpj: "00000000000191", origem: "Fundo eleitoral", valor: 10 }],
        despesas: 3,
        fornecedores: [{ nome: "GRAFICA BOA", cnpj: "11222333000181", valor: 3 }],
        fonte: "https://cdn.tse.jus.br/x.zip",
      },
    },
  ],
} as unknown as PoliticoDetalhe;

describe("mapa de relações", () => {
  it("never confirms a link without evidence or with an invalid CNPJ", () => {
    expect(conferir({ de: "p:dep-1", para: "e:11222333000181", tipo: "cota", rotulo: "x", evidencias: [] }).confirmada).toBe(false);
    expect(conferir({ de: "p:dep-1", para: "e:11222333000182", tipo: "cota", rotulo: "x", evidencias: [{ texto: "a", fonte: "b" }] }).confirmada).toBe(false);
    expect(conferir({ de: "p:dep-1", para: "e:11222333000181", tipo: "cota", rotulo: "x", evidencias: [{ texto: "a", fonte: "b" }] }).confirmada).toBe(true);
  });

  it("builds a person's links from official records only", () => {
    const g = grafoDaPessoa(pessoa);
    expect(g.nos.map((n) => n.id).sort()).toEqual(["e:00000000000191", "e:11222333000181", "m:SP:Campinas", "p:dep-1", "pt:PL"]);
    expect(g.ligacoes.map((l) => [l.tipo, l.de, l.para]).sort()).toEqual([
      ["cota", "p:dep-1", "e:11222333000181"],
      ["doacao-campanha", "e:00000000000191", "p:dep-1"],
      ["emenda", "p:dep-1", "m:SP:Campinas"],
      ["filiacao", "p:dep-1", "pt:PL"],
      ["fornecedor-campanha", "p:dep-1", "e:11222333000181"],
    ]);
    expect(g.ligacoes.every((l) => l.confirmada && l.evidencias.length > 0)).toBe(true);
  });

  it("expands a company and merges without duplicates", () => {
    const pessoas = new Map<string, PoliticoResumo>([
      ["dep-1", pessoa],
      ["dep-2", { ...pessoa, id: "dep-2", nome: "Bia" }],
    ]);
    const e = grafoDaEmpresa(
      {
        cnpj: "11222333000181",
        nome: "GRAFICA BOA",
        nomes: [],
        cota: {
          total: 130,
          n: 3,
          periodo: { inicio: "2025-01-01", fim: "2026-09-30" },
          porPessoa: [
            { pid: "dep-1", nome: "Ana", valor: 100, n: 2 },
            { pid: "dep-2", nome: "Bia", valor: 30, n: 1 },
          ],
          fonte: "Cota",
        },
      },
      pessoas,
    );
    const g = juntarGrafos(grafoDaPessoa(pessoa), e);
    expect(g.nos.filter((n) => n.id === "e:11222333000181")).toHaveLength(1);
    expect(g.nos.some((n) => n.id === "p:dep-2")).toBe(true);
    expect(g.ligacoes.filter((l) => l.tipo === "cota" && l.de === "p:dep-1")).toHaveLength(1);
  });
});
