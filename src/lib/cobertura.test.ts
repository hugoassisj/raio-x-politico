import { describe, expect, it } from "vitest";
import { coberturaDoPerfil } from "./cobertura";
import type { PoliticoDetalhe } from "./types";

const base = (over: Partial<PoliticoDetalhe> = {}): PoliticoDetalhe =>
  ({
    id: "x",
    casa: "camara",
    cargo: "Deputado(a) Federal",
    nome: "X",
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
    eleicoes: [],
    redes: [],
    fontes: [],
    ...over,
  }) as PoliticoDetalhe;

const estado = (p: PoliticoDetalhe, titulo: string, nFalas = 0) => coberturaDoPerfil(p, nFalas).find((c) => c.titulo === titulo)!;

describe("cobertura do perfil", () => {
  it("says why each gap exists instead of showing zero", () => {
    const p = base();
    expect(estado(p, "Votos")).toMatchObject({ estado: "indisponivel", motivo: expect.stringContaining("Nenhuma votação") });
    expect(estado(p, "Campanhas").estado).toBe("nao-se-aplica");
    expect(estado(p, "Contato").estado).toBe("indisponivel");
  });

  it("explains what state assemblies do not publish", () => {
    const p = base({ casa: "assembleia", gastos: { total12m: 1 } as PoliticoDetalhe["gastos"] });
    expect(estado(p, "Votos")).toMatchObject({ estado: "indisponivel", motivo: expect.stringContaining("assembleias") });
    expect(estado(p, "Gastos").estado).toBe("parcial");
    expect(estado(p, "Emendas").estado).toBe("indisponivel");
  });

  it("marks partial campaign accounts and Pix-only amendments", () => {
    const p = base({
      eleicoes: [
        { ano: 2018, cargo: "Deputado", uf: "SP" },
        { ano: 2022, cargo: "Deputado", uf: "SP", campanha: { ano: 2022 } as never },
      ],
      emendas: { total: 1, porAno: [], destinos: [], fonte: "Transferegov - Transferências Especiais" },
    });
    expect(estado(p, "Campanhas").estado).toBe("parcial");
    expect(estado(p, "Emendas").estado).toBe("parcial");
    expect(estado(p, "Falas", 3).estado).toBe("disponivel");
  });
});
