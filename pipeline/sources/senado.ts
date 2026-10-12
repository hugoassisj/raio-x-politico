import { getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { addDays, arr, get, isoDate, num, windows } from "../lib/util";
import type { Mandato, Proposicao, VotacaoDetalhe } from "../../src/lib/types";
import type { PoliticoParcial, Sessao, SourceOutput } from "../model";

const LEGIS = "https://legis.senado.leg.br/dadosabertos";
const ADM = "https://adm.senado.gov.br/adm-dadosabertos/api/v1";

/** Vote marks that count as present in the plenary */
export const SEN_PRESENTE = /^(sim|n[aã]o|absten[cç][aã]o|obstru[cç][aã]o|p-nrv|presidente|votou|p-od)/i;
/** Formally justified absences (licenses, missions, parliamentary activity) */
export const SEN_JUSTIFICADA = /^(ap|ls|lp|lap|lc|lg|la|mis|rep|ati|licen|miss|art\.? ?13|art\.? ?40)/i;

export async function coletarSenado(opts: { hoje: Date; diasVotos: number; anosGastos: number[] }): Promise<SourceOutput> {
  const out: SourceOutput = { politicos: [], votacoes: [], despesas: [], sessoes: [], avisos: [] };

  log.info("Senado: senadores em exercício");
  const j: any = await getJson(`${LEGIS}/senador/lista/atual.json`, { ttlHours: 20 });
  const lista = arr(get(j, "ListaParlamentarEmExercicio.Parlamentares.Parlamentar"));
  log.info(`Senado: ${lista.length} senadores`);

  const sens = await mapLimit(
    lista,
    3,
    async (s: any) => {
      const idp = s.IdentificacaoParlamentar ?? {};
      const id = String(idp.CodigoParlamentar);
      const [det, mand, com, prof] = await Promise.all([
        getJson(`${LEGIS}/senador/${id}.json`, { ttlHours: 72 }).catch(() => null),
        getJson(`${LEGIS}/senador/${id}/mandatos.json`, { ttlHours: 168 }).catch(() => null),
        getJson(`${LEGIS}/senador/${id}/comissoes.json`, { ttlHours: 72 }).catch(() => null),
        getJson(`${LEGIS}/senador/${id}/profissao.json`, { ttlHours: 168 }).catch(() => null),
      ]);
      const par = get(det, "DetalheParlamentar.Parlamentar") ?? {};
      const basicos = par.DadosBasicosParlamentar ?? {};

      const carreira: Mandato[] = [];
      for (const m of arr(get(mand, "MandatoParlamentar.Parlamentar.Mandatos.Mandato"))) {
        const ini = isoDate(get(m, "PrimeiraLegislaturaDoMandato.DataInicio"));
        const fim = isoDate(get(m, "SegundaLegislaturaDoMandato.DataFim") ?? get(m, "PrimeiraLegislaturaDoMandato.DataFim"));
        if (!ini) continue;
        const exercicios = arr(get(m, "Exercicios.Exercicio"));
        const titular = /titular/i.test(m.DescricaoParticipacao ?? "");
        // Substitutes only count when they actually took office
        if (!titular && !exercicios.length) continue;
        carreira.push({
          cargo: titular ? "Senador(a)" : `Senador(a) (${m.DescricaoParticipacao})`,
          inicio: Number(ini.slice(0, 4)),
          fim: fim ? Number(fim.slice(0, 4)) : undefined,
          uf: m.UfParlamentar,
          fonte: "Senado Federal",
        });
      }
      const comissoes = arr(get(com, "MembroComissaoParlamentar.Parlamentar.MembroComissoes.Comissao")).map((c: any) => ({
        sigla: get(c, "IdentificacaoComissao.SiglaComissao"),
        nome: get(c, "IdentificacaoComissao.NomeComissao") ?? "",
        papel: c.DescricaoParticipacao,
        atual: !c.DataFim,
      }));
      const tel = arr(get(idp, "Telefones.Telefone") ?? get(par, "Telefones.Telefone"))[0];

      const p: PoliticoParcial = {
        id: `sen-${id}`,
        casa: "senado",
        cargo: "Senador(a)",
        nome: idp.NomeParlamentar,
        nomeCivil: idp.NomeCompletoParlamentar,
        partido: idp.SiglaPartidoParlamentar,
        uf: idp.UfParlamentar,
        foto: (idp.UrlFotoParlamentar ?? "").replace(/^http:/, "https:"),
        sexo: /^f/i.test(idp.SexoParlamentar ?? "") ? "F" : /^m/i.test(idp.SexoParlamentar ?? "") ? "M" : undefined,
        emExercicio: true,
        perfil: {
          nascimento: isoDate(basicos.DataNascimento),
          naturalidade: [basicos.Naturalidade, basicos.UfNaturalidade].filter(Boolean).join(" - ") || undefined,
          profissoes: arr(get(prof, "ProfissaoParlamentar.Parlamentar.Profissoes.Profissao")).map((x: any) => x.NomeProfissao).filter(Boolean),
          email: idp.EmailParlamentar,
          telefone: tel?.NumeroTelefone ? `(61) ${tel.NumeroTelefone}` : undefined,
          gabinete: basicos.EnderecoParlamentar,
          paginaOficial: idp.UrlPaginaParlamentar ?? `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}`,
          redes: [],
        },
        carreira: carreira.sort((a, b) => a.inicio - b.inicio),
        comissoes: comissoes.filter((c, i, a) => c.nome && a.findIndex((x) => x.nome === c.nome && x.papel === c.papel) === i).slice(0, 40),
        frentes: [],
        fontes: [
          { nome: "Senado Federal - Dados Abertos", url: `${LEGIS}/senador/${id}.json` },
          { nome: "Página oficial", url: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${id}` },
        ],
      };
      return p;
    },
    "Senado perfis",
  );
  out.politicos = sens.filter(Boolean) as PoliticoParcial[];
  const ids = new Set(out.politicos.map((p) => p.id));

  // ---------- Roll-call votes (one request per window returns every senator's vote) ----------
  try {
    const fim = opts.hoje;
    const ini = addDays(fim, -opts.diasVotos);
    const sessoesVot: any[] = [];
    for (const [a, b] of windows(ini, fim, 180)) {
      const r: any = await getJson(`${LEGIS}/votacao?dataInicio=${a}&dataFim=${b}`, { ttlHours: 20, timeoutMs: 180_000 });
      sessoesVot.push(...arr(r));
    }
    log.info(`Senado: ${sessoesVot.length} votações nominais`);
    const porDia = new Map<string, { presentes: Set<string>; justificadas: Set<string>; vistos: Set<string> }>();
    for (const v of sessoesVot) {
      const votos = arr(v.votos);
      const data = isoDate(v.dataSessao)!;
      const secreta = /^s/i.test(v.votacaoSecreta ?? "");
      const titulo = v.identificacao ?? [v.sigla, v.numero && `${v.numero}/${v.ano}`].filter(Boolean).join(" ") ?? "Votação no Plenário";
      const det: VotacaoDetalhe = {
        id: `sen-${v.codigoSessaoVotacao ?? v.codigoVotacao ?? v.idVotacao ?? `${data}-${titulo}`}`.replace(/\s+/g, "_"),
        casa: "senado",
        data,
        titulo: titulo || "Votação no Plenário",
        descricao: [v.ementa, v.descricaoVotacao].filter(Boolean).join(" | ").slice(0, 900),
        resultado: v.resultadoVotacao ? normalizaResultado(v.resultadoVotacao) : undefined,
        sim: num(v.totalVotosSim),
        nao: num(v.totalVotosNao),
        outros: num(v.totalVotosAbstencao),
        porPartido: [],
        orientacoes: arr(v.orientacoes ?? v.orientacoesBancada).map((o: any) => ({
          sigla: String(o.siglaPartido ?? o.siglaBancada ?? o.partido ?? ""),
          orientacao: String(o.orientacao ?? o.siglaOrientacao ?? o.voto ?? ""),
        })),
        votos: secreta
          ? []
          : votos.map((x: any) => ({
              pid: `sen-${x.codigoParlamentar}`,
              nome: x.nomeParlamentar,
              partido: x.siglaPartidoParlamentar,
              uf: x.siglaUFParlamentar,
              voto: String(x.siglaVotoParlamentar ?? x.descricaoVotoParlamentar ?? ""),
            })),
        url: v.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${v.codigoMateria}` : undefined,
      };
      const gov = det.orientacoes.find((o) => /governo/i.test(o.sigla));
      if (gov) det.orientacaoGoverno = gov.orientacao;
      out.votacoes.push(det);

      let dia = porDia.get(data);
      if (!dia) porDia.set(data, (dia = { presentes: new Set(), justificadas: new Set(), vistos: new Set() }));
      for (const x of votos) {
        const pid = `sen-${x.codigoParlamentar}`;
        const mark = String(x.siglaVotoParlamentar ?? "");
        dia.vistos.add(pid);
        if (SEN_PRESENTE.test(mark)) dia.presentes.add(pid);
        else if (SEN_JUSTIFICADA.test(mark)) dia.justificadas.add(pid);
      }
    }
    // A senator is present on a voting day when registered in any roll call that day
    out.sessoes = [...porDia.entries()].map(([data, d]) => {
      const s: Sessao = {
        id: `sen-${data}`,
        data,
        presentes: [...d.presentes].filter((x) => ids.has(x)),
        justificadas: [...d.justificadas].filter((x) => ids.has(x) && !d.presentes.has(x)),
      };
      return s;
    });
  } catch (e) {
    out.avisos.push(`Votações Senado: ${(e as Error).message}`);
  }

  // ---------- CEAPS expenses ----------
  for (const ano of opts.anosGastos) {
    try {
      const rows: any[] = arr(await getJson(`${ADM}/senadores/despesas_ceaps/${ano}`, { ttlHours: 20, timeoutMs: 300_000 }));
      let n = 0;
      for (const r of rows) {
        const pid = `sen-${r.codSenador}`;
        if (!ids.has(pid)) continue;
        const valor = num(r.valorReembolsado);
        if (!valor) continue;
        n++;
        out.despesas.push({
          pid,
          ano: Number(r.ano) || ano,
          mes: Number(r.mes),
          data: isoDate(r.data),
          categoria: (r.tipoDespesa ?? "").replace(/\s+/g, " ").trim(),
          fornecedor: (r.fornecedor ?? "").trim(),
          doc: String(r.cpfCnpj ?? "").replace(/\D/g, ""),
          valor,
          docId: String(r.id ?? r.documento ?? ""),
          numeroDoc: r.documento ? String(r.documento) : undefined,
        });
      }
      log.info(`Senado CEAPS ${ano}: ${n} lançamentos`);
    } catch (e) {
      out.avisos.push(`CEAPS ${ano}: ${(e as Error).message}`);
    }
  }

  // ---------- Bills ----------
  await mapLimit(
    out.politicos,
    3,
    async (p) => {
      const id = p.id.slice(4);
      const r: any = await getJson(`${LEGIS}/processo?codigoParlamentarAutor=${id}`, { ttlHours: 48, timeoutMs: 120_000 });
      const lista: Proposicao[] = arr(r)
        .map((x: any) => {
          const ident = String(x.identificacao ?? "");
          const tipo = ident.split(" ")[0] || x.sigla || "";
          const sit = x.situacaoAtual ?? undefined;
          return {
            id: String(x.id ?? x.codigoMateria),
            tipo,
            numero: Number(ident.match(/(\d+)\//)?.[1]) || undefined,
            ano: Number(ident.match(/\/(\d{4})/)?.[1]) || undefined,
            ementa: x.ementa ?? "",
            data: isoDate(x.dataApresentacao),
            situacao: sit,
            virouLei: !!x.normaGerada || /transformad[ao] em norma|sancionad|promulgad/i.test(sit ?? ""),
            url: x.codigoMateria ? `https://www25.senado.leg.br/web/atividade/materias/-/materia/${x.codigoMateria}` : x.urlDocumento,
          };
        })
        .filter((x: Proposicao) => ["PL", "PLP", "PEC", "PDL", "PRS", "PLS"].includes(x.tipo))
        .sort((a: Proposicao, b: Proposicao) => (b.data ?? "").localeCompare(a.data ?? ""));
      const porTipo: Record<string, number> = {};
      for (const x of lista) porTipo[x.tipo] = (porTipo[x.tipo] ?? 0) + 1;
      p.proposicoesLista = lista.slice(0, 100);
      p.proposicoesPorTipo = porTipo;
      p.proposicoesTotal = lista.length;
      p.proposicoesLei = lista.filter((x) => x.virouLei).length;
    },
    "Senado proposições",
  );

  return out;
}

function normalizaResultado(s: string) {
  if (/^a/i.test(s)) return "Aprovada";
  if (/^r/i.test(s)) return "Rejeitada";
  return s;
}
