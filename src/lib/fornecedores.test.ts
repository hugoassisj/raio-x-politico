import { describe, expect, it } from "vitest";
import { documentoPublicavel } from "./cnpj";
import { ORDEM_FORNECEDORES_INICIAL, lerOrdemFornecedores, linhasFornecedores, ordenarFornecedores, proximaOrdem, urlFornecedores } from "./fornecedores";
import type { EmpresaDetalhe, PoliticoResumo } from "./types";

const pol = (id: string, casa: PoliticoResumo["casa"], nome = id): PoliticoResumo => ({ id, casa, cargo: "Deputado(a) Federal", nome, partido: "PT", uf: "SP", emExercicio: true, m: {} });
const pessoas = new Map([pol("dep-1", "camara", "Ana"), pol("sen-2", "senado", "Bia"), pol("est-3", "assembleia" as PoliticoResumo["casa"], "Caio")].map((p) => [p.id, p]));
const grafica: EmpresaDetalhe = {
  cnpj: "11222333000181",
  nome: "GRAFICA BOA",
  nomes: [],
  cota: {
    total: 180,
    n: 3,
    periodo: { inicio: "2025-01-01", fim: "2026-09-30" },
    porPessoa: [
      { pid: "dep-1", nome: "Ana", valor: 150, n: 2, primeira: "2026-02-01", ultima: "2026-05-01" },
      { pid: "sen-2", nome: "Bia", valor: 30, n: 1, primeira: "2026-03-01", ultima: "2026-03-01" },
    ],
    porCategoria: [{ categoria: "Divulgação", valor: 180, n: 3 }],
    fonte: "",
  },
  campanhas: { registros: [{ pid: "sen-2", nome: "Bia", papel: "doador", ano: 2022, valor: 500 }], fonte: "" },
};
const brutos = [
  { nome: "GRAFICA BOA", doc: "11.222.333/0001-81", valor: 180, parlamentares: 2, n: 3 },
  { nome: "JOAO (pessoa)", doc: "12345678909", valor: 900, parlamentares: 1, n: 1 },
  { nome: "SEM FICHA LTDA", doc: "33445566000186", valor: 120, parlamentares: 4, n: 10 },
];
const linhas = linhasFornecedores(brutos, 1200, new Map([["11222333000181", grafica]]), pessoas, documentoPublicavel);

describe("fornecedores", () => {
  it("enriches a supplier from its company file and never gives a person a CNPJ", () => {
    const g = linhas[0];
    expect(g).toMatchObject({
      cnpj: "11222333000181",
      temPagina: true,
      parte: 0.15,
      mediaPagamento: 60,
      mediaParlamentar: 90,
      deputados: 1,
      senadores: 1,
      estaduais: 0,
      campanhas: 500,
      categoria: "Divulgação",
      primeira: "2026-02-01",
      ultima: "2026-05-01",
    });
    expect(g.maiorPagador).toEqual({ pid: "dep-1", nome: "Ana", valor: 150 });
    expect(linhas[1]).toMatchObject({ cnpj: undefined, temPagina: false, parte: 0.75 });
    expect(linhas[1].maiorPagador).toBeUndefined();
    // A valid CNPJ without a company file: numbers only, no page
    expect(linhas[2]).toMatchObject({ cnpj: "33445566000186", temPagina: false });
    expect(linhas[2].deputados).toBeUndefined();
  });

  it("sorts by any column, missing values last, with a stable tie breaker", () => {
    const nomes = (o: Parameters<typeof ordenarFornecedores>[1]) => ordenarFornecedores(linhas, o).map((l) => l.nome);
    expect(nomes({ ordem: "valor", dir: "desc" })).toEqual(["JOAO (pessoa)", "GRAFICA BOA", "SEM FICHA LTDA"]);
    expect(nomes({ ordem: "nome", dir: "asc" })).toEqual(["GRAFICA BOA", "JOAO (pessoa)", "SEM FICHA LTDA"]);
    expect(nomes({ ordem: "parlamentares", dir: "asc" })).toEqual(["JOAO (pessoa)", "GRAFICA BOA", "SEM FICHA LTDA"]);
    // Only the graphics company has a campaign value; the others go last whatever the direction
    expect(nomes({ ordem: "campanhas", dir: "desc" })).toEqual(["GRAFICA BOA", "JOAO (pessoa)", "SEM FICHA LTDA"]);
    expect(nomes({ ordem: "campanhas", dir: "asc" })).toEqual(["GRAFICA BOA", "JOAO (pessoa)", "SEM FICHA LTDA"]);
    const iguais = [
      { ...linhas[2], nome: "Igual", cnpj: "2" },
      { ...linhas[2], nome: "Igual", cnpj: "1" },
    ];
    expect(ordenarFornecedores(iguais, { ordem: "valor", dir: "desc" }).map((l) => l.cnpj)).toEqual(["1", "2"]);
  });

  it("keeps the order in the address and flips it on a second tap", () => {
    expect(lerOrdemFornecedores({})).toEqual(ORDEM_FORNECEDORES_INICIAL);
    expect(lerOrdemFornecedores({ ordem: "xx", dir: "asc" })).toEqual(ORDEM_FORNECEDORES_INICIAL);
    expect(lerOrdemFornecedores({ ordem: "nome" })).toEqual({ ordem: "nome", dir: "asc" });
    expect(lerOrdemFornecedores({ ordem: "n", dir: "sideways" })).toEqual({ ordem: "n", dir: "desc" });
    expect(urlFornecedores("/gastos", ORDEM_FORNECEDORES_INICIAL, "#fornecedores")).toBe("/gastos#fornecedores");
    expect(urlFornecedores("/api/fornecedores", { ordem: "nome", dir: "asc" })).toBe("/api/fornecedores?ordem=nome&dir=asc");
    expect(proximaOrdem({ ordem: "valor", dir: "desc" }, "valor")).toEqual({ ordem: "valor", dir: "asc" });
    expect(proximaOrdem({ ordem: "valor", dir: "desc" }, "nome")).toEqual({ ordem: "nome", dir: "asc" });
    expect(proximaOrdem({ ordem: "valor", dir: "desc" }, "n")).toEqual({ ordem: "n", dir: "desc" });
  });
});
