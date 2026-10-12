/**
 * Raio-X Político data pipeline.
 *
 *   npm run pipeline                  # collect everything, write ./data
 *   npm run pipeline -- --only=senado # recollect one source, reuse the others from .cache/stage
 *   npm run pipeline -- --dias=180    # shorter window for votes/presence/speeches
 *
 * Every source runs in isolation: a failing source is recorded in data/meta.json and the
 * remaining sources still publish. Optional credentials (see .env.example) enable extra sources.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Fala, FonteStatus, RedeSocial } from "../src/lib/types";
import { montar, publicar } from "./build";
import { stats } from "./lib/http";
import { log } from "./lib/log";
import type { CandidatoTSE, EmendaAgg, SourceOutput } from "./model";
import { coletarAssembleias } from "./sources/assembleias";
import { coletarCamara } from "./sources/camara";
import { coletarEmendasPix, coletarEmendasPortal } from "./sources/emendas";
import { coletarDiscursos, coletarYouTube } from "./sources/falas";
import { coletarSenado } from "./sources/senado";
import { coletarConectoresSociais } from "./sources/social-connectors";
import { coletarTSE } from "./sources/tse";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const ONLY = args.only ? new Set(String(args.only).split(",")) : undefined;
const DIAS = Number(args.dias ?? 365);
const OUT = path.resolve(args.out ?? "data");
const STAGE = path.resolve(".cache", "stage");
const HOJE = new Date();
const ANO = HOJE.getUTCFullYear();

const fontes: FonteStatus[] = [];

/** Run a collection step, or reuse its last staged result when excluded by --only. */
async function etapa<T>(id: string, nome: string, url: string, fn: () => Promise<T>, contar: (t: T) => number, vazio: T): Promise<T> {
  const stageFile = path.join(STAGE, `${id}.json`);
  if (ONLY && !ONLY.has(id)) {
    try {
      const t = deserialize(JSON.parse(await readFile(stageFile, "utf8"))) as T;
      fontes.push({ id, nome, url, status: "ok", registros: contar(t), duracaoMs: 0, erro: "reaproveitado da última coleta" });
      return t;
    } catch {
      fontes.push({ id, nome, url, status: "ignorado", registros: 0, duracaoMs: 0 });
      return vazio;
    }
  }
  log.step(nome);
  const t0 = Date.now();
  try {
    const t = await fn();
    const avisos = (t as { avisos?: string[] }).avisos ?? [];
    fontes.push({ id, nome, url, status: avisos.length ? "parcial" : "ok", registros: contar(t), duracaoMs: Date.now() - t0, erro: avisos.join(" | ") || undefined });
    await mkdir(STAGE, { recursive: true });
    await writeFile(stageFile, JSON.stringify(t, serializeMap));
    return t;
  } catch (e) {
    log.error(`${nome}: ${(e as Error).message}`);
    fontes.push({ id, nome, url, status: "falhou", registros: 0, duracaoMs: Date.now() - t0, erro: (e as Error).message });
    return vazio;
  }
}

function serializeMap(_k: string, v: unknown) {
  return v instanceof Map ? { __map: [...v.entries()] } : v;
}
function deserialize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(deserialize);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.__map)) return new Map((o.__map as [unknown, unknown][]).map(([k, x]) => [k, deserialize(x)]));
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, deserialize(x)]));
  }
  return v;
}

const vazioSrc = (): SourceOutput => ({ politicos: [], votacoes: [], despesas: [], sessoes: [], avisos: [] });
const contarSrc = (s: SourceOutput) => s.politicos.length + s.votacoes.length + s.despesas.length;

async function main() {
  const t0 = Date.now();
  const anosGastos = [ANO - 1, ANO];

  const [camara, senado, tse] = await Promise.all([
    etapa("camara", "Câmara dos Deputados", "https://dadosabertos.camara.leg.br", () => coletarCamara({ hoje: HOJE, diasVotos: DIAS, anosGastos }), contarSrc, vazioSrc()),
    etapa("senado", "Senado Federal", "https://legis.senado.leg.br/dadosabertos", () => coletarSenado({ hoje: HOJE, diasVotos: DIAS, anosGastos }), contarSrc, vazioSrc()),
    etapa("tse", "TSE - Candidaturas, bens e redes sociais", "https://dadosabertos.tse.jus.br", () => coletarTSE([2018, 2022, 2026]), (t) => t.candidatos.length, {
      candidatos: [] as CandidatoTSE[],
      redes: new Map<string, string[]>(),
      avisos: [] as string[],
    }),
  ]);

  const assembleias = await etapa(
    "assembleias",
    "Assembleias Legislativas (TSE + ALMG + ALESP + SAPL)",
    "https://dadosabertos.tse.jus.br",
    () => coletarAssembleias(tse.candidatos, anosGastos),
    (a) => a.politicos.length,
    { politicos: [], despesas: [], status: [] },
  );

  const emendasPix = await etapa(
    "emendas",
    "Transferegov - Emendas Pix",
    "https://api.transferegov.gestao.gov.br/transferenciasespeciais/",
    () => coletarEmendasPix(2020),
    (e) => e.registros,
    { agg: new Map<string, EmendaAgg>(), registros: 0 },
  );
  let emendas = emendasPix.agg;
  if (process.env.PORTAL_TRANSPARENCIA_API_KEY) {
    const portal = await etapa(
      "portal",
      "Portal da Transparência - Emendas parlamentares",
      "https://portaldatransparencia.gov.br/emendas",
      () => coletarEmendasPortal([ANO - 2, ANO - 1, ANO], process.env.PORTAL_TRANSPARENCIA_API_KEY!),
      (e) => e.registros,
      { agg: new Map<string, EmendaAgg>(), registros: 0 },
    );
    // The Portal covers every amendment type; prefer it when present
    if (portal.agg.size) emendas = portal.agg;
  } else {
    fontes.push({ id: "portal", nome: "Portal da Transparência - Emendas parlamentares", url: "https://portaldatransparencia.gov.br/emendas", status: "ignorado", registros: 0, duracaoMs: 0, erro: "PORTAL_TRANSPARENCIA_API_KEY não configurada" });
  }

  const politicos = [...camara.politicos, ...senado.politicos, ...assembleias.politicos];
  if (!politicos.length) throw new Error("Nenhuma fonte de parlamentares respondeu; nada será publicado.");

  const discursos = await etapa(
    "discursos",
    "Discursos e pronunciamentos (Câmara e Senado)",
    "https://dadosabertos.camara.leg.br",
    () => coletarDiscursos(politicos, HOJE, Math.min(DIAS, 365)),
    (d) => d.falas.length,
    { falas: [] as Fala[], avisos: [] as string[] },
  );

  log.step("Consolidando e calculando métricas");
  const r = montar({
    hoje: HOJE,
    politicos,
    votacoes: [...camara.votacoes, ...senado.votacoes],
    despesas: [...camara.despesas, ...senado.despesas, ...assembleias.despesas],
    sessoes: [...camara.sessoes, ...senado.sessoes],
    tse: tse.candidatos,
    tseRedes: tse.redes,
    emendas,
    falas: discursos.falas,
  });

  // Social media content (official APIs only)
  const falasSociais: Fala[] = [];
  const redes: RedeSocial[] = r.redes;
  if (process.env.YOUTUBE_API_KEY) {
    const yt = await etapa("youtube", "YouTube Data API", "https://developers.google.com/youtube/v3", () => coletarYouTube(redes, process.env.YOUTUBE_API_KEY!, 90), (x) => x.length, [] as Fala[]);
    falasSociais.push(...yt);
  } else {
    fontes.push({ id: "youtube", nome: "YouTube Data API", url: "https://developers.google.com/youtube/v3", status: "ignorado", registros: 0, duracaoMs: 0, erro: "YOUTUBE_API_KEY não configurada" });
  }
  const conectores = await coletarConectoresSociais(redes, 90);
  falasSociais.push(...conectores.falas);
  for (const c of conectores.status)
    fontes.push({ id: `social-${c.plataforma}`, nome: `Conector ${c.plataforma}`, url: "", status: c.ativo ? "ok" : "ignorado", registros: c.coletados, duracaoMs: 0, erro: c.motivo });

  for (const s of assembleias.status)
    fontes.push({ id: `assembleia-${s.uf.toLowerCase()}`, nome: s.fonte, url: s.url, status: s.ok ? "ok" : "falhou", registros: s.registros, duracaoMs: 0, erro: s.erro });

  // ---------- write ----------
  log.step(`Gravando dados em ${OUT}`);
  const todasFalas = [...discursos.falas, ...falasSociais];
  await publicar(OUT, r, todasFalas, {
    demo: false,
    fontes,
    totais: {
      deputadosFederais: camara.politicos.length,
      senadores: senado.politicos.length,
      deputadosEstaduais: assembleias.politicos.length,
      despesas: camara.despesas.length + senado.despesas.length + assembleias.despesas.length,
      candidaturasTSE: tse.candidatos.length,
      requisicoesHttp: stats.requests,
      duracaoSegundos: Math.round((Date.now() - t0) / 1000),
    },
    hoje: HOJE,
  });

  log.info(`Pronto: ${r.detalhes.length} políticos, ${r.votacoes.length} votações, ${todasFalas.length} falas`);
  log.info(`HTTP: ${stats.requests} requisições, ${stats.cacheHits} do cache, ${stats.failures} falhas, ${(stats.bytes / 1e6).toFixed(1)} MB`);
  const falhou = fontes.filter((f) => f.status === "falhou");
  if (falhou.length) log.warn(`Fontes com falha: ${falhou.map((f) => f.nome).join(", ")}`);
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
