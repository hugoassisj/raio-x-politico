import { describe, expect, it } from "vitest";
import { rotuloVoto } from "./linguagem";
import { lerPagina, numerosDePagina, paginar } from "./paginacao";
import type { PoliticoResumo, VotacaoDetalhe } from "./types";
import {
  FILTRO_INICIAL,
  FILTRO_PERFIL_INICIAL,
  contarGruposDoPerfil,
  escreverFiltroPerfil,
  filtrarVotosDoPerfil,
  lerFiltroPerfil,
  votouDiferente,
  type FiltroVotosPerfil,
  type VotoDoPerfil,
  alternar,
  alternarPartido,
  contar,
  escreverFiltro,
  filtrar,
  lerFiltro,
  limpar,
  linhasDaVotacao,
  ordenar,
  porPartido,
  soEsta,
  temFiltro,
  type FiltroVotos,
} from "./votos";

const membro = (id: string, partido: string, uf = "SP"): PoliticoResumo => ({ id, casa: "camara", cargo: "Deputado(a) Federal", nome: id, partido, uf, emExercicio: true, m: {} });

/** A Câmara roll call with every kind of record seen in the real data */
const votacao: VotacaoDetalhe = {
  id: "cam-1",
  casa: "camara",
  data: "2026-03-10",
  titulo: "PL 1/2026",
  descricao: "",
  sim: 3,
  nao: 2,
  outros: 3,
  porPartido: [],
  orientacoes: [{ sigla: "PT", orientacao: "Sim" }],
  votos: [
    { pid: "ana", nome: "Ana", partido: "PT", uf: "SP", voto: "Sim" },
    { pid: "bia", nome: "Bia", partido: "PL", uf: "RJ", voto: "Não" },
    { pid: "caio", nome: "Caio", partido: "PL", uf: "SP", voto: "Sim" },
    { pid: "davi", nome: "Davi", partido: "PSD", uf: "MG", voto: "Abstenção" },
    { pid: "edu", nome: "Edu", partido: "NOVO", uf: "SP", voto: "Obstrução" },
    { pid: "fabi", nome: "Fabi", partido: "PT", uf: "BA", voto: "Artigo 17" },
    { pid: "gil", nome: "Gil", partido: "PSDB", uf: "SP", voto: "Não" },
    // Changed party after the vote: the record keeps the party of that day
    { pid: "hugo", nome: "Hugo", partido: "MDB", uf: "RS", voto: "Sim" },
  ],
  semRegistro: [{ pid: "iara", nome: "Iara", partido: "PT", uf: "SP" }],
};
const membros = ["ana:PT", "bia:PL", "caio:PL", "davi:PSD", "edu:NOVO", "fabi:PT", "gil:PSDB", "hugo:PL", "iara:PT"].map((x) => membro(x.split(":")[0], x.split(":")[1]));
const linhas = linhasDaVotacao(votacao, membros);
const f = (over: Partial<FiltroVotos> = {}): FiltroVotos => ({ ...FILTRO_INICIAL, ...over });
const ids = (ls: { pid: string }[]) => ls.map((l) => l.pid);

describe("categorias de voto", () => {
  it("normalizes every house code seen in real data and keeps the original", () => {
    const casos: [string, string][] = [
      ["Sim", "sim"],
      ["Não", "nao"],
      ["Abstenção", "abstencao"],
      ["Obstrução", "obstrucao"],
      ["P-OD", "obstrucao"],
      ["Artigo 17", "outro"],
      ["Presidente (art. 51 RISF)", "outro"],
      ["P-NRV", "outro"],
      ["Participou (voto secreto)", "outro"],
      ["AP", "ausencia"],
      ["MIS", "ausencia"],
      ["LS", "ausencia"],
      ["LP", "ausencia"],
      ["LAP", "ausencia"],
      ["NCom", "ausencia"],
      ["", "sem-registro"],
    ];
    for (const [codigo, categoria] of casos) expect(rotuloVoto(codigo).categoria, codigo).toBe(categoria);
    // Unknown codes are kept as published and never become Sim, Não or an absence
    expect(rotuloVoto("XYZ")).toMatchObject({ rotulo: "XYZ", categoria: "outro" });
  });

  it("builds one row per person with the party of the vote day", () => {
    expect(linhas).toHaveLength(9);
    const hugo = linhas.find((l) => l.pid === "hugo")!;
    expect(hugo).toMatchObject({ partido: "MDB", partidoAtual: false, original: "Sim", categoria: "sim" });
    const iara = linhas.find((l) => l.pid === "iara")!;
    expect(iara).toMatchObject({ categoria: "sem-registro", partidoAtual: true, original: "" });
  });

  it("does not list anyone as missing when the eligible people are unknown", () => {
    expect(linhasDaVotacao({ ...votacao, semRegistro: undefined }, membros).some((l) => l.categoria === "sem-registro")).toBe(false);
  });

  it("counts groups that match the official totals of an open vote", () => {
    const c = contar(linhas);
    expect(c).toEqual({ sim: 3, nao: 2, abstencao: 1, obstrucao: 1, outro: 1, ausencia: 0, "sem-registro": 1 });
    expect(c.sim).toBe(votacao.sim);
    expect(c.nao).toBe(votacao.nao);
  });
});

describe("filtros da lista de votos", () => {
  const presentes = (["sim", "nao", "abstencao", "obstrucao", "outro", "sem-registro"] as const).slice();

  it("tapping a total shows only that group, and tapping again shows everyone", () => {
    const so = soEsta(f({ pagina: 3 }), "sim");
    expect(ids(filtrar(linhas, so)).sort()).toEqual(["ana", "caio", "hugo"]);
    expect(so.pagina).toBe(1);
    expect(soEsta(so, "sim").votos).toEqual([]);
    // Another group can be chosen directly, without clearing first
    expect(ids(filtrar(linhas, soEsta(so, "nao"))).sort()).toEqual(["bia", "gil"]);
  });

  it("hides one group and brings it back", () => {
    const semSim = alternar(f(), "sim", [...presentes]);
    expect(filtrar(linhas, semSim).some((l) => l.categoria === "sim")).toBe(false);
    expect(filtrar(linhas, semSim)).toHaveLength(6);
    expect(alternar(semSim, "sim", [...presentes]).votos).toEqual([]);
  });

  it("combines vote group, party, state and search", () => {
    const filtro = f({ votos: ["sim", "nao"], partidos: ["PL"], uf: "SP" });
    expect(ids(filtrar(linhas, filtro))).toEqual(["caio"]);
    expect(ids(filtrar(linhas, f({ q: "fábi" })))).toEqual(["fabi"]);
    expect(ids(filtrar(linhas, f({ partidos: ["PT", "PSD"] }))).sort()).toEqual(["ana", "davi", "fabi", "iara"]);
    expect(filtrar(linhas, f({ q: "ninguém" }))).toEqual([]);
  });

  it("never changes the totals when filtering", () => {
    const antes = contar(linhas);
    filtrar(linhas, f({ votos: ["nao"], partidos: ["PL"] }));
    expect(contar(linhas)).toEqual(antes);
  });

  it("adds and removes parties, and clearing keeps the view and order", () => {
    const a = alternarPartido(f(), "PT");
    expect(a.partidos).toEqual(["PT"]);
    expect(alternarPartido(a, "PT").partidos).toEqual([]);
    const cheio = f({ votos: ["sim"], partidos: ["PT"], uf: "SP", q: "a", ordem: "partido", visao: "detalhe", pagina: 2 });
    expect(temFiltro(cheio)).toBe(true);
    expect(limpar(cheio)).toEqual({ ...FILTRO_INICIAL, ordem: "partido", visao: "detalhe" });
    expect(temFiltro(f({ ordem: "uf", visao: "partido" }))).toBe(false);
  });

  it("sorts deterministically, with name and id as tie breakers", () => {
    expect(ids(ordenar(linhas, "nome"))).toEqual(["ana", "bia", "caio", "davi", "edu", "fabi", "gil", "hugo", "iara"]);
    expect(ids(ordenar(linhas, "voto"))).toEqual(["ana", "caio", "hugo", "bia", "gil", "davi", "edu", "fabi", "iara"]);
    expect(ids(ordenar(linhas, "partido")).slice(0, 2)).toEqual(["hugo", "edu"]);
    const dois = [
      { ...linhas[0], pid: "z", nome: "Igual" },
      { ...linhas[0], pid: "a", nome: "Igual" },
    ];
    expect(ids(ordenar(dois, "nome"))).toEqual(["a", "z"]);
  });

  it("round-trips through the address and ignores junk", () => {
    const filtro = f({ votos: ["nao", "sim"], partidos: ["PT", "PL"], uf: "SP", q: "ana", ordem: "voto", visao: "partido", pagina: 2 });
    const url = escreverFiltro(filtro);
    const lido = lerFiltro(url);
    expect(lido).toEqual({ ...filtro, votos: ["sim", "nao"], partidos: ["PL", "PT"] });
    expect(escreverFiltro(FILTRO_INICIAL).toString()).toBe("");
    expect(lerFiltro(new URLSearchParams("voto=talvez,sim&ordem=xx&visao=yy&pagina=-3"))).toEqual({ ...FILTRO_INICIAL, votos: ["sim"] });
    // Other parameters of the page survive
    expect(escreverFiltro(f({ uf: "RJ" }), new URLSearchParams("outro=1")).toString()).toBe("outro=1&uf=RJ");
  });

  it("groups by party alphabetically and keeps each person's vote", () => {
    const grupos = porPartido(linhas);
    expect(grupos.map((g) => g.partido)).toEqual(["MDB", "NOVO", "PL", "PSD", "PSDB", "PT"]);
    const pt = grupos.find((g) => g.partido === "PT")!;
    expect(pt.contagem).toMatchObject({ sim: 1, outro: 1, "sem-registro": 1 });
    expect(pt.comRegistro).toBe(2);
    expect(ids(pt.linhas).sort()).toEqual(["ana", "fabi", "iara"]);
  });
});

describe("paginação", () => {
  const itens = Array.from({ length: 125 }, (_, i) => i + 1);

  it("slices pages and clamps out-of-range pages", () => {
    expect(paginar(itens, 1, 60)).toMatchObject({ pagina: 1, paginas: 3, inicio: 1, fim: 60, total: 125 });
    expect(paginar(itens, 3, 60).itens).toEqual([121, 122, 123, 124, 125]);
    expect(paginar(itens, 99, 60).pagina).toBe(3);
    expect(paginar(itens, 0, 60).pagina).toBe(1);
    expect(paginar([], 2, 60)).toMatchObject({ pagina: 1, paginas: 1, inicio: 0, fim: 0, itens: [] });
  });

  it("shows first, last and neighbors, collapsing gaps", () => {
    expect(numerosDePagina(1, 1)).toEqual([1]);
    expect(numerosDePagina(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(numerosDePagina(3, 10)).toEqual([1, 2, 3, 4, null, 10]);
  });

  it("reads page numbers defensively", () => {
    expect(lerPagina("4")).toBe(4);
    expect(lerPagina("abc")).toBe(1);
    expect(lerPagina(null)).toBe(1);
    expect(lerPagina("-2")).toBe(1);
  });
});

describe("votos no perfil", () => {
  const v = (votacaoId: string, data: string, voto: string, over: Partial<VotoDoPerfil> = {}): VotoDoPerfil => ({ votacaoId, data, voto, texto: votacaoId, ...over });
  const votos = [
    v("a", "2026-05-01", "Sim", { orientacaoPartido: "Não", orientacaoGoverno: "Sim", assuntos: ["saude"], texto: "PL 1 vacinas" }),
    v("b", "2025-11-20", "Não", { orientacaoPartido: "Não", orientacaoGoverno: "Sim", assuntos: ["impostos"] }),
    v("c", "2026-05-01", "Abstenção", { orientacaoPartido: "Sim" }),
    v("d", "2026-02-10", "", { orientacaoPartido: "Sim" }),
    v("e", "2026-03-03", "Ausente", { orientacaoPartido: "Sim" }),
    v("f", "2026-03-04", "LS"),
  ];

  it("counts a difference from the party only between Sim and Não", () => {
    expect(votouDiferente("Sim", "Não")).toBe(true);
    expect(votouDiferente("Não", "não")).toBe(false);
    expect(votouDiferente("Abstenção", "Sim")).toBe(false);
    expect(votouDiferente("", "Sim")).toBe(false);
    expect(votouDiferente("Sim", "Liberado")).toBe(false);
  });

  it("filters by group, subject, year and text, newest first with a stable tie", () => {
    const ids = (f: Partial<FiltroVotosPerfil>) => filtrarVotosDoPerfil(votos, { ...FILTRO_PERFIL_INICIAL, ...f }).map((x) => x.votacaoId);
    expect(ids({})).toEqual(["a", "c", "f", "e", "d", "b"]);
    expect(ids({ grupo: "contra-partido" })).toEqual(["a"]);
    expect(ids({ grupo: "contra-governo" })).toEqual(["b"]);
    expect(ids({ grupo: "sem-registro" })).toEqual(["e", "d"]);
    expect(ids({ grupo: "ausencia" })).toEqual(["f"]);
    expect(ids({ assunto: "impostos" })).toEqual(["b"]);
    expect(ids({ ano: "2025" })).toEqual(["b"]);
    expect(ids({ q: "vacina" })).toEqual(["a"]);
  });

  it("counts each group within the other filters", () => {
    const n = contarGruposDoPerfil(votos, { ...FILTRO_PERFIL_INICIAL, ano: "2026" });
    expect(n[""]).toBe(5);
    expect(n.sim).toBe(1);
    expect(n["sem-registro"]).toBe(2);
    expect(n["contra-partido"]).toBe(1);
  });

  it("round-trips through the address", () => {
    const f: FiltroVotosPerfil = { grupo: "contra-partido", assunto: "saude", ano: "2026", q: "x", pagina: 2 };
    expect(lerFiltroPerfil(escreverFiltroPerfil(f))).toEqual(f);
    expect(lerFiltroPerfil(new URLSearchParams("voto=talvez&ano=26"))).toEqual(FILTRO_PERFIL_INICIAL);
  });
});

describe("situação do projeto", () => {
  it("says a bill became law only when the house says so", async () => {
    const { explicarSituacao } = await import("./linguagem");
    expect(explicarSituacao("Transformado em Norma Jurídica")).toMatchObject({ titulo: "Virou lei", final: true });
    expect(explicarSituacao("Aguardando Apreciação pelo Senado Federal")).toMatchObject({ titulo: "Foi para o Senado", final: false });
    expect(explicarSituacao("Aguardando Sanção")).toMatchObject({ titulo: "Esperando o Presidente", final: false });
    expect(explicarSituacao("Aguardando Designação de Relator(a)")?.titulo).toBe("Em análise numa comissão");
    expect(explicarSituacao("Algo novo")).toMatchObject({ titulo: "Algo novo", final: false, original: "Algo novo" });
    expect(explicarSituacao(undefined)).toBeUndefined();
  });
});

describe("Presidência", () => {
  const e = (ano: number, cs: [string, string][]) => ({ ano, candidatos: cs.map(([pessoa, resultado]) => ({ pessoa, nomeUrna: pessoa, resultado: resultado as never })) });
  const eleicoes = [
    e(2018, [
      ["a", "eleito"],
      ["b", "nao-eleito"],
    ]),
    e(2022, [
      ["c", "eleito"],
      ["a", "nao-eleito"],
    ]),
    e(2026, [
      ["c", "segundo-turno"],
      ["d", "segundo-turno"],
      ["e", "nao-eleito"],
    ]),
  ];

  it("names who holds the office from the last election whose term began", async () => {
    const { situacaoDaPresidencia } = await import("./presidencia");
    const s = situacaoDaPresidencia(eleicoes, new Date("2026-10-12"));
    expect(s.emExercicio).toMatchObject({ ano: 2022, candidato: { pessoa: "c" }, inicio: 2023, fim: 2026 });
    expect(s.proxima?.segundoTurno.map((c) => c.pessoa)).toEqual(["c", "d"]);
    expect(s.proxima?.eleito).toBeUndefined();
    // After the new term starts, the 2026 winner is the one in office
    const depois = situacaoDaPresidencia([...eleicoes.slice(0, 2), e(2026, [["d", "eleito"]])], new Date("2027-02-01"));
    expect(depois.emExercicio).toMatchObject({ ano: 2026, candidato: { pessoa: "d" } });
    expect(depois.proxima).toBeUndefined();
  });
});
