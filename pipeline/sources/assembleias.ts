import { XMLParser } from "fast-xml-parser";
import { fetchRaw, getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { capitalizar, isoDate, nameSimilarity, nomeProprio, num } from "../lib/util";
import type { CandidatoTSE, Despesa, PoliticoParcial } from "../model";
import { eleito, fotoTSE } from "./tse";

export interface AssembleiaStatus {
  uf: string;
  fonte: string;
  url: string;
  ok: boolean;
  registros: number;
  erro?: string;
}

interface DepAssembleia {
  uf: string;
  idExterno: string;
  nome: string;
  partido?: string;
  foto?: string;
  email?: string;
  pagina?: string;
  fonte: string;
}

/** SAPL (Interlegis) instances with the public REST API. Add hosts here as assemblies adopt it. */
export const SAPL_HOSTS: Record<string, string> = {
  AC: "https://sapl.al.ac.leg.br",
  TO: "https://sapl.al.to.leg.br",
  AM: "https://sapl.aleam.gov.br",
};

export async function coletarAssembleias(tse: CandidatoTSE[], anoGastos: number[]): Promise<{ politicos: PoliticoParcial[]; despesas: Despesa[]; status: AssembleiaStatus[] }> {
  const status: AssembleiaStatus[] = [];
  const despesas: Despesa[] = [];
  const externos: DepAssembleia[] = [];

  // ---------- ALMG (Minas Gerais) ----------
  try {
    const j: any = await getJson("https://dadosabertos.almg.gov.br/ws/deputados/em_exercicio?formato=json", { ttlHours: 24 });
    const lst: any[] = j?.list ?? j?.deputados ?? (Array.isArray(j) ? j : []);
    for (const d of lst) {
      externos.push({
        uf: "MG",
        idExterno: String(d.id),
        nome: d.nome,
        partido: d.partido,
        pagina: `https://www.almg.gov.br/deputados/conheca_deputados/deputados-info.html?idDep=${d.id}`,
        foto: `https://mediaserver.almg.gov.br/acervo/deputados/fotos/${d.id}.jpg`,
        fonte: "ALMG Dados Abertos",
      });
    }
    status.push({ uf: "MG", fonte: "ALMG Dados Abertos", url: "https://dadosabertos.almg.gov.br", ok: true, registros: lst.length });
    // Indemnity funds (verba indenizatória), monthly per deputy
    const meses: [number, number][] = [];
    for (const ano of anoGastos) for (let m = 1; m <= 12; m++) meses.push([ano, m]);
    const hoje = new Date();
    const alvo = meses.filter(([a, m]) => new Date(Date.UTC(a, m - 1, 1)) < hoje);
    const tasks = lst.flatMap((d) => alvo.map(([a, m]) => ({ id: String(d.id), a, m })));
    await mapLimit(
      tasks,
      3,
      async ({ id, a, m }) => {
        const r: any = await getJson(`https://dadosabertos.almg.gov.br/ws/prestacao_contas/verbas_indenizatorias/deputados/${id}/${a}/${m}?formato=json`, {
          ttlHours: a === hoje.getUTCFullYear() ? 72 : 24 * 30,
          allowStatus: [404],
        });
        walk(r, (o) => {
          const v = num(o.valorReembolsado ?? o.valorDespesa ?? o.valor);
          if (!v || !(o.nomeEmitente || o.cpfCnpj || o.descTipoDespesa)) return;
          despesas.push({
            pid: `almg-${id}`,
            ano: a,
            mes: m,
            data: isoDate(o.dataEmissao?.$ ?? o.dataEmissao),
            categoria: o.descTipoDespesa ?? "Verba indenizatória",
            fornecedor: o.nomeEmitente ?? "",
            doc: String(o.cpfCnpj ?? "").replace(/\D/g, ""),
            valor: v,
          });
        });
      },
      "ALMG verbas",
    );
  } catch (e) {
    status.push({ uf: "MG", fonte: "ALMG Dados Abertos", url: "https://dadosabertos.almg.gov.br", ok: false, registros: 0, erro: (e as Error).message });
  }

  // ---------- ALESP (São Paulo) ----------
  try {
    const xp = new XMLParser({ ignoreAttributes: false });
    const r = await fetchRaw("https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml", { ttlHours: 24 });
    const x = xp.parse(r.body.toString("latin1"));
    const lst: any[] = [x?.Deputados?.Deputado ?? []].flat();
    for (const d of lst) {
      const id = String(d.Matricula ?? d.IdDeputado ?? d.IdSPL ?? "");
      if (!id) continue;
      externos.push({
        uf: "SP",
        idExterno: id,
        nome: d.NomeParlamentar ?? d.Nome,
        partido: d.Partido,
        email: d.Email,
        foto: d.PathFoto,
        pagina: d.IdDeputado ? `https://www.al.sp.gov.br/deputado/?matricula=${d.Matricula ?? d.IdDeputado}` : undefined,
        fonte: "ALESP Dados Abertos",
      });
    }
    status.push({ uf: "SP", fonte: "ALESP Dados Abertos", url: "https://www.al.sp.gov.br/dados-abertos/", ok: true, registros: lst.length });
    try {
      const g = await fetchRaw("https://www.al.sp.gov.br/repositorioDados/deputados/despesas_gabinetes.xml", { ttlHours: 24, timeoutMs: 300_000 });
      const gx = xp.parse(g.body.toString("latin1"));
      const rows: any[] = [gx?.despesas?.despesa ?? gx?.Despesas?.Despesa ?? []].flat();
      const anos = new Set(anoGastos);
      for (const d of rows) {
        const ano = Number(d.Ano);
        if (!anos.has(ano)) continue;
        despesas.push({
          pid: `alesp-${d.Matricula}`,
          ano,
          mes: Number(d.Mes),
          categoria: d.Tipo ?? "Despesa de gabinete",
          fornecedor: d.Fornecedor ?? "",
          doc: String(d.CNPJ ?? "").replace(/\D/g, ""),
          valor: num(d.Valor),
        });
      }
    } catch (e) {
      log.warn(`ALESP despesas: ${(e as Error).message}`);
    }
  } catch (e) {
    status.push({ uf: "SP", fonte: "ALESP Dados Abertos", url: "https://www.al.sp.gov.br/dados-abertos/", ok: false, registros: 0, erro: (e as Error).message });
  }

  // ---------- SAPL assemblies ----------
  for (const [uf, host] of Object.entries(SAPL_HOSTS)) {
    try {
      let url: string | null = `${host}/api/parlamentares/parlamentar/?format=json&page_size=100`;
      let n = 0;
      while (url) {
        const j: any = await getJson(url, { ttlHours: 24 });
        for (const p of j?.results ?? []) {
          if (p.ativo === false) continue;
          n++;
          externos.push({
            uf,
            idExterno: String(p.id),
            nome: p.nome_parlamentar ?? p.nome_completo,
            foto: p.fotografia || undefined,
            email: p.email || undefined,
            pagina: `${host}/parlamentar/${p.id}`,
            fonte: `SAPL ${uf}`,
          });
        }
        url = j?.pagination?.links?.next ?? j?.next ?? null;
      }
      status.push({ uf, fonte: `SAPL ${uf}`, url: host, ok: true, registros: n });
    } catch (e) {
      status.push({ uf, fonte: `SAPL ${uf}`, url: host, ok: false, registros: 0, erro: (e as Error).message });
    }
  }

  // ---------- Merge: TSE 2022 elected list is the base for every state ----------
  const eleitos = tse.filter((c) => c.ano === 2022 && (c.codCargo === 7 || c.codCargo === 8) && eleito(c.situacao));
  const politicos: PoliticoParcial[] = [];
  const usados = new Set<DepAssembleia>();
  const ufsComFonte = new Set(status.filter((s) => s.ok && s.registros > 0).map((s) => s.uf));
  const pidMap = new Map<string, string>(); // external expense pid -> politician id

  const novo = (c: CandidatoTSE, ext?: DepAssembleia): PoliticoParcial => {
    const id = `est-${c.uf.toLowerCase()}-${c.sq}`;
    if (ext) {
      if (ext.fonte.startsWith("ALMG")) pidMap.set(`almg-${ext.idExterno}`, id);
      if (ext.fonte.startsWith("ALESP")) pidMap.set(`alesp-${ext.idExterno}`, id);
    }
    return {
      id,
      casa: "assembleia",
      cargo: c.codCargo === 8 ? "Deputado(a) Distrital" : "Deputado(a) Estadual",
      nome: ext?.nome ?? nomeProprio(c.nomeUrna),
      nomeCivil: nomeProprio(c.nome),
      partido: ext?.partido ?? c.partido,
      uf: c.uf,
      foto: ext?.foto ?? fotoTSE(c.ano, c.sq, c.uf),
      sexo: /fem/i.test(c.genero ?? "") ? "F" : /masc/i.test(c.genero ?? "") ? "M" : undefined,
      // Without an assembly feed we cannot know who is currently in office; elected members are assumed active.
      emExercicio: ufsComFonte.has(c.uf) ? !!ext : true,
      sqCandidato: c.sq,
      perfil: {
        nascimento: c.nascimento,
        escolaridade: c.instrucao ? capitalizar(c.instrucao) : undefined,
        profissoes: c.ocupacao ? [capitalizar(c.ocupacao)] : [],
        email: ext?.email,
        paginaOficial: ext?.pagina,
        redes: [],
      },
      carreira: [],
      comissoes: [],
      frentes: [],
      fontes: [
        { nome: "TSE - Candidaturas 2022", url: "https://dadosabertos.tse.jus.br/dataset/candidatos-2022" },
        ...(ext ? [{ nome: ext.fonte, url: ext.pagina ?? "" }] : []),
      ],
    };
  };

  for (const c of eleitos) {
    const cand = externos.filter((e) => e.uf === c.uf && !usados.has(e));
    let best: DepAssembleia | undefined;
    let bestS = 0;
    for (const e of cand) {
      const s = Math.max(nameSimilarity(e.nome, c.nomeUrna), nameSimilarity(e.nome, c.nome));
      if (s > bestS) [best, bestS] = [e, s];
    }
    const ext = bestS >= 0.6 ? best : undefined;
    if (ext) usados.add(ext);
    politicos.push(novo(c, ext));
  }
  // Members in office who were not elected as titular (substitutes): match against all 2022 candidates of that state
  for (const e of externos.filter((x) => !usados.has(x))) {
    const pool = tse.filter((c) => c.ano === 2022 && c.uf === e.uf && (c.codCargo === 7 || c.codCargo === 8));
    let best: CandidatoTSE | undefined;
    let bestS = 0;
    for (const c of pool) {
      const s = Math.max(nameSimilarity(e.nome, c.nomeUrna), nameSimilarity(e.nome, c.nome));
      if (s > bestS) [best, bestS] = [c, s];
    }
    if (best && bestS >= 0.7) {
      const p = novo(best, e);
      p.emExercicio = true;
      politicos.push(p);
    }
  }

  const desp = despesas.flatMap((d) => {
    const pid = pidMap.get(d.pid);
    return pid ? [{ ...d, pid }] : [];
  });
  log.info(`Assembleias: ${politicos.length} deputados estaduais/distritais, ${desp.length} despesas vinculadas`);
  return { politicos, despesas: desp, status };
}

function walk(o: any, f: (o: any) => void) {
  if (!o || typeof o !== "object") return;
  if (!Array.isArray(o)) f(o);
  for (const v of Object.values(o)) walk(v, f);
}

