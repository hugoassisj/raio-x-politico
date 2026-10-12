import { describe, expect, it } from "vitest";
import { decodeAuto, nameSimilarity, nomeProprio, num, isoDate, validDoc, windows, norm } from "../lib/util";
import {
  calcularGastos,
  calcularPresenca,
  calcularVotos,
  emExercicioEm,
  enriquecerVotacoes,
  janela12,
  orientacaoDoPartido,
  totaisDoTexto,
  ultimoMesCompleto,
  VOTO_SECRETO,
} from "../metrics";
import { periodosExercicio } from "../sources/camara";
import { chavesDaPessoa, juntarCandidaturas, marcarSemRegistro, vincularTSE } from "../build";
import { SEN_PRESENTE } from "../sources/senado";
import { normalizaUrl, plataforma, handleDe } from "../sources/falas";
import { somarVotos, somarVotosZip } from "../sources/tse";
import { strToU8, zipSync } from "fflate";
import { documentoVerificavel } from "../metrics";
import type { CandidatoTSE, Despesa, PoliticoParcial } from "../model";
import type { VotacaoDetalhe } from "../../src/lib/types";

const dep = (id: string, partido: string, extra: Partial<PoliticoParcial> = {}): PoliticoParcial => ({
  id,
  casa: "camara",
  cargo: "Deputado(a) Federal",
  nome: id,
  partido,
  uf: "MG",
  emExercicio: true,
  ...extra,
});

describe("util", () => {
  it("decodes UTF-8 when valid and Latin-1 otherwise", () => {
    expect(decodeAuto(new TextEncoder().encode("SERVIÇOS GRÁFICOS"))).toBe("SERVIÇOS GRÁFICOS");
    expect(decodeAuto(Uint8Array.from([0x53, 0x45, 0x52, 0x56, 0x49, 0xc7, 0x4f, 0x53]))).toBe("SERVIÇOS");
  });
  it("parses Brazilian numbers", () => {
    expect(num("1.234,56")).toBe(1234.56);
    expect(num("1234.56")).toBe(1234.56);
    expect(num("")).toBe(0);
    expect(num(12)).toBe(12);
  });
  it("normalizes dates", () => {
    expect(isoDate("05/03/1970")).toBe("1970-03-05");
    expect(isoDate("2026-09-03T17:29:39")).toBe("2026-09-03");
    expect(isoDate("")).toBeUndefined();
  });
  it("validates CPF and CNPJ check digits", () => {
    expect(validDoc("11.222.333/0001-81")).toBe(true);
    expect(validDoc("11.222.333/0001-82")).toBe(false);
    expect(validDoc("529.982.247-25")).toBe(true);
    expect(validDoc("111.111.111-11")).toBe(false);
    expect(validDoc("123")).toBeNull();
  });
  it("compares names ignoring accents and connectors", () => {
    expect(nameSimilarity("José da Silva Júnior", "JOSE SILVA")).toBe(1);
    expect(nameSimilarity("Maria Souza", "Mário Souza")).toBeLessThan(1);
    expect(norm("  São   Paulo! ")).toBe("sao paulo");
    expect(nomeProprio("ARTHUR CÉSAR PEREIRA DE LIRA")).toBe("Arthur César Pereira de Lira");
    expect(nomeProprio("Tabata Amaral")).toBe("Tabata Amaral");
  });
  it("splits date ranges into bounded windows", () => {
    const w = windows(new Date("2026-01-01"), new Date("2026-12-31"), 90);
    expect(w[0]).toEqual(["2026-01-01", "2026-03-31"]);
    expect(w[w.length - 1][1]).toBe("2026-12-31");
  });
});

describe("party orientation lookup", () => {
  const ori = [
    { sigla: "PL", orientacao: "Não" },
    { sigla: "Fdr PT-PCdoB-PV", orientacao: "Sim" },
    { sigla: "Bl UniPpPsd...", orientacao: "Sim" },
    { sigla: "Governo", orientacao: "Sim" },
  ];
  it("prefers the party row", () => expect(orientacaoDoPartido(ori, "PL")).toBe("Não"));
  it("resolves federations", () => expect(orientacaoDoPartido(ori, "PCdoB")).toBe("Sim"));
  it("resolves truncated blocs", () => {
    expect(orientacaoDoPartido(ori, "PSD")).toBe("Sim");
    expect(orientacaoDoPartido(ori, "UNIÃO")).toBe("Sim");
  });
  it("returns undefined for unknown parties", () => expect(orientacaoDoPartido(ori, "NOVO")).toBeUndefined());
});

describe("vote metrics", () => {
  const pols = [dep("dep-1", "PL"), dep("dep-2", "PT"), dep("dep-3", "PL", { inicioExercicioAtual: "2026-06-01" })];
  const votacoes: VotacaoDetalhe[] = Array.from({ length: 12 }, (_, i) => ({
    id: `cam-${i}`,
    casa: "camara",
    data: `2026-0${(i % 9) + 1}-10`,
    titulo: `PL ${i}/2026`,
    descricao: "",
    sim: 0,
    nao: 0,
    outros: 0,
    porPartido: [],
    orientacaoGoverno: "Sim",
    orientacoes: [
      { sigla: "PL", orientacao: "Não" },
      { sigla: "PT", orientacao: "Sim" },
      { sigla: "Governo", orientacao: "Sim" },
    ],
    votos: [
      { pid: "dep-1", nome: "a", partido: "PL", uf: "MG", voto: i < 10 ? "Não" : "Sim" },
      ...(i % 2 ? [] : [{ pid: "dep-2", nome: "b", partido: "PT", uf: "MG", voto: "Sim" }]),
    ],
  }));
  enriquecerVotacoes(votacoes);
  const r = calcularVotos(votacoes, pols, SEN_PRESENTE);

  it("computes participation over eligible votes only", () => {
    expect(r.metricas.get("dep-1")!.participacao).toBe(1);
    expect(r.metricas.get("dep-2")!.participacao).toBe(0.5);
    // dep-3 entered office in June: only votes from June on are eligible, and they missed all of them
    const m3 = r.metricas.get("dep-3")!;
    expect(m3.votacoesBase).toBeLessThan(12);
    expect(m3.participacao).toBe(0);
  });
  it("computes party loyalty with the 10-vote minimum", () => {
    expect(r.metricas.get("dep-1")!.fidelidade).toBeCloseTo(10 / 12);
    expect(r.metricas.get("dep-2")!.fidelidade).toBeUndefined(); // only 6 comparable votes
  });
  it("computes government alignment", () => expect(r.metricas.get("dep-1")!.governismo).toBeCloseTo(2 / 12));
  it("aggregates party totals", () => expect(votacoes[0].porPartido.find((p) => p.partido === "PL")!.nao).toBe(1));
});

describe("secret ballots", () => {
  it("reads official totals from the description", () => {
    expect(totaisDoTexto("Aprovado o PDL. Sim: 404; Não: 61; Abstenção: 1; Total: 466.")).toEqual({ sim: 404, nao: 61, outros: 1 });
    expect(totaisDoTexto("Sem totais")).toBeUndefined();
  });
  it("uses official totals when individual votes are not published", () => {
    const v: VotacaoDetalhe = {
      id: "cam-s",
      casa: "camara",
      data: "2026-09-02",
      titulo: "PDL 995/2026",
      descricao: "Indicação | Aprovado. Sim: 404; Não: 61; Abstenção: 1; Total: 466.",
      sim: 0,
      nao: 0,
      outros: 0,
      porPartido: [],
      orientacoes: [],
      votos: [{ pid: "dep-1", nome: "a", partido: "PL", uf: "MG", voto: "" }],
    };
    enriquecerVotacoes([v]);
    expect(v).toMatchObject({ sim: 404, nao: 61, outros: 1, secreta: true, porPartido: [] });
    expect(v.votos[0].voto).toBe(VOTO_SECRETO);
  });
});

describe("periods in office", () => {
  it("opens on Exercício and closes on leave, per legislature", () => {
    const hist = [
      { idLegislatura: 56, situacao: "Exercício", dataHora: "2019-02-01T00:00" },
      { idLegislatura: 57, situacao: "Exercício", dataHora: "2023-02-01T00:00" },
      { idLegislatura: 57, situacao: "Licença", dataHora: "2025-03-10T10:00" },
      { idLegislatura: 57, situacao: "Exercício", dataHora: "2025-09-01T10:00" },
    ];
    const per = periodosExercicio(hist, 57);
    expect(per).toEqual([{ ini: "2023-02-01", fim: "2025-03-10" }, { ini: "2025-09-01" }]);
    const p = dep("dep-1", "PL", { exercicio: per });
    expect(emExercicioEm(p, "2025-05-01")).toBe(false);
    expect(emExercicioEm(p, "2025-09-01")).toBe(true);
    expect(emExercicioEm(p, "2024-01-01")).toBe(true);
  });
});

describe("members without a vote record", () => {
  const base = { titulo: "PL 1/2026", descricao: "", sim: 1, nao: 0, outros: 0, porPartido: [], orientacoes: [] };

  it("lists only deputies in office on the vote date who are missing from the list", () => {
    const pols = [
      dep("dep-1", "PL"),
      dep("dep-2", "PT"),
      // On leave that day
      dep("dep-3", "PT", { exercicio: [{ ini: "2023-02-01", fim: "2026-01-10" }, { ini: "2026-04-01" }] }),
      // Took office later
      dep("dep-4", "PSD", { exercicio: [{ ini: "2026-05-01" }] }),
    ];
    const v: VotacaoDetalhe = { ...base, id: "cam-1", casa: "camara", data: "2026-03-01", votos: [{ pid: "dep-1", nome: "a", partido: "PL", uf: "SP", voto: "Sim" }] };
    marcarSemRegistro([v], pols);
    expect(v.semRegistro?.map((x) => x.pid)).toEqual(["dep-2"]);
  });

  it("leaves the Senado and votes without a list untouched", () => {
    const sen: VotacaoDetalhe = { ...base, id: "sen-1", casa: "senado", data: "2026-03-01", votos: [{ pid: "sen-1", nome: "a", partido: "PL", uf: "SP", voto: "Sim" }] };
    const vazia: VotacaoDetalhe = { ...base, id: "cam-2", casa: "camara", data: "2026-03-01", votos: [] };
    marcarSemRegistro([sen, vazia], [dep("dep-1", "PL")]);
    expect(sen.semRegistro).toBeUndefined();
    expect(vazia.semRegistro).toBeUndefined();
  });
});

describe("presence", () => {
  it("does not count sessions while on leave", () => {
    const pols = [dep("dep-1", "PL", { exercicio: [{ ini: "2026-01-01", fim: "2026-02-15" }, { ini: "2026-03-01" }] })];
    const r = calcularPresenca(
      [
        { id: "1", data: "2026-02-10", presentes: ["dep-1"] },
        { id: "2", data: "2026-02-20", presentes: [] },
        { id: "3", data: "2026-03-10", presentes: [] },
      ],
      pols,
    ).get("dep-1")!;
    expect(r).toMatchObject({ sessoes: 2, presente: 1 });
  });
  it("is never computed for state assemblies", () => {
    const r = calcularPresenca([{ id: "1", data: "2026-02-10", presentes: [] }], [{ ...dep("est-1", "PL"), casa: "assembleia" }]);
    expect(r.has("est-1")).toBe(false);
  });
  it("separates houses and respects the start of the term", () => {
    const pols = [dep("dep-1", "PL", { inicioExercicioAtual: "2026-02-01" })];
    const r = calcularPresenca(
      [
        { id: "1", data: "2026-01-10", presentes: [] },
        { id: "2", data: "2026-02-10", presentes: ["dep-1"] },
        { id: "3", data: "2026-03-10", presentes: [] },
        { id: "sen-2026-03-11", data: "2026-03-11", presentes: [] },
      ],
      pols,
    ).get("dep-1")!;
    expect(r.sessoes).toBe(2);
    expect(r.presente).toBe(1);
  });
});

describe("expenses", () => {
  const mk = (pid: string, ano: number, mes: number, valor: number, extra: Partial<Despesa> = {}): Despesa => ({
    pid,
    ano,
    mes,
    valor,
    categoria: "Combustíveis",
    fornecedor: "Posto",
    doc: "11222333000181",
    data: `${ano}-${String(mes).padStart(2, "0")}-05`,
    ...extra,
  });
  it("drops the trailing incomplete month", () => {
    const ds: Despesa[] = [];
    for (let m = 1; m <= 9; m++) ds.push(mk("a", 2026, m, 1000));
    ds.push(mk("a", 2026, 10, 100)); // October still being filed
    expect(ultimoMesCompleto(ds, new Date("2026-10-11"))).toBe("2026-09");
    expect(janela12("2026-09")).toHaveLength(12);
  });
  it("keeps legitimately low months (election period) in the window", () => {
    const ds: Despesa[] = [];
    for (let m = 1; m <= 5; m++) ds.push(mk("a", 2026, m, 1000));
    for (let m = 6; m <= 9; m++) ds.push(mk("a", 2026, m, 300)); // campaign months: real, just lower
    // only the two newest months may be trimmed, never the whole low stretch
    expect(ultimoMesCompleto(ds, new Date("2026-10-11"))).toBe("2026-07");
    expect(janela12("2026-09")[0]).toBe("2025-10");
  });
  it("flags invalid documents, duplicates and supplier concentration", () => {
    const ds = [
      mk("a", 2026, 1, 30000, { docId: "1", numeroDoc: "0001234" }),
      mk("a", 2026, 1, 30000, { docId: "2", numeroDoc: "1234" }), // same receipt reimbursed again
      mk("a", 2026, 1, 30000, { docId: "4", numeroDoc: "1235" }), // same day and value, different receipt
      mk("a", 2026, 1, 10, { docId: "6", numeroDoc: "NF" }),
      mk("a", 2026, 1, 10, { docId: "7", numeroDoc: "NF" }), // placeholder number: not checked
      mk("a", 2025, 11, 5, { docId: "8", numeroDoc: "95048", data: "2025-11-10" }),
      mk("a", 2025, 12, 5, { docId: "9", numeroDoc: "95048", data: "2025-12-10" }), // recurring bill, new month
      mk("a", 2026, 2, 500, { doc: "11222333000182", fornecedor: "X", docId: "3" }),
      mk("a", 2026, 2, 116.56, { doc: "00000000000001", fornecedor: "CELULAR FUNCIONAL", docId: "5" }), // house placeholder code
    ];
    const g = calcularGastos(ds, new Date("2026-03-15")).get("a")!;
    const regras = g.alertas.map((a) => a.regra);
    expect(regras.filter((r) => r === "duplicidade")).toHaveLength(1);
    expect(regras.filter((r) => r === "documento_invalido")).toHaveLength(1);
    expect(regras).toContain("fornecedor_concentrado");
    expect(g.total12m).toBeCloseTo(90646.56, 2);
  });
});

describe("TSE linkage", () => {
  const c = (over: Partial<CandidatoTSE>): CandidatoTSE => ({
    ano: 2022,
    sq: "1",
    nome: "JOAO DA SILVA PEREIRA",
    nomeUrna: "JOÃO PEREIRA",
    nascimento: "1970-01-01",
    uf: "MG",
    cargo: "DEPUTADO FEDERAL",
    codCargo: 6,
    partido: "PL",
    numero: "2222",
    situacao: "ELEITO POR QP",
    ...over,
  });
  const cands = [c({}), c({ ano: 2018, sq: "2" }), c({ ano: 2022, sq: "3", nome: "JOAO DA SILVA", cpf: "99999999999", nomeUrna: "JOAO" })];
  const porNasc = new Map([["1970-01-01", cands]]);
  const porUf = new Map([["MG", cands]]);
  it("links by birth date and name, one candidacy per year", () => {
    const p = dep("dep-9", "PL", { nomeCivil: "João da Silva Pereira", perfil: { nascimento: "1970-01-01" } });
    const r = vincularTSE(p, porNasc, porUf);
    expect(r.map((x) => x.sq)).toEqual(["2", "1"]);
  });
  it("accepts a candidate whose CPF matches the masked CPF", () => {
    const p = dep("dep-9", "PL", { nomeCivil: "João da Silva", cpfMascarado: "999***999", perfil: { nascimento: "1970-01-01" } });
    expect(vincularTSE(p, porNasc, porUf).some((x) => x.sq === "3")).toBe(true);
  });
  it("rejects a candidate whose CPF contradicts the masked CPF", () => {
    const p = dep("dep-9", "PL", { nomeCivil: "João da Silva", cpfMascarado: "111***111", perfil: { nascimento: "1970-01-01" } });
    expect(vincularTSE(p, porNasc, porUf).some((x) => x.sq === "3")).toBe(false);
  });
});

describe("social links", () => {
  it("normalizes and classifies", () => {
    const u = normalizaUrl("instagram.com/fulano/?hl=pt")!;
    expect(u).toBe("https://instagram.com/fulano");
    expect(plataforma(u)).toBe("instagram");
    expect(plataforma("https://x.com/fulano")).toBe("x");
    expect(handleDe("https://www.youtube.com/@canal")).toBe("canal");
    expect(normalizaUrl("@fulano")).toBeUndefined();
  });
});

describe("TSE bulk results", () => {
  it("sums first-round nominal votes per candidate across zones", () => {
    const csv = [
      '"ANO_ELEICAO";"NR_TURNO";"CD_CARGO";"SQ_CANDIDATO";"QT_VOTOS_NOMINAIS"',
      '"2022";"1";"6";"100";"1500"',
      '"2022";"1";"6";"100";"500"',
      '"2022";"2";"3";"200";"9999"',
      '"2022";"1";"7";"300";"42"',
      '"2022";"1";"11";"400";"7"',
    ].join("\r\n");
    const t = somarVotos([csv]);
    expect(t.get("100")).toBe(2000);
    expect(t.get("300")).toBe(42);
    expect(t.has("200")).toBe(false); // second round
    expect(t.has("400")).toBe(false); // municipal office
  });
  it("streams the same totals straight from a ZIP", () => {
    const csv = ['"NR_TURNO";"CD_CARGO";"SQ_CANDIDATO";"QT_VOTOS_NOMINAIS"', ...Array.from({ length: 5000 }, (_, i) => `"1";"6";"${i % 3}";"2"`)].join("\n");
    // level 0 stores the file uncompressed, so the archive spans several input slices
    const zip = zipSync({ "votacao_candidato_munzona_2022_BR.csv": [strToU8(csv), { level: 0 }], "leiame.pdf": strToU8("x") });
    const t = somarVotosZip(zip);
    expect([...t.values()].reduce((a, b) => a + b, 0)).toBe(10000);
    expect(t.get("0")).toBe(3334);
  });
  it("does not double count the national file that repeats the state files", () => {
    const cab = '"NR_TURNO";"CD_CARGO";"SQ_CANDIDATO";"QT_VOTOS_NOMINAIS"';
    const al = `${cab}\n"1";"6";"160541";"219452"`;
    const zip = zipSync({
      "votacao_candidato_munzona_2022_AL.csv": strToU8(al),
      "votacao_candidato_munzona_2022_BRASIL.csv": strToU8(al),
    });
    expect(somarVotosZip(zip).get("160541")).toBe(219452);
  });
  it("only checks real-looking documents", () => {
    expect(documentoVerificavel("00000000000001")).toBe(false);
    expect(documentoVerificavel("11222333000181")).toBe(true);
    expect(documentoVerificavel("123")).toBe(false);
  });
});

describe("lifelong candidacies", () => {
  const c = (o: Partial<CandidatoTSE>): CandidatoTSE => ({
    ano: 2022,
    sq: "1",
    nome: "FULANO",
    nomeUrna: "FULANO",
    uf: "MG",
    cargo: "DEPUTADO FEDERAL",
    codCargo: 6,
    partido: "PL",
    numero: "2222",
    situacao: "ELEITO",
    ...o,
  });
  it("keeps one record per election, preferring the richer one", () => {
    const l = juntarCandidaturas([c({ votos: 1000, patrimonio: 5 })], [c({}), c({ ano: 2016, sq: "9", codCargo: 13, cargo: "VEREADOR" })]);
    expect(l.map((x) => [x.ano, x.votos, x.patrimonio])).toEqual([
      [2016, undefined, undefined],
      [2022, 1000, 5],
    ]);
  });
  it("only follows identity keys when the recent candidacies agree on the birth date", () => {
    expect(chavesDaPessoa("p", [c({ titulo: "0123", nascimento: "1970-01-01" })]).titulos).toEqual(["123"]);
    expect(chavesDaPessoa("p", [c({ titulo: "1", nascimento: "1970-01-01" }), c({ titulo: "2", nascimento: "1980-01-01" })]).titulos).toEqual([]);
  });
});

describe("companies by CNPJ", () => {
  it("removes the owner's CPF from micro-entrepreneur names", async () => {
    const { limparNomeEmpresa } = await import("../empresas");
    expect(limparNomeEmpresa("MARIA DA SILVA 12345678909")).toBe("MARIA DA SILVA");
    expect(limparNomeEmpresa("JOSE 123.456.789-09 - ME")).toBe("JOSE - ME");
    expect(limparNomeEmpresa("GRAFICA BOA LTDA")).toBe("GRAFICA BOA LTDA");
  });

  it("links only valid CNPJs, never people, and adds campaigns without double counting", async () => {
    const { montarEmpresas, balde } = await import("../empresas");
    const d = (pid: string, doc: string, valor: number, data: string, fornecedor = "GRAFICA BOA LTDA") => ({
      pid,
      ano: 2026,
      mes: Number(data.slice(5, 7)),
      data,
      categoria: "Divulgação",
      fornecedor,
      doc,
      valor,
    });
    const r = montarEmpresas({
      despesas: [
        d("dep-1", "11.222.333/0001-81", 100, "2026-02-01"),
        d("dep-1", "11222333000181", 50, "2026-05-01", "GRAFICA BOA"),
        d("dep-2", "11222333000181", 30, "2026-03-01"),
        // A person (CPF) and an invalid CNPJ are never companies
        d("dep-1", "12345678909", 999, "2026-03-01", "JOAO"),
        d("dep-1", "11222333000182", 999, "2026-03-01", "ERRADA"),
      ],
      campanhas: [
        { cnpj: "11222333000181", nome: "GRAFICA BOA LTDA", papel: "fornecedor", ano: 2022, sq: "9", valor: 500 },
        { cnpj: "11222333000181", nome: "GRAFICA BOA LTDA", papel: "fornecedor", ano: 2022, sq: "9", valor: 20 },
        // A campaign of someone not followed is not linked
        { cnpj: "11222333000181", nome: "GRAFICA BOA LTDA", papel: "fornecedor", ano: 2022, sq: "404", valor: 7 },
      ],
      donoCandidatura: new Map([["2022:9", "dep-2"]]),
      nomes: new Map([
        ["dep-1", "Ana"],
        ["dep-2", "Bia"],
      ]),
      periodoCota: { inicio: "2025-01-01", fim: "2026-09-30" },
    });
    expect(r.indice).toEqual([{ cnpj: "11222333000181", nome: "GRAFICA BOA LTDA", cota: 180, campanhas: 520, pessoas: 2 }]);
    const e = r.baldes.get(balde("11222333000181"))!["11222333000181"];
    expect(e.nomes).toEqual(["GRAFICA BOA"]);
    expect(e.cota?.porPessoa.map((x) => [x.pid, x.valor, x.n, x.primeira, x.ultima])).toEqual([
      ["dep-1", 150, 2, "2026-02-01", "2026-05-01"],
      ["dep-2", 30, 1, "2026-03-01", "2026-03-01"],
    ]);
    expect(e.campanhas?.registros).toEqual([{ pid: "dep-2", nome: "Bia", papel: "fornecedor", ano: 2022, valor: 520 }]);
  });
});
