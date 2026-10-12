import { describe, expect, it } from "vitest";
import { data, idade, iniciais, moedaCurta, pct } from "./format";
import { aplicarFiltro, lerFiltro, urlFiltro } from "./filtros";
import { METRICAS, distribuicao, metrica, parcela, percentil } from "./metricas";
import { fraseResumo } from "./resumo";
import { trecho } from "./busca-falas";
import { filtrar, type ItemIndice } from "@/components/Busca";
import type { PoliticoResumo } from "./types";

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

describe("format", () => {
  it("formats money for headlines", () => {
    expect(moedaCurta(124_940)).toBe("R$ 125 mil");
    expect(moedaCurta(1_234_567)).toBe("R$ 1,2 mi");
    expect(moedaCurta(undefined)).toBe("–");
  });
  it("formats percentages and dates without timezone drift", () => {
    expect(pct(0.9364)).toBe("94%");
    expect(data("2026-01-01")).toBe("1 jan 2026");
  });
  it("computes age on the birthday boundary", () => {
    expect(idade("1980-10-12", new Date("2026-10-11T12:00:00Z"))).toBe(45);
    expect(idade("1980-10-11", new Date("2026-10-11T12:00:00Z"))).toBe(46);
  });
  it("builds initials", () => expect(iniciais("Júlia da Silva Rezende")).toBe("JR"));
});

describe("list filters", () => {
  const pols = [
    pol("a", { nome: "Ana", m: { presenca: 0.9 } }),
    pol("b", { nome: "Bia", m: { presenca: 0.5 }, uf: "SP" }),
    pol("c", { nome: "Caio", m: {} }),
    pol("d", { nome: "Duda", casa: "senado", m: { presenca: 0.7 } }),
  ];
  it("validates untrusted params", () => {
    const f = lerFiltro({ casa: "x", uf: "mgg", ordem: "drop table", dir: "up", pagina: "-3" });
    expect(f).toEqual({ casa: undefined, uf: undefined, partido: undefined, ordem: "nome", dir: "asc", pagina: 1 });
  });
  it("sorts by metric and keeps missing values last in both directions", () => {
    const asc = aplicarFiltro(pols, lerFiltro({ casa: "camara", ordem: "presenca" })).itens.map((p) => p.id);
    const desc = aplicarFiltro(pols, lerFiltro({ casa: "camara", ordem: "presenca", dir: "desc" })).itens.map((p) => p.id);
    expect(asc).toEqual(["b", "a", "c"]);
    expect(desc).toEqual(["a", "b", "c"]);
  });
  it("builds clean URLs", () => expect(urlFiltro("/politicos", { casa: "senado", pagina: 1, uf: undefined })).toBe("/politicos?casa=senado"));
});

describe("peer comparison", () => {
  it("never rounds a comparison to 0% or 100% when it is not exact", () => {
    expect(parcela(0.2)).toBe("menos de 1%");
    expect(parcela(99.6)).toBe("mais de 99%");
    expect(parcela(0)).toBe("0%");
    expect(parcela(72.4)).toBe("72%");
    expect(metrica("presenca").comparacao(parcela(72.4), "dos senadores")).toBe("Presença maior que a de 72% dos senadores");
  });
  it("percentile counts strictly lower peers", () => {
    expect(percentil(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(40);
    expect(percentil(5, [1, 2])).toBeUndefined();
  });
  it("distribution is per house", () => {
    const d = distribuicao([pol("a", { m: { gasto12m: 10 } }), pol("b", { m: { gasto12m: 30 } }), pol("c", { casa: "senado", m: { gasto12m: 999 } })], "camara", "gasto12m")!;
    expect(d.max).toBe(30);
    expect(d.n).toBe(2);
  });
  it("every metric documents calculation, limits and sources", () => {
    for (const m of METRICAS) {
      expect(m.calculo.length).toBeGreaterThan(40);
      expect(m.limites.length).toBeGreaterThan(20);
      expect(m.fontes.length).toBeGreaterThan(0);
    }
  });
});

describe("plain-language summary", () => {
  it("uses only available numbers and gendered wording", () => {
    const f = fraseResumo(pol("a", { sexo: "F", inicioPolitica: 2015, m: { presenca: 0.9, gasto12m: 120_000, proposicoes: 3, proposicoesLei: 1 } }), 2026);
    expect(f).toBe("Nos últimos 12 meses, esteve em 90% das sessões do Plenário e usou R$ 120 mil da cota parlamentar. É autora ou coautora de 3 projetos, um virou lei. Tem mandatos registrados desde 2015 (11 anos).");
  });
  it("is empty when there is nothing to say", () => expect(fraseResumo(pol("a"))).toBe(""));
});

describe("search", () => {
  const idx: ItemIndice[] = [
    ["1", "José Silva", "José da Silva Neto", "PT", "SP", "Dep. federal", ""],
    ["2", "Maria José", "Maria José Souza", "PL", "MG", "Senador(a)", ""],
    ["3", "Joselito", "", "PSD", "BA", "Dep. estadual", ""],
  ];
  it("ignores accents and ranks name starts first", () => expect(filtrar(idx, "jose").map((i) => i[0])).toEqual(["1", "3", "2"]));
  it("combines name and party/state terms", () => expect(filtrar(idx, "jose mg").map((i) => i[0])).toEqual(["2"]));
  it("highlights every match in an excerpt", () => {
    expect(trecho("A educação pública e a Educação básica", ["educacao"])).toBe("A «educação» pública e a «Educação» básica");
  });
});
