/**
 * Contract tests: each collector receives payloads shaped exactly like the official APIs
 * (shapes verified against the live endpoints in October 2026) through a mocked network,
 * and must produce correct normalized records.
 */
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { zipSync } from "fflate";
import { sanitizar, validarCitacoes } from "../ai";
import { validarExplicacao } from "../explicar";

beforeAll(async () => {
  process.env.PIPELINE_CACHE_DIR = await mkdtemp(path.join(os.tmpdir(), "raio-x-cache-"));
});
afterEach(() => vi.unstubAllGlobals());

type Rota = [RegExp, unknown, Record<string, string>?];
function mockFetch(rotas: Rota[]) {
  const chamadas: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    chamadas.push(url);
    const r = rotas.find(([re]) => re.test(url));
    const body: BodyInit = r ? (r[1] instanceof Uint8Array ? new Blob([r[1] as Uint8Array<ArrayBuffer>]) : JSON.stringify(r[1])) : "";
    return new Response(r ? body : "not found", { status: r ? 200 : 404, headers: { "content-type": "application/json", ...(r?.[2] ?? {}) } });
  });
  return chamadas;
}

describe("Senado collector", () => {
  it("normalizes senators, roll calls (with per-day presence), CEAPS and bills", async () => {
    const parl = (cod: string, nome: string, partido: string) => ({
      IdentificacaoParlamentar: {
        CodigoParlamentar: cod,
        NomeParlamentar: nome,
        NomeCompletoParlamentar: `${nome} Completo`,
        SiglaPartidoParlamentar: partido,
        UfParlamentar: "PR",
        UrlFotoParlamentar: `http://www.senado.leg.br/senadores/img/fotos-oficiais/senador${cod}.jpg`,
        SexoParlamentar: "Feminino",
      },
    });
    mockFetch([
      [/senador\/lista\/atual\.json/, { ListaParlamentarEmExercicio: { Parlamentares: { Parlamentar: [parl("1", "Ana", "PL"), parl("2", "Bia", "PT")] } } }],
      [/senador\/1\.json/, { DetalheParlamentar: { Parlamentar: { DadosBasicosParlamentar: { DataNascimento: "1970-05-02", Naturalidade: "Curitiba", UfNaturalidade: "PR" } } } }],
      [
        /senador\/1\/mandatos\.json/,
        {
          MandatoParlamentar: {
            Parlamentar: {
              Mandatos: {
                Mandato: {
                  DescricaoParticipacao: "Titular",
                  UfParlamentar: "PR",
                  PrimeiraLegislaturaDoMandato: { DataInicio: "2019-02-01", DataFim: "2023-01-31" },
                  SegundaLegislaturaDoMandato: { DataFim: "2027-01-31" },
                },
              },
            },
          },
        },
      ],
      [
        /dadosabertos\/votacao\?/,
        [
          {
            codigoSessaoVotacao: 99,
            dataSessao: "2026-09-10T15:00:00",
            identificacao: "PLP 74/2026",
            ementa: "Altera o regime fiscal",
            resultadoVotacao: "A",
            votacaoSecreta: "N",
            totalVotosSim: 1,
            totalVotosNao: 0,
            codigoMateria: 555,
            votos: [
              { codigoParlamentar: 1, nomeParlamentar: "Ana", siglaPartidoParlamentar: "PL", siglaUFParlamentar: "PR", siglaVotoParlamentar: "Sim" },
              { codigoParlamentar: 2, nomeParlamentar: "Bia", siglaPartidoParlamentar: "PT", siglaUFParlamentar: "PR", siglaVotoParlamentar: "LS" },
            ],
          },
        ],
      ],
      [
        /despesas_ceaps\/2026/,
        [
          {
            id: 1,
            ano: 2026,
            mes: 3,
            codSenador: 1,
            nomeSenador: "ANA",
            tipoDespesa: "Passagens aéreas",
            cpfCnpj: "11.222.333/0001-81",
            fornecedor: "Cia",
            data: "2026-03-02",
            valorReembolsado: 1500.5,
          },
          { id: 2, ano: 2026, mes: 3, codSenador: 777, nomeSenador: "FORA DO MANDATO", tipoDespesa: "X", fornecedor: "Y", valorReembolsado: 10 },
        ],
      ],
      [
        /processo\?codigoParlamentarAutor=1/,
        [
          {
            id: 10,
            codigoMateria: 555,
            identificacao: "PL 12/2026",
            ementa: "Cria programa",
            dataApresentacao: "2026-02-01",
            situacaoAtual: "Transformada em Norma Jurídica",
            normaGerada: "Lei 1/2026",
          },
          { id: 11, identificacao: "REQ 3/2026", ementa: "Requer informações", dataApresentacao: "2026-02-02" },
        ],
      ],
    ]);
    const { coletarSenado } = await import("../sources/senado");
    const r = await coletarSenado({ hoje: new Date("2026-10-11"), diasVotos: 365, anosGastos: [2026] });

    const ana = r.politicos.find((p) => p.id === "sen-1")!;
    expect(ana.foto).toMatch(/^https:/);
    expect(ana.sexo).toBe("F");
    expect(ana.perfil?.nascimento).toBe("1970-05-02");
    expect(ana.carreira?.[0]).toMatchObject({ cargo: "Senador(a)", inicio: 2019, fim: 2027 });
    expect(ana.proposicoesTotal).toBe(1); // requests are not bills
    expect(ana.proposicoesLei).toBe(1);

    expect(r.votacoes[0]).toMatchObject({ id: "sen-99", titulo: "PLP 74/2026", resultado: "Aprovada" });
    const dia = r.sessoes[0];
    expect(dia.presentes).toEqual(["sen-1"]);
    expect(dia.justificadas).toEqual(["sen-2"]); // LS = licença saúde

    expect(r.despesas).toHaveLength(1);
    expect(r.despesas[0]).toMatchObject({ pid: "sen-1", valor: 1500.5, doc: "11222333000181" });
  });
});

describe("Câmara collector", () => {
  it("builds careers, presence, roll calls with orientations and bills", async () => {
    vi.resetModules();
    const dep = { id: 204379, nome: "Fulano", siglaPartido: "PP", siglaUf: "AP", idLegislatura: 57, urlFoto: "https://www.camara.leg.br/internet/deputado/bandep/204379.jpg" };
    mockFetch([
      [/\/deputados\?itens=100/, { dados: [dep], links: [] }],
      [
        /\/deputados\/204379$/,
        {
          dados: {
            id: 204379,
            nomeCivil: "Fulano de Tal",
            cpf: "742***287",
            sexo: "M",
            dataNascimento: "1980-01-02",
            municipioNascimento: "Macapá",
            ufNascimento: "AP",
            escolaridade: "Superior",
            redeSocial: ["https://instagram.com/fulano"],
            ultimoStatus: {
              nomeEleitoral: "Fulano",
              siglaPartido: "PP",
              siglaUf: "AP",
              idLegislatura: 57,
              urlFoto: dep.urlFoto,
              gabinete: { sala: "10", predio: "4", telefone: "3215-0000", email: "dep.fulano@camara.leg.br" },
            },
          },
        },
      ],
      [
        /historico-old/,
        {
          dados: [
            { idLegislatura: 56, siglaPartido: "PP", siglaUf: "AP", situacao: "Exercício", dataHora: "2019-02-01T00:00" },
            { idLegislatura: 57, siglaPartido: "PP", siglaUf: "AP", situacao: "Exercício", dataHora: "2023-02-01T00:00" },
          ],
        },
      ],
      [
        /mandatosExternos/,
        {
          dados: [
            { cargo: "Vereador(a)", siglaUf: "AP", municipio: "Macapá", anoInicio: "2013", anoFim: "2016", siglaPartidoEleicao: "PP" },
            { cargo: "Vereador(a)", siglaUf: "AP", anoInicio: "1882", anoFim: "1988" },
          ],
        },
      ],
      [/\/orgaos\?/, { dados: [{ siglaOrgao: "CCJC", nomeOrgao: "Comissão de Constituição e Justiça", titulo: "Titular", dataFim: null }], links: [] }],
      [/\/frentes/, { dados: [{ titulo: "Frente Parlamentar da Saúde" }] }],
      [/\/profissoes/, { dados: [{ titulo: "Advogado" }] }],
      [/\/eventos\?idOrgao=180/, { dados: [{ id: 1, dataHoraInicio: "2026-05-05T14:00", descricaoTipo: "Sessão Deliberativa", situacao: "Encerrada" }], links: [] }],
      [/\/eventos\/1\/deputados/, { dados: [{ id: 204379 }] }],
      [/\/votacoes\?idOrgao=180/, { dados: [{ id: "2611313-34", dataHoraRegistro: "2026-09-03T17:29:39", descricao: "Aprovado. Sim: 300; Não: 100", aprovacao: 1 }], links: [] }],
      [
        /\/votacoes\/2611313-34$/,
        {
          dados: {
            idEvento: 82965,
            proposicoesAfetadas: [{ id: 2600000, siglaTipo: "PLP", numero: 74, ano: 2026, ementa: "Regime fiscal" }],
            ultimaAberturaVotacao: { descricao: "Votação do Requerimento de retirada de pauta" },
          },
        },
      ],
      [/\/votacoes\/2611313-34\/votos/, { dados: [{ tipoVoto: "Não", deputado_: { id: 204379, nome: "Fulano", siglaPartido: "PP", siglaUf: "AP" } }] }],
      [
        /\/votacoes\/2611313-34\/orientacoes/,
        {
          dados: [
            { siglaPartidoBloco: "Bl UniPpPsd...", orientacaoVoto: "Sim" },
            { siglaPartidoBloco: "Governo", orientacaoVoto: "Sim" },
          ],
        },
      ],
      [
        /proposicoes-2025\.json/,
        {
          dados: [
            {
              id: 900,
              siglaTipo: "PL",
              numero: 1,
              ano: 2025,
              ementa: "Institui",
              dataApresentacao: "2025-03-01",
              ultimoStatus: { descricaoSituacao: "Transformado em Norma Jurídica" },
            },
            { id: 901, siglaTipo: "PEC", numero: 2, ano: 2025, ementa: "Altera", dataApresentacao: "2025-06-01", ultimoStatus: { descricaoSituacao: "Aguardando Parecer" } },
            { id: 902, siglaTipo: "REQ", numero: 3, ano: 2025, ementa: "Requer", dataApresentacao: "2025-07-01" },
            { id: 903, siglaTipo: "PL", numero: 4, ano: 2025, ementa: "Outro", dataApresentacao: "2025-08-01" },
            { id: 904, siglaTipo: "MPV", numero: 1300, ano: 2025, ementa: "Abre crédito", dataApresentacao: "2025-09-01" },
            { id: 905, siglaTipo: "PLP", numero: 9, ano: 2025, ementa: "Orçamento", dataApresentacao: "2025-10-01" },
          ],
        },
      ],
      [
        /proposicoesAutores-2025\.json/,
        {
          dados: [
            { idProposicao: 900, idDeputadoAutor: 204379, proponente: 1, ordemAssinatura: 1 },
            { idProposicao: 901, uriAutor: "https://dadosabertos.camara.leg.br/api/v2/deputados/204379", proponente: 1, ordemAssinatura: 2 },
            { idProposicao: 902, idDeputadoAutor: 204379, proponente: 1, ordemAssinatura: 1 },
            { idProposicao: 903, idDeputadoAutor: 204379, proponente: 0, ordemAssinatura: 3 },
            { idProposicao: 905, nomeAutor: "Poder Executivo", tipoAutor: "Órgão do Poder Executivo", proponente: 1, ordemAssinatura: 1 },
          ],
        },
      ],
      [/proposicoes(Autores)?-\d{4}\.json/, { dados: [] }],
    ]);
    const { coletarCamara } = await import("../sources/camara");
    const r = await coletarCamara({ hoje: new Date("2026-10-11"), diasVotos: 365, anosGastos: [] });
    const p = r.politicos[0];

    expect(p).toMatchObject({ id: "dep-204379", nome: "Fulano", partido: "PP", cpfMascarado: "742***287", inicioExercicioAtual: "2023-02-01" });
    expect(p.carreira?.map((c) => [c.cargo, c.inicio])).toEqual([
      ["Vereador(a)", 2013],
      ["Deputado(a) Federal", 2019],
      ["Deputado(a) Federal", 2023],
    ]);
    expect(p.perfil?.email).toBe("dep.fulano@camara.leg.br");
    expect(p.comissoes?.[0]).toMatchObject({ sigla: "CCJC", atual: true });

    expect(r.sessoes).toEqual([{ id: "1", data: "2026-05-05", presentes: ["dep-204379"] }]);
    expect(r.votacoes[0]).toMatchObject({
      id: "cam-2611313-34",
      titulo: "PLP 74/2026",
      orientacaoGoverno: "Sim",
      resultado: "Aprovada",
      materia: "cam-2600000",
      objeto: "Votação do Requerimento de retirada de pauta",
    });

    // Whole career from the yearly files: requests and supporters who did not propose are left out
    expect(p.proposicoesTotal).toBe(2);
    expect(p.proposicoesPorTipo).toEqual({ PL: 1, PEC: 1 });
    expect(p.proposicoesLei).toBe(1);
    expect(p.proposicoesLista?.map((x) => x.id)).toEqual(["901", "900"]);
    expect(p.proposicoesLista?.[1]).toMatchObject({ virouLei: true, url: "https://www.camara.leg.br/propostas-legislativas/900", papel: "autor" });
    expect(p.proposicoesLista?.[0].papel).toBe("coautor");
    expect(p.proposicoesPorPapel).toEqual({ autor: 1, coautor: 1 });

    // Medidas provisórias and the Executive's own bills, newest first
    expect(r.atosExecutivo?.map((a) => [a.id, a.tipo, a.origem])).toEqual([
      ["905", "PLP", "projeto-do-executivo"],
      ["904", "MPV", "medida-provisoria"],
    ]);
  });
});

describe("HTTP client", () => {
  it("refuses responses larger than the cap instead of loading them into memory", async () => {
    mockFetch([[/grande/, { itens: "x".repeat(5000) }]]);
    const { getJson } = await import("../lib/http");
    await expect(getJson("https://exemplo.gov.br/grande", { ttlHours: 0, maxBytes: 1000 })).rejects.toThrow(/maior que 1000 bytes/);
  });
});

describe("Bills voted collector", () => {
  it("reads Câmara bill details, themes and authors", async () => {
    mockFetch([
      [
        /proposicoes\/2351506\/temas/,
        {
          dados: [
            { codTema: 40, tema: "Economia", relevancia: 0 },
            { codTema: 43, tema: "Finanças Públicas e Orçamento", relevancia: 0 },
          ],
        },
      ],
      [
        /proposicoes\/2351506\/autores/,
        {
          dados: [
            { uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/204379", nome: "Fulano", codTipo: 10000, tipo: "Deputado(a)", ordemAssinatura: 2, proponente: 1 },
            { uri: "https://dadosabertos.camara.leg.br/api/v2/deputados/1", nome: "Primeira", codTipo: 10000, tipo: "Deputado(a)", ordemAssinatura: 1, proponente: 1 },
          ],
        },
      ],
      [
        /proposicoes\/2351506$/,
        {
          dados: {
            id: 2351506,
            siglaTipo: "PEC",
            numero: 5,
            ano: 2023,
            ementa: "Acrescenta § 4º-A ao art. 150 da Constituição Federal.",
            ementaDetalhada: "Estende a imunidade tributária a templos.",
            keywords: "_Alteração, Constituição Federal, imunidade tributária, templo",
            dataApresentacao: "2023-03-02T16:20",
            urlInteiroTeor: "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=1",
            statusProposicao: { descricaoSituacao: "Aguardando Apreciação pelo Senado Federal" },
          },
        },
      ],
    ]);
    const { coletarMaterias } = await import("../sources/materias");
    const { materias } = await coletarMaterias([{ materia: "cam-2351506" } as never]);
    expect(materias[0]).toMatchObject({
      id: "cam-2351506",
      sigla: "PEC 5/2023",
      ementaDetalhada: "Estende a imunidade tributária a templos.",
      palavrasChave: ["Alteração", "Constituição Federal", "imunidade tributária", "templo"],
      temas: ["Economia", "Finanças Públicas e Orçamento"],
      autoresTotal: 2,
      apresentacao: "2023-03-02",
      url: "https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2351506",
    });
    expect(materias[0].autores?.[0]).toEqual({ nome: "Primeira", pid: "dep-1", tipo: "Deputado(a)" });
  });

  it("reads the Senado explanation from the legacy endpoint when the current one has nothing", async () => {
    mockFetch([
      [
        /materia\/158930\.json/,
        {
          DetalheMateria: {
            Materia: {
              IdentificacaoMateria: { DescricaoIdentificacaoMateria: "PL 2338/2023" },
              DadosBasicosMateria: {
                EmentaMateria: "Dispõe sobre o uso da Inteligência Artificial.",
                ExplicacaoEmentaMateria: "Cria regras para sistemas de IA.",
                IndexacaoMateria: "Normas, inteligência artificial, direitos",
              },
              Assunto: { AssuntoEspecifico: { Descricao: "Ciência, Tecnologia e Informática" } },
            },
          },
        },
      ],
    ]);
    const { materiaSenado } = await import("../sources/materias");
    expect(await materiaSenado("158930")).toMatchObject({
      id: "sen-158930",
      sigla: "PL 2338/2023",
      ementa: "Dispõe sobre o uso da Inteligência Artificial.",
      explicacao: "Cria regras para sistemas de IA.",
      palavrasChave: ["Normas", "inteligência artificial", "direitos"],
      temas: ["Ciência, Tecnologia e Informática"],
    });
  });
});

describe("AI guardrails", () => {
  const falas = new Set(["f1", "f2"]);
  const votos = new Set(["cam-1"]);
  it("drops citations that do not point to provided sources", () => {
    expect(
      validarCitacoes(
        [
          { ref: "f1", tipo: "fala" },
          { ref: "inventada", tipo: "fala" },
          { ref: "cam-1", tipo: "voto" },
          { ref: "f2", tipo: "voto" },
        ],
        falas,
        votos,
      ).map((c) => c.ref),
    ).toEqual(["f1", "cam-1"]);
  });
  it("drops uncited claims and contradictions with a single citation", () => {
    const r = sanitizar(
      {
        resumo: "x".repeat(900),
        temas: [
          { tema: "Saúde", posicao: "Defende mais leitos", citacoes: [{ ref: "f1", tipo: "fala" }] },
          { tema: "Sem fonte", posicao: "Inventado", citacoes: [] },
        ],
        contradicoes: [
          {
            descricao: "Disse A, votou B",
            citacoes: [
              { ref: "f1", tipo: "fala" },
              { ref: "cam-1", tipo: "voto" },
            ],
          },
          { descricao: "Fraca", citacoes: [{ ref: "f2", tipo: "fala" }] },
        ],
        mudancas: [{ descricao: "Mudou", antes: [{ ref: "f1", tipo: "fala" }], depois: [] }],
      },
      falas,
      votos,
    );
    expect(r.resumo.length).toBe(700);
    expect(r.temas.map((t) => t.tema)).toEqual(["Saúde"]);
    expect(r.contradicoes).toHaveLength(1);
    expect(r.mudancas).toHaveLength(0);
  });
});

describe("Plain-language explanation guardrails", () => {
  const m = {
    id: "cam-1",
    casa: "camara" as const,
    sigla: "PL 1/2026",
    ementa: "Altera a Lei nº 9.605, de 12 de fevereiro de 1998, para aumentar a pena de quem maltrata cães e gatos.",
    url: "https://www.camara.leg.br",
  };
  const ok = {
    resumo: "Aumenta a pena para quem maltrata cães e gatos.",
    mudancas: ["A lei de crimes ambientais (Lei 9.605) fica mais dura."],
    trechos: ["aumentar a pena de quem maltrata cães e gatos"],
  };

  it("accepts an explanation grounded on verbatim excerpts", () => {
    const r = validarExplicacao(ok, m, "modelo");
    expect(r).toMatchObject({ materia: "cam-1", resumo: ok.resumo, trechos: ok.trechos, modelo: "modelo" });
  });
  it("rejects excerpts that are not in the official text", () => {
    expect(validarExplicacao({ ...ok, trechos: ["pena de dez anos para quem maltrata"] }, m, "x")).toEqual({ erro: "nenhum trecho copiado dos textos oficiais" });
  });
  it("rejects numbers that the official text does not contain", () => {
    expect(validarExplicacao({ ...ok, resumo: "A pena passa a ser de 5 anos." }, m, "x")).toMatchObject({ erro: expect.stringContaining("5") });
  });
  it("rejects value judgements and removes em dashes", () => {
    expect(validarExplicacao({ ...ok, resumo: "Uma mudança absurda na lei." }, m, "x")).toEqual({ erro: "palavra de juízo de valor" });
    expect(validarExplicacao({ ...ok, resumo: "Aumenta a pena — para quem maltrata." }, m, "x")).toMatchObject({ resumo: "Aumenta a pena, para quem maltrata." });
  });
});

/** A TSE-style archive: Latin-1, ";"-separated, every field quoted. */
function zipTse(arquivos: Record<string, Record<string, string>[]>) {
  const conteudo: Record<string, Uint8Array> = {};
  for (const [nome, linhas] of Object.entries(arquivos)) {
    const cols = Object.keys(linhas[0]);
    const texto = [cols, ...linhas.map((l) => cols.map((c) => l[c]))].map((r) => r.map((x) => `"${x}"`).join(";")).join("\r\n");
    conteudo[nome] = Uint8Array.from([...texto].map((ch) => ch.charCodeAt(0)));
  }
  return zipSync(conteudo);
}

describe("TSE lifelong history", () => {
  const cand = (o: Record<string, string>) => ({
    ANO_ELEICAO: "",
    SQ_CANDIDATO: "",
    NR_TITULO_ELEITORAL_CANDIDATO: "",
    NR_CPF_CANDIDATO: "",
    NM_CANDIDATO: "FULANA DE TAL",
    NM_URNA_CANDIDATO: "FULANA",
    DT_NASCIMENTO: "02/05/1970",
    SG_UF: "MG",
    NM_UE: "BELO HORIZONTE",
    CD_CARGO: "13",
    DS_CARGO: "VEREADOR",
    SG_PARTIDO: "PSDB",
    NR_CANDIDATO: "45123",
    NR_TURNO: "1",
    DS_SIT_TOT_TURNO: "ELEITO POR QP",
    DS_SITUACAO_CANDIDATURA: "APTO",
    ...o,
  });

  it("follows the voter registration number across years and offices, and adds assets", async () => {
    const z2016 = zipTse({
      "consulta_cand_2016_MG.csv": [
        cand({ SQ_CANDIDATO: "130001", NR_TITULO_ELEITORAL_CANDIDATO: "012345678901" }),
        // Same name and birth date, different título: another person, ignored
        cand({ SQ_CANDIDATO: "130002", NR_TITULO_ELEITORAL_CANDIDATO: "999999999999" }),
      ],
      "consulta_cand_2016_BRASIL.csv": [cand({ SQ_CANDIDATO: "130001", NR_TITULO_ELEITORAL_CANDIDATO: "012345678901" })],
    });
    const bens2016 = zipTse({
      "bem_candidato_2016_MG.csv": [{ SQ_CANDIDATO: "130001", DS_TIPO_BEM_CANDIDATO: "Casa", DS_BEM_CANDIDATO: "Casa em BH", VR_BEM_CANDIDATO: "250000,00" }],
    });
    const z2020 = zipTse({
      "consulta_cand_2020_MG.csv": [
        cand({
          SQ_CANDIDATO: "200001",
          NR_TITULO_ELEITORAL_CANDIDATO: "12345678901",
          CD_CARGO: "11",
          DS_CARGO: "PREFEITO",
          SG_PARTIDO: "PL",
          NR_TURNO: "1",
          DS_SIT_TOT_TURNO: "2º TURNO",
        }),
        cand({
          SQ_CANDIDATO: "200001",
          NR_TITULO_ELEITORAL_CANDIDATO: "12345678901",
          CD_CARGO: "11",
          DS_CARGO: "PREFEITO",
          SG_PARTIDO: "PL",
          NR_TURNO: "2",
          DS_SIT_TOT_TURNO: "NÃO ELEITO",
        }),
      ],
    });
    mockFetch([
      [/consulta_cand_2016\.zip/, z2016],
      [/bem_candidato_2016\.zip/, bens2016],
      [/consulta_cand_2020\.zip/, z2020],
    ]);
    const { coletarHistoricoTSE } = await import("../sources/tse-historico");
    const r = await coletarHistoricoTSE([{ pid: "dep-1", titulos: ["12345678901"], cpfs: [], nascimento: "1970-05-02", nomes: ["Fulana de Tal"] }], [2016, 2020]);
    const l = r.porPessoa.get("dep-1")!;
    expect(l.map((c) => [c.ano, c.cargo, c.municipio, c.partido, c.situacao])).toEqual([
      [2016, "VEREADOR", "BELO HORIZONTE", "PSDB", "ELEITO POR QP"],
      // The run-off row wins over the first round
      [2020, "PREFEITO", "BELO HORIZONTE", "PL", "NÃO ELEITO"],
    ]);
    expect(l[0]).toMatchObject({ patrimonio: 250000, bens: [{ tipo: "Casa", valor: 250000 }] });
    expect(r.arquivos).toHaveLength(3);
  });

  it("drops identity keys shared by two people", async () => {
    const { indicesIdentidade } = await import("../sources/tse-historico");
    const idx = indicesIdentidade([
      { pid: "a", titulos: ["1"], cpfs: ["11144477735"], nomes: [] },
      { pid: "b", titulos: ["2"], cpfs: ["11144477735"], nomes: [] },
    ]);
    expect(idx.porCpf.has("11144477735")).toBe(false);
    expect(idx.porTitulo.get("1")).toBe("a");
  });
});

describe("TSE Presidency", () => {
  const pres = (o: Record<string, string>) => ({
    SQ_CANDIDATO: "",
    NR_TITULO_ELEITORAL_CANDIDATO: "",
    NR_CPF_CANDIDATO: "",
    NM_CANDIDATO: "MARIA DAS DORES",
    NM_URNA_CANDIDATO: "MARIA",
    DT_NASCIMENTO: "01/01/1960",
    SG_UF: "BR",
    NM_UE: "BRASIL",
    CD_CARGO: "1",
    DS_CARGO: "PRESIDENTE",
    SG_PARTIDO: "AAA",
    NR_CANDIDATO: "10",
    NR_TURNO: "1",
    DS_SIT_TOT_TURNO: "2º TURNO",
    DS_SITUACAO_CANDIDATURA: "APTO",
    ...o,
  });

  it("reads only the national file, keeps the run-off and joins each person across years", async () => {
    const z2018 = zipTse({
      "consulta_cand_2018_BR.csv": [
        pres({ SQ_CANDIDATO: "1", NR_TITULO_ELEITORAL_CANDIDATO: "111" }),
        pres({ SQ_CANDIDATO: "1", NR_TITULO_ELEITORAL_CANDIDATO: "111", NR_TURNO: "2", DS_SIT_TOT_TURNO: "ELEITO" }),
        pres({ SQ_CANDIDATO: "2", NR_TITULO_ELEITORAL_CANDIDATO: "222", NM_CANDIDATO: "JOSE", NM_URNA_CANDIDATO: "ZÉ", DS_SIT_TOT_TURNO: "NÃO ELEITO" }),
        // Vice-president rows are not candidacies for President
        pres({ SQ_CANDIDATO: "3", CD_CARGO: "2", DS_CARGO: "VICE-PRESIDENTE" }),
      ],
      // A deputy in a state file, and the national file repeating everyone: both ignored here
      "consulta_cand_2018_SP.csv": [pres({ SQ_CANDIDATO: "9", CD_CARGO: "6", SG_UF: "SP" })],
      "consulta_cand_2018_BRASIL.csv": [pres({ SQ_CANDIDATO: "1", NR_TITULO_ELEITORAL_CANDIDATO: "111" })],
    });
    const z2022 = zipTse({
      // Same person with only the CPF this time, joined through the CPF seen together with the título
      "consulta_cand_2022_BR.csv": [pres({ SQ_CANDIDATO: "50", NR_CPF_CANDIDATO: "11144477735", DS_SIT_TOT_TURNO: "NÃO ELEITO" })],
    });
    const z2018b = zipTse({ "consulta_cand_2018_BR.csv": [pres({ SQ_CANDIDATO: "1", NR_TITULO_ELEITORAL_CANDIDATO: "111", NR_CPF_CANDIDATO: "11144477735" })] });
    mockFetch([
      [/consulta_cand_2018\.zip/, z2018],
      [/consulta_cand_2022\.zip/, z2022],
    ]);
    const { coletarCandidaturasPresidente, agruparPresidenciaveis } = await import("../sources/tse-historico");
    const r = await coletarCandidaturasPresidente([2018, 2022]);
    expect(r.candidaturas.map((c) => [c.ano, c.sq, c.situacao])).toEqual([
      [2018, "1", "ELEITO"],
      [2018, "2", "NÃO ELEITO"],
      [2022, "50", "NÃO ELEITO"],
    ]);

    // The link título <-> CPF comes from a row that carries both
    const ponte = await (async () => {
      mockFetch([[/consulta_cand_2018\.zip/, z2018b]]);
      return (await coletarCandidaturasPresidente([2018])).candidaturas[0];
    })();
    const { novas, donoPorCandidatura } = agruparPresidenciaveis([...r.candidaturas, ponte], [{ pid: "sen-7", titulos: ["222"], cpfs: [], nomes: [] }]);
    const maria = donoPorCandidatura.get("2018:1")!;
    expect(maria).toMatch(/^pres-[0-9a-f]{12}$/);
    expect(donoPorCandidatura.get("2022:50")).toBe(maria);
    // Someone already followed keeps their profile id
    expect(donoPorCandidatura.get("2018:2")).toBe("sen-7");
    expect(novas.map((n) => n.pid)).toEqual([maria]);
    // The id never contains the título or CPF
    expect(maria).not.toMatch(/111|11144477735/);
  });

  it("builds elections and acts without ranking anyone beyond the official result", async () => {
    const { montarPresidencia } = await import("../presidencia");
    const c = (ano: number, sq: string, nomeUrna: string, situacao: string) => ({
      ano,
      sq,
      nome: nomeUrna,
      nomeUrna,
      uf: "BR",
      cargo: "PRESIDENTE",
      codCargo: 1,
      partido: "X",
      numero: "1",
      situacao,
    });
    const p = montarPresidencia({
      hoje: new Date("2026-10-12"),
      candidaturas: [c(2022, "1", "BETA", "NÃO ELEITO"), c(2022, "2", "ALFA", "ELEITO"), c(2022, "3", "GAMA", "NÃO ELEITO")],
      donoPorCandidatura: new Map([
        ["2022:1", "pres-b"],
        ["2022:2", "pres-a"],
        ["2022:3", "dep-9"],
      ]),
      historico: new Map(),
      perfis: new Set(["dep-9"]),
      atos: [
        { id: "2", tipo: "MPV", ementa: "x", data: "2026-02-01", origem: "medida-provisoria" },
        { id: "1", tipo: "PL", ementa: "y", data: "2025-03-01", origem: "projeto-do-executivo" },
      ],
    });
    expect(p.eleicoes[0].candidatos.map((x) => [x.nomeUrna, x.resultado])).toEqual([
      ["Alfa", "eleito"],
      ["Beta", "nao-eleito"],
      ["Gama", "nao-eleito"],
    ]);
    expect(p.pessoas.find((x) => x.id === "dep-9")?.perfil).toBe("dep-9");
    expect(p.pessoas.find((x) => x.id === "pres-a")?.perfil).toBeUndefined();
    expect(p.atosPorAno).toEqual([
      { ano: 2025, medidasProvisorias: 0, projetos: 1 },
      { ano: 2026, medidasProvisorias: 1, projetos: 0 },
    ]);
  });
});

describe("TSE campaign finance", () => {
  it("adds up money by origin, names people without CPF and keeps companies' CNPJ", async () => {
    const z = zipTse({
      "receitas_candidatos_2022_MG.csv": [
        {
          SQ_CANDIDATO: "1",
          NR_CPF_CNPJ_DOADOR: "12345678901",
          NM_DOADOR: "JOAO DA SILVA",
          DS_FONTE_RECEITA: "OUTROS RECURSOS",
          DS_ORIGEM_RECEITA: "Recursos de pessoas físicas",
          VR_RECEITA: "1000,00",
        },
        {
          SQ_CANDIDATO: "1",
          NR_CPF_CNPJ_DOADOR: "11222333000181",
          NM_DOADOR: "DIRECAO NACIONAL",
          DS_FONTE_RECEITA: "FUNDO ESPECIAL",
          DS_ORIGEM_RECEITA: "Recursos de partido político",
          VR_RECEITA: "9000,00",
        },
        { SQ_CANDIDATO: "2", NR_CPF_CNPJ_DOADOR: "1", NM_DOADOR: "OUTRA", DS_FONTE_RECEITA: "", DS_ORIGEM_RECEITA: "", VR_RECEITA: "5,00" },
      ],
      "receitas_candidatos_2022_BRASIL.csv": [
        { SQ_CANDIDATO: "1", NR_CPF_CNPJ_DOADOR: "1", NM_DOADOR: "DUPLICADO", DS_FONTE_RECEITA: "", DS_ORIGEM_RECEITA: "", VR_RECEITA: "999,00" },
      ],
      "despesas_contratadas_candidatos_2022_MG.csv": [
        { SQ_CANDIDATO: "1", NR_CPF_CNPJ_FORNECEDOR: "99888777000100", NM_FORNECEDOR: "GRAFICA X", VR_DESPESA_CONTRATADA: "4000,00" },
      ],
    });
    mockFetch([[/prestacao_de_contas_eleitorais_candidatos_2022\.zip/, z]]);
    const { coletarContasCampanha } = await import("../sources/tse-contas");
    const r = await coletarContasCampanha(new Map([[2022, new Set(["1"])]]));
    const c = r.contas.get("2022:1")!;
    expect(c).toMatchObject({ receitas: 10000, dinheiroPublico: 9000, despesas: 4000 });
    expect(c.porOrigem[0]).toEqual({ origem: "Fundo eleitoral (dinheiro público)", valor: 9000 });
    expect(c.doadores).toEqual([
      { nome: "DIRECAO NACIONAL", cnpj: "11222333000181", origem: "Fundo eleitoral (dinheiro público)", valor: 9000 },
      { nome: "JOAO DA SILVA", cnpj: undefined, origem: "Doações de pessoas", valor: 1000 },
    ]);
    expect(c.fornecedores).toEqual([{ nome: "GRAFICA X", cnpj: "99888777000100", valor: 4000 }]);
    expect(r.contas.has("2022:2")).toBe(false);
  });
});
