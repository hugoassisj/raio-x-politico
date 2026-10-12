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

describe("partido no tempo", () => {
  it("joins records with the same party and never fills gaps", async () => {
    const { filiacoesNoTempo } = await import("./carreira");
    const r = filiacoesNoTempo({
      eleicoes: [
        { ano: 2014, cargo: "Deputado", uf: "SP", partido: "PSDB" },
        { ano: 2018, cargo: "Deputado", uf: "SP", partido: "PSDB" },
        { ano: 2022, cargo: "Deputado", uf: "SP", partido: "PL" },
      ],
      votos: [{ data: "2025-03-01", partido: "PL" }, { data: "2026-04-10", partido: "PP" }, { data: "2026-05-10" }],
      partido: "PP",
      atualizadoEm: "2026-10-12T00:00:00Z",
      casa: "camara",
    });
    expect(r.map((x) => [x.partido, x.de, x.ate])).toEqual([
      ["PSDB", "2014", "2018"],
      ["PL", "2022", "2025-03-01"],
      ["PP", "2026-04-10", "2026-10-12"],
    ]);
    expect(r[1].fontes).toEqual(["Candidatura 2022 (TSE)", "Votos no plenário (Câmara)"]);
  });
});
