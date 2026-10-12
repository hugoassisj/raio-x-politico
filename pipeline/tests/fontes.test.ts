/**
 * Contract tests: each collector receives payloads shaped exactly like the official APIs
 * (shapes verified against the live endpoints in October 2026) through a mocked network,
 * and must produce correct normalized records.
 */
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sanitizar, validarCitacoes } from "../ai";

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
    const body = r ? JSON.stringify(r[1]) : "";
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
      [/\/votacoes\/2611313-34$/, { dados: { idEvento: 82965, proposicoesAfetadas: [{ siglaTipo: "PLP", numero: 74, ano: 2026, ementa: "Regime fiscal" }] } }],
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
      [/proposicoes-20\d\d\.json/, { dados: [{ id: 900, siglaTipo: "PL", ultimoStatus: { descricaoSituacao: "Transformado em Norma Jurídica" } }] }],
      [
        /\/proposicoes\?idDeputadoAutor=204379&siglaTipo=PL,PLP,PEC,PDL/,
        { dados: [{ id: 900, siglaTipo: "PL", numero: 1, ano: 2025, ementa: "Institui", dataApresentacao: "2025-03-01" }] },
        { "x-total-count": "42" },
      ],
      [/\/proposicoes\?idDeputadoAutor=204379&siglaTipo=PL&itens=1/, { dados: [] }, { "x-total-count": "40" }],
      [/\/proposicoes\?idDeputadoAutor=204379&siglaTipo=PEC&itens=1/, { dados: [] }, { "x-total-count": "2" }],
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
    expect(r.votacoes[0]).toMatchObject({ id: "cam-2611313-34", titulo: "PLP 74/2026", orientacaoGoverno: "Sim", resultado: "Aprovada" });

    expect(p.proposicoesTotal).toBe(42);
    expect(p.proposicoesPorTipo).toMatchObject({ PL: 40, PEC: 2 });
    expect(p.proposicoesLista?.[0]).toMatchObject({ virouLei: true, url: "https://www.camara.leg.br/propostas-legislativas/900" });
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
