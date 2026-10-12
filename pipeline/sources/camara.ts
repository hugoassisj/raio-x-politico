import { fetchRaw, getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { addDays, decode, get, isoDate, nomeProprio, num, parseCsv, unzipFirst, windows, ymd } from "../lib/util";
import type { Mandato, Proposicao, VotacaoDetalhe } from "../../src/lib/types";
import type { Despesa, SourceOutput, PoliticoParcial, Sessao } from "../model";

const API = "https://dadosabertos.camara.leg.br/api/v2";
const ARQ = "https://dadosabertos.camara.leg.br/arquivos";

/** Collect every page of a paginated Câmara endpoint (follows links[rel=next]). */
async function allPages<T = any>(url: string, maxPages = 50, ttlHours = 20): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  let pages = 0;
  while (next && pages < maxPages) {
    const j: any = await getJson(next, { ttlHours });
    out.push(...(j?.dados ?? []));
    next = (j?.links ?? []).find((l: any) => l.rel === "next")?.href;
    pages++;
  }
  return out;
}

const LEGISLATURAS: Record<number, [number, number]> = {};
for (let n = 40; n <= 60; n++) {
  // legislature N starts Feb 1 of 1955 + 4*(N-40)
  const ini = 1955 + 4 * (n - 40);
  LEGISLATURAS[n] = [ini, ini + 4];
}

export async function coletarCamara(opts: { hoje: Date; diasVotos: number; anosGastos: number[] }): Promise<SourceOutput> {
  const out: SourceOutput = { politicos: [], votacoes: [], despesas: [], sessoes: [], avisos: [] };
  const fim = opts.hoje;
  const ini = addDays(fim, -opts.diasVotos);

  // ---------- 1. Deputies + profile/career ----------
  log.info("Câmara: listando deputados em exercício");
  const lista = await allPages(`${API}/deputados?itens=100&ordem=ASC&ordenarPor=nome`);
  log.info(`Câmara: ${lista.length} deputados`);

  const deps = await mapLimit(
    lista,
    6,
    async (d: any) => {
      const id = String(d.id);
      const [det, hist, histAtual, ext, orgaos, frentes, prof] = await Promise.all([
        getJson(`${API}/deputados/${id}`, { ttlHours: 72 }).catch(() => null),
        // historico-old has correct dates for past legislatures (career)...
        getJson(`${API}/deputados/${id}/historico-old`, { ttlHours: 168 }).catch(() => null),
        // ...and historico has the status changes (leave, return) of the current one
        getJson(`${API}/deputados/${id}/historico`, { ttlHours: 24 }).catch(() => null),
        getJson(`${API}/deputados/${id}/mandatosExternos`, { ttlHours: 168 }).catch(() => null),
        allPages(`${API}/deputados/${id}/orgaos?itens=100&ordem=DESC&ordenarPor=dataInicio`, 5, 72).catch(() => []),
        getJson(`${API}/deputados/${id}/frentes`, { ttlHours: 168 }).catch(() => null),
        getJson(`${API}/deputados/${id}/profissoes`, { ttlHours: 168 }).catch(() => null),
      ]);
      const dd = det?.dados ?? {};
      const us = dd.ultimoStatus ?? {};

      const carreira: Mandato[] = [];
      const legs = new Set<number>();
      for (const h of (hist ?? histAtual)?.dados ?? []) {
        const leg = Number(h.idLegislatura);
        if (leg && !legs.has(leg) && LEGISLATURAS[leg]) {
          legs.add(leg);
          carreira.push({
            cargo: "Deputado(a) Federal",
            inicio: LEGISLATURAS[leg][0],
            fim: LEGISLATURAS[leg][1],
            uf: h.siglaUf,
            partido: h.siglaPartido,
            fonte: "Câmara dos Deputados",
          });
        }
      }
      const exercicio = periodosExercicio((histAtual ?? hist)?.dados ?? [], Number(us.idLegislatura ?? d.idLegislatura));
      for (const m of ext?.dados ?? []) {
        const a = Number(m.anoInicio);
        const f = Number(m.anoFim) || undefined;
        // The source has typos (e.g. 1882-1988). No elective mandate lasts more than 8 years.
        if (!a || a < 1946 || (f && (f < a || f - a > 8))) continue;
        carreira.push({
          cargo: m.cargo ?? "Mandato",
          inicio: a,
          fim: f,
          uf: m.siglaUf ?? undefined,
          municipio: m.municipio ?? undefined,
          partido: m.siglaPartidoEleicao ?? undefined,
          fonte: "Câmara dos Deputados (mandatos externos)",
        });
      }
      carreira.sort((a, b) => a.inicio - b.inicio);

      const p: PoliticoParcial = {
        id: `dep-${id}`,
        casa: "camara",
        cargo: "Deputado(a) Federal",
        nome: us.nomeEleitoral ?? d.nome,
        nomeCivil: dd.nomeCivil ? nomeProprio(dd.nomeCivil) : undefined,
        partido: us.siglaPartido ?? d.siglaPartido,
        uf: us.siglaUf ?? d.siglaUf,
        foto: (us.urlFoto ?? d.urlFoto ?? "").replace(/^http:/, "https:"),
        sexo: dd.sexo === "F" ? "F" : dd.sexo === "M" ? "M" : undefined,
        emExercicio: true,
        cpfMascarado: dd.cpf,
        exercicio,
        inicioExercicioAtual: exercicio[exercicio.length - 1]?.ini,
        perfil: {
          nascimento: isoDate(dd.dataNascimento),
          naturalidade: [dd.municipioNascimento, dd.ufNascimento].filter(Boolean).join(" - ") || undefined,
          escolaridade: dd.escolaridade ?? undefined,
          profissoes: (prof?.dados ?? []).map((x: any) => x.titulo).filter(Boolean),
          email: us.gabinete?.email ?? us.email ?? d.email ?? undefined,
          telefone: us.gabinete?.telefone ? `(61) ${us.gabinete.telefone}` : undefined,
          gabinete: us.gabinete?.sala ? `Gabinete ${us.gabinete.sala}${/\d/.test(us.gabinete.predio ?? "") ? `, Anexo ${us.gabinete.predio}` : ""}` : undefined,
          site: dd.urlWebsite ?? undefined,
          redes: dd.redeSocial ?? [],
          paginaOficial: `https://www.camara.leg.br/deputados/${id}`,
        },
        carreira,
        comissoes: (orgaos as any[])
          .filter((o) => o.nomeOrgao)
          .map((o) => ({ sigla: o.siglaOrgao, nome: o.nomePublicacao ?? o.nomeOrgao, papel: o.titulo, atual: !o.dataFim }))
          .filter((o, i, a) => a.findIndex((x) => x.nome === o.nome && x.papel === o.papel) === i)
          .slice(0, 40),
        frentes: (frentes?.dados ?? []).map((f: any) => f.titulo).filter(Boolean),
        fontes: [
          { nome: "Câmara dos Deputados - Dados Abertos", url: `${API}/deputados/${id}` },
          { nome: "Página oficial", url: `https://www.camara.leg.br/deputados/${id}` },
        ],
      };
      return p;
    },
    "Câmara perfis",
  );
  out.politicos = deps.filter(Boolean) as PoliticoParcial[];
  const ids = new Set(out.politicos.map((p) => p.id.slice(4)));

  // ---------- 2. Plenary sessions + presence ----------
  try {
    log.info("Câmara: sessões deliberativas do plenário");
    const evs: any[] = [];
    for (const [a, b] of windows(ini, fim, 90)) {
      evs.push(...(await allPages(`${API}/eventos?idOrgao=180&dataInicio=${a}&dataFim=${b}&itens=100&ordem=ASC&ordenarPor=dataHoraInicio`, 20)));
    }
    const sessoes = evs.filter((e) => /deliberativa/i.test(e.descricaoTipo ?? "") && /encerrad/i.test(e.situacao ?? ""));
    const uniq = [...new Map(sessoes.map((s) => [String(s.id), s])).values()];
    log.info(`Câmara: ${uniq.length} sessões deliberativas encerradas`);
    const pres = await mapLimit(
      uniq,
      4,
      async (s: any) => {
        const j = await getJson(`${API}/eventos/${s.id}/deputados`, { ttlHours: 24 * 30 });
        const presentes = (j?.dados ?? []).map((d: any) => String(d.id)).filter((x: string) => ids.has(x));
        const sess: Sessao = { id: String(s.id), data: isoDate(s.dataHoraInicio)!, presentes: presentes.map((x: string) => `dep-${x}`) };
        return sess;
      },
      "Câmara presenças",
    );
    // A session where nobody was recorded is almost certainly missing data, not 100% absence.
    out.sessoes = pres.filter((s): s is Sessao => !!s && s.presentes.length > 0);
  } catch (e) {
    out.avisos.push(`Presença Câmara: ${(e as Error).message}`);
  }

  // ---------- 3. Roll-call votes ----------
  try {
    log.info("Câmara: votações do plenário");
    const lst: any[] = [];
    for (const [a, b] of windows(ini, fim, 85)) {
      lst.push(...(await allPages(`${API}/votacoes?idOrgao=180&dataInicio=${a}&dataFim=${b}&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro`, 30)));
    }
    let nominais = lst.filter((v) => /sim:?\s*\d+/i.test(v.descricao ?? ""));
    log.info(`Câmara: ${lst.length} votações, ${nominais.length} nominais (pelo texto)`);
    if (!nominais.length) nominais = lst.slice(0, 400);
    const vots = await mapLimit(
      nominais,
      4,
      async (v: any) => {
        const vid = String(v.id);
        const [det, votos, ori] = await Promise.all([
          getJson(`${API}/votacoes/${vid}`, { ttlHours: 24 * 30 }).catch(() => null),
          getJson(`${API}/votacoes/${vid}/votos`, { ttlHours: 24 * 30 }),
          getJson(`${API}/votacoes/${vid}/orientacoes`, { ttlHours: 24 * 30 }).catch(() => null),
        ]);
        const vs = (votos?.dados ?? []) as any[];
        if (!vs.length) return null;
        const d = det?.dados ?? {};
        const prop = (d.proposicoesAfetadas ?? [])[0] ?? d.ultimaApresentacaoProposicao ?? {};
        const titulo = prop.siglaTipo ? `${prop.siglaTipo} ${prop.numero}/${prop.ano}` : (v.proposicaoObjeto ?? "Votação no Plenário");
        const orientacoes = ((ori?.dados ?? []) as any[]).map((o) => ({ sigla: String(o.siglaPartidoBloco ?? ""), orientacao: String(o.orientacaoVoto ?? "") }));
        const det2: VotacaoDetalhe = {
          id: `cam-${vid}`,
          casa: "camara",
          data: isoDate(v.dataHoraRegistro ?? v.data)!,
          titulo,
          descricao: [prop.ementa, d.descricao ?? v.descricao].filter(Boolean).join(" | ").slice(0, 900),
          resultado: v.aprovacao === 1 ? "Aprovada" : v.aprovacao === 0 ? "Rejeitada" : undefined,
          sim: 0,
          nao: 0,
          outros: 0,
          orientacaoGoverno: orientacoes.find((o) => /^governo$/i.test(o.sigla))?.orientacao,
          porPartido: [],
          votos: vs.map((x) => ({
            pid: `dep-${x.deputado_?.id}`,
            nome: x.deputado_?.nome,
            partido: x.deputado_?.siglaPartido,
            uf: x.deputado_?.siglaUf,
            voto: String(x.tipoVoto ?? ""),
          })),
          orientacoes,
          materia: (prop.id ?? prop.idProposicao) ? `cam-${prop.id ?? prop.idProposicao}` : undefined,
          // What exactly was opened for voting, e.g. "Requerimento de retirada de pauta"; the result
          // text alone often says only "Rejeitado o Requerimento"
          objeto:
            String(d.ultimaAberturaVotacao?.descricao ?? d.descUltimaAberturaVotacao ?? "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 400) || undefined,
          url: d.idEvento ? `https://www.camara.leg.br/evento-legislativo/${d.idEvento}` : undefined,
        };
        return det2;
      },
      "Câmara votos",
    );
    out.votacoes = vots.filter(Boolean) as VotacaoDetalhe[];
  } catch (e) {
    out.avisos.push(`Votações Câmara: ${(e as Error).message}`);
  }

  // ---------- 4. Parliamentary quota (CEAP) ----------
  for (const ano of opts.anosGastos) {
    try {
      const n0 = out.despesas.length;
      const r = await fetchRaw(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`, { ttlHours: 20, timeoutMs: 300_000 });
      const [file] = unzipFirst(r.body, /\.csv$/i);
      if (!file) throw new Error("zip sem CSV");
      const rows = parseCsv(decode(file.data, "utf8"));
      for (const row of rows) {
        const pid = row.ideCadastro || row.nuDeputadoId;
        if (!pid || !ids.has(String(pid))) continue;
        const valor = num(row.vlrLiquido);
        if (!valor) continue;
        out.despesas.push({
          pid: `dep-${pid}`,
          ano: Number(row.numAno) || ano,
          mes: Number(row.numMes),
          data: isoDate(row.datEmissao),
          categoria: titleCase(row.txtDescricao),
          fornecedor: (row.txtFornecedor ?? "").trim(),
          doc: (row.txtCNPJCPF ?? "").replace(/\D/g, ""),
          valor,
          url: row.urlDocumento || undefined,
          docId: row.ideDocumento,
          numeroDoc: row.txtNumero || undefined,
        });
      }
      log.info(`Câmara cota ${ano}: ${out.despesas.length - n0} lançamentos`);
    } catch (e) {
      out.avisos.push(`Cota Câmara ${ano} (arquivo): ${(e as Error).message}; usando API`);
      const porDep = await mapLimit(
        [...ids],
        4,
        async (id) => {
          const rows = await allPages(`${API}/deputados/${id}/despesas?ano=${ano}&itens=100&ordem=ASC&ordenarPor=mes`, 30, 20);
          return rows.map((x: any): Despesa => ({
            pid: `dep-${id}`,
            ano: Number(x.ano) || ano,
            mes: Number(x.mes),
            data: isoDate(x.dataDocumento),
            categoria: titleCase(x.tipoDespesa),
            fornecedor: x.nomeFornecedor ?? "",
            doc: String(x.cnpjCpfFornecedor ?? "").replace(/\D/g, ""),
            valor: num(x.valorLiquido),
            url: x.urlDocumento || undefined,
            docId: String(x.codDocumento ?? ""),
            numeroDoc: x.numDocumento ? String(x.numDocumento) : undefined,
          }));
        },
        `Câmara cota ${ano} API`,
      );
      for (const l of porDep) if (l) out.despesas.push(...l.filter((d) => d.valor));
    }
  }

  // ---------- 5. Bills (authorship) ----------
  // The yearly bulk files list every bill since 1988 with its current status and its authors, so
  // totals and "became law" cover the whole career, not only recent activity.
  try {
    const { porDeputado: autoria, executivo } = await autoriaProposicoes(opts.hoje.getUTCFullYear());
    out.atosExecutivo = executivo;
    for (const p of out.politicos) {
      const todas = autoria.get(p.id.slice(4)) ?? [];
      if (!todas.length) continue;
      todas.sort((x, y) => (y.data ?? "").localeCompare(x.data ?? "") || Number(y.id) - Number(x.id));
      const porTipo: Record<string, number> = {};
      for (const x of todas) porTipo[x.tipo] = (porTipo[x.tipo] ?? 0) + 1;
      p.proposicoesLista = todas.slice(0, 100);
      p.proposicoesPorTipo = porTipo;
      p.proposicoesPorPapel = { autor: todas.filter((x) => x.papel === "autor").length, coautor: todas.filter((x) => x.papel === "coautor").length };
      p.proposicoesTotal = todas.length;
      p.proposicoesLei = todas.filter((x) => x.virouLei).length;
    }
    log.info(`Câmara proposições: ${[...autoria.keys()].length} autores com projetos`);
  } catch (e) {
    out.avisos.push(`Proposições Câmara: ${(e as Error).message}`);
  }

  return out;
}

/**
 * Periods in office in the current legislature, from the status history: a period opens when the
 * status becomes "Exercício" and closes on any other status (leave, ministry, end of term).
 */
export function periodosExercicio(hist: any[], legislatura: number): { ini: string; fim?: string }[] {
  const eventos = hist
    .filter((h) => Number(h.idLegislatura) === legislatura && h.dataHora)
    .map((h) => ({ data: isoDate(h.dataHora)!, exercicio: /exerc/i.test(h.situacao ?? "") }))
    .filter((e) => e.data)
    .sort((a, b) => a.data.localeCompare(b.data));
  const out: { ini: string; fim?: string }[] = [];
  for (const e of eventos) {
    const aberto = out.length && !out[out.length - 1].fim;
    if (e.exercicio && !aberto) out.push({ ini: e.data });
    else if (!e.exercicio && aberto) out[out.length - 1].fim = e.data;
  }
  return out;
}

/** First year of the bulk bill files used (the current Constitution) */
export const PRIMEIRO_ANO_PROPOSICOES = 1988;
const TIPOS_PROJETO = new Set(["PL", "PLP", "PEC", "PDL"]);
const VIROU_LEI = /transformad[oa] (em|na) (norma|lei)|norma jur[ií]dica/i;

/** Acts the President sends to Congress, from the same yearly files */
export type AtoExecutivo = Proposicao & { origem: "medida-provisoria" | "projeto-do-executivo" };

const EXECUTIVO = /poder executivo|presid[eê]ncia da rep[uú]blica/i;

/**
 * Every bill of the four main kinds presented since 1988, grouped by deputy author: the first
 * signer is the author, the others co-authors (only those who signed as proponents). Also returns
 * the medidas provisórias and the bills presented by the Executive. Bills come from
 * proposicoes-{ano}.json and authorship from proposicoesAutores-{ano}.json, both official files.
 */
export async function autoriaProposicoes(anoAtual: number): Promise<{ porDeputado: Map<string, Proposicao[]>; executivo: AtoExecutivo[] }> {
  const porDeputado = new Map<string, Proposicao[]>();
  const executivo = new Map<string, AtoExecutivo>();
  for (let ano = PRIMEIRO_ANO_PROPOSICOES; ano <= anoAtual; ano++) {
    const ttlHours = ano >= anoAtual - 1 ? 24 : 24 * 30;
    try {
      const [props, autores]: any[] = await Promise.all([
        getJson(`${ARQ}/proposicoes/json/proposicoes-${ano}.json`, { ttlHours, timeoutMs: 300_000 }),
        getJson(`${ARQ}/proposicoesAutores/json/proposicoesAutores-${ano}.json`, { ttlHours, timeoutMs: 300_000 }),
      ]);
      const doAno = new Map<string, Proposicao>();
      for (const x of props?.dados ?? []) {
        const tipo = String(x.siglaTipo ?? "");
        if (!TIPOS_PROJETO.has(tipo) && tipo !== "MPV") continue;
        const situacao = get(x, "ultimoStatus.descricaoSituacao") ?? x.ultimoStatus_descricaoSituacao;
        const prop: Proposicao = {
          id: String(x.id),
          tipo,
          numero: Number(x.numero) || undefined,
          ano: Number(x.ano) || ano,
          ementa: String(x.ementa ?? "").trim(),
          data: isoDate(x.dataApresentacao),
          situacao: situacao ? String(situacao) : undefined,
          virouLei: situacao ? VIROU_LEI.test(String(situacao)) : undefined,
          url: `https://www.camara.leg.br/propostas-legislativas/${x.id}`,
        };
        if (tipo === "MPV") executivo.set(prop.id, { ...prop, origem: "medida-provisoria" });
        else doAno.set(prop.id, prop);
      }
      for (const a of autores?.dados ?? []) {
        const prop = doAno.get(String(a.idProposicao));
        if (!prop) continue;
        if (EXECUTIVO.test(`${a.nomeAutor ?? ""} ${a.tipoAutor ?? ""}`)) {
          executivo.set(prop.id, { ...prop, origem: "projeto-do-executivo" });
          continue;
        }
        const dep = String(a.idDeputadoAutor ?? a.uriAutor?.match(/deputados\/(\d+)/)?.[1] ?? "");
        if (!dep || dep === "undefined" || Number(a.proponente) === 0) continue;
        const l = porDeputado.get(dep) ?? [];
        if (!l.some((x) => x.id === prop.id)) l.push({ ...prop, papel: Number(a.ordemAssinatura) === 1 ? "autor" : "coautor" });
        porDeputado.set(dep, l);
      }
    } catch (e) {
      log.warn(`proposições ${ano}: ${(e as Error).message}`);
    }
  }
  const atos = [...executivo.values()].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "") || Number(b.id) - Number(a.id));
  return { porDeputado, executivo: atos };
}

function titleCase(s?: string) {
  const t = (s ?? "").trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const _test = { LEGISLATURAS, titleCase, ymd };
