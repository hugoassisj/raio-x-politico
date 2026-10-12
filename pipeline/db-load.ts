/**
 * Loads the published snapshot (./data) into Postgres.
 *
 *   DATABASE_URL=postgres://... npm run db:migrate && npm run pipeline:db
 *
 * Snapshot tables (politicians, votes, expenses...) are replaced atomically on each run.
 * History tables (statements and AI summaries) are append-only so changes over time are preserved.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Fala, FalasArquivo, IAArquivo, Meta, PoliticoDetalhe, VotacaoDetalhe } from "../src/lib/types";
import * as s from "../src/db/schema";
import { log } from "./lib/log";
import type { Despesa, SourceOutput } from "./model";

type DB = PgDatabase<PgQueryResultHKT, typeof s>;

async function lerJson<T>(p: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function lerDir<T>(dir: string): Promise<T[]> {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json"));
  const out: T[] = [];
  for (const f of files) {
    const j = await lerJson<T>(path.join(dir, f));
    if (j) out.push(j);
  }
  return out;
}

function chunks<T>(xs: T[], n = 1000): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

export async function carregar(db: DB, dataDir: string, stageDir?: string) {
  const politicos = await lerDir<PoliticoDetalhe>(path.join(dataDir, "politicos"));
  const votacoes = await lerDir<VotacaoDetalhe>(path.join(dataDir, "votacoes"));
  const falas = await lerDir<FalasArquivo>(path.join(dataDir, "falas"));
  const ia = await lerDir<IAArquivo>(path.join(dataDir, "ia"));
  const meta = await lerJson<Meta>(path.join(dataDir, "meta.json"));
  const despesas: Despesa[] = [];
  if (stageDir) {
    for (const f of ["camara", "senado", "assembleias"]) {
      const st = await lerJson<Pick<SourceOutput, "despesas">>(path.join(stageDir, `${f}.json`));
      despesas.push(...(st?.despesas ?? []));
    }
  }
  const fonteDespesa = (pid: string) =>
    pid.startsWith("dep-") ? "https://www.camara.leg.br/cotas" : pid.startsWith("sen-") ? "https://adm.senado.gov.br/adm-dadosabertos" : undefined;

  await db.transaction(async (tx) => {
    for (const t of [s.votos, s.votacoes, s.mandatos, s.proposicoes, s.eleicoes, s.redesSociais, s.despesas, s.politicos]) await tx.delete(t);

    for (const c of chunks(politicos, 500))
      await tx.insert(s.politicos).values(
        c.map((p) => ({
          id: p.id,
          casa: p.casa,
          cargo: p.cargo,
          nome: p.nome,
          nomeCivil: p.nomeCivil ?? null,
          partido: p.partido,
          uf: p.uf,
          foto: p.foto ?? null,
          emExercicio: p.emExercicio,
          inicioPolitica: p.inicioPolitica ?? null,
          metricas: p.m,
          perfil: p.perfil,
          fontes: p.fontes,
          atualizadoEm: new Date(p.atualizadoEm),
        })),
      );
    const mand = politicos.flatMap((p) =>
      p.carreira
        .map((m) => ({ pid: p.id, cargo: m.cargo, inicio: m.inicio, fim: m.fim ?? null, uf: m.uf ?? null, partido: m.partido ?? null, fonte: m.fonte }))
        .filter((m, i, a) => a.findIndex((x) => x.cargo === m.cargo && x.inicio === m.inicio) === i),
    );
    for (const c of chunks(mand)) await tx.insert(s.mandatos).values(c);

    const props = politicos.flatMap((p) =>
      p.proposicoesLista.map((x) => ({
        id: x.id,
        pid: p.id,
        tipo: x.tipo,
        ementa: x.ementa,
        data: x.data ?? null,
        situacao: x.situacao ?? null,
        virouLei: x.virouLei ?? null,
        fonteUrl: x.url ?? null,
      })),
    );
    for (const c of chunks(props)) await tx.insert(s.proposicoes).values(c).onConflictDoNothing();

    const els = politicos.flatMap((p) =>
      p.eleicoes.map((e) => ({
        pid: p.id,
        ano: e.ano,
        cargo: e.cargo,
        uf: e.uf,
        partido: e.partido ?? null,
        situacao: e.situacao ?? null,
        votos: e.votos ?? null,
        patrimonio: e.patrimonio != null ? String(e.patrimonio) : null,
        bens: e.bens ?? null,
      })),
    );
    for (const c of chunks(els)) await tx.insert(s.eleicoes).values(c).onConflictDoNothing();

    const redes = politicos.flatMap((p) =>
      p.redes.map((r) => ({ pid: p.id, plataforma: r.plataforma, url: r.url, handle: r.handle ?? null, fonte: r.fonte, fonteUrl: r.fonteUrl, verificado: !!r.verificado })),
    );
    for (const c of chunks(redes)) await tx.insert(s.redesSociais).values(c).onConflictDoNothing();

    for (const c of chunks(votacoes, 300))
      await tx.insert(s.votacoes).values(
        c.map((v) => ({
          id: v.id,
          casa: v.casa,
          data: v.data,
          titulo: v.titulo,
          descricao: v.descricao,
          resultado: v.resultado ?? null,
          orientacaoGoverno: v.orientacaoGoverno ?? null,
          orientacoes: v.orientacoes,
          fonteUrl: v.url ?? null,
        })),
      );
    const vts = votacoes.flatMap((v) => v.votos.map((x) => ({ votacaoId: v.id, pid: x.pid, partido: x.partido ?? null, voto: x.voto })));
    for (const c of chunks(vts, 2000)) await tx.insert(s.votos).values(c).onConflictDoNothing();

    const ids = new Set(politicos.map((p) => p.id));
    for (const c of chunks(
      despesas.filter((d) => ids.has(d.pid)),
      2000,
    ))
      await tx.insert(s.despesas).values(
        c.map((d) => ({
          pid: d.pid,
          mes: `${d.ano}-${String(d.mes).padStart(2, "0")}`,
          data: d.data ?? null,
          categoria: d.categoria,
          fornecedor: d.fornecedor,
          fornecedorDoc: d.doc || null,
          valor: d.valor.toFixed(2),
          documento: d.docId || null,
          fonteUrl: d.url ?? fonteDespesa(d.pid) ?? null,
        })),
      );

    // append-only history
    // Prefer full transcripts from the last collection; the public snapshot only keeps the opening.
    const completos = new Map((await lerJson<{ falas: Fala[] }>(path.join(stageDir ?? "", "discursos.json")))?.falas.map((f) => [f.id, f.texto]) ?? []);
    const fs = falas.flatMap((a) =>
      a.falas.map((f) => ({ id: f.id, pid: f.pid, data: f.data, tipo: f.tipo, titulo: f.titulo ?? null, texto: completos.get(f.id) ?? f.texto, url: f.url, fonte: f.fonte })),
    );
    for (const c of chunks(fs, 500)) await tx.insert(s.falas).values(c).onConflictDoNothing();
    const rs = ia.flatMap((a) =>
      a.resumos.map((r) => ({ pid: r.pid, periodo: r.periodo, inicio: r.inicio, fim: r.fim, hash: r.hash, modelo: r.modelo, conteudo: r, geradoEm: new Date(r.geradoEm) })),
    );
    for (const c of chunks(rs, 500)) await tx.insert(s.resumosIA).values(c).onConflictDoNothing();

    if (meta)
      await tx
        .insert(s.execucoes)
        .values({ id: meta.geradoEm, iniciadaEm: new Date(meta.geradoEm), meta })
        .onConflictDoNothing();
  });

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.falas);
  const nVotos = votacoes.reduce((acc, v) => acc + v.votos.length, 0);
  log.info(`Banco: ${politicos.length} políticos, ${votacoes.length} votações, ${nVotos} votos, ${despesas.length} despesas, ${n} falas no histórico`);
}

if (process.argv[1]?.endsWith("db-load.ts")) {
  (async () => {
    const { db } = await import("../src/db/client");
    const d = db();
    if (!d) {
      log.warn("DATABASE_URL não configurada: carga no banco ignorada.");
      return;
    }
    await carregar(d as unknown as DB, path.resolve("data"), path.resolve(".cache", "stage"));
    process.exit(0);
  })().catch((e) => {
    log.error(e);
    process.exit(1);
  });
}
