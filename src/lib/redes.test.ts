import { describe, expect, it } from "vitest";
import { separarRedes } from "./redes";
import { urlCorrecao } from "./site";
import type { RedeSocial } from "./types";

const rede = (plataforma: RedeSocial["plataforma"], url: string): RedeSocial => ({ pid: "p", plataforma, url, fonte: "TSE", fonteUrl: "https://dadosabertos.tse.jus.br" });

describe("redes sociais e sites", () => {
  it("separates sites, drops repeated addresses and keeps a fixed order", () => {
    const { sociais, sites } = separarRedes([
      rede("youtube", "https://youtube.com/@a"),
      rede("site", "https://exemplo.org"),
      rede("instagram", "https://www.instagram.com/a/"),
      rede("instagram", "http://instagram.com/a"),
      rede("x", "https://x.com/a"),
    ]);
    expect(sociais.map((r) => r.plataforma)).toEqual(["instagram", "x", "youtube"]);
    expect(sites.map((r) => r.url)).toEqual(["https://exemplo.org"]);
  });

  it("opens the correction form with the page filled in", () => {
    const u = new URL(urlCorrecao("/politico/dep-1"));
    expect(u.pathname).toMatch(/\/issues\/new$/);
    expect(u.searchParams.get("template")).toBe("erro-nos-dados.yml");
    expect(u.searchParams.get("pagina")).toMatch(/\/politico\/dep-1$/);
  });
});
