import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema";
import { carregar } from "../db-load";
import { gerarDemo } from "../demo";

// Real Postgres (WASM build) running in-process: migrations, load and queries are the production ones.
let dir: string;
let pg: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "raio-x-db-"));
  await gerarDemo(dir, new Date("2026-10-11T12:00:00Z"));
  pg = new PGlite();
  db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: path.resolve("drizzle") });
  await carregar(db as never, dir);
}, 60_000);

afterAll(async () => {
  await pg?.close();
  await rm(dir, { recursive: true, force: true });
});

describe("database", () => {
  it("loads every politician with metrics and provenance", async () => {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.politicos);
    expect(n).toBe(270);
    const [p] = await db.select().from(schema.politicos).limit(1);
    expect(p.metricas).toBeTypeOf("object");
    expect(Array.isArray(p.fontes)).toBe(true);
  });

  it("keeps referential integrity between votes and roll calls", async () => {
    const [{ orfaos }] = await db
      .select({ orfaos: sql<number>`count(*)::int` })
      .from(schema.votos)
      .where(sql`votacao_id not in (select id from votacoes)`);
    expect(orfaos).toBe(0);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.votos);
    expect(n).toBeGreaterThan(1000);
  });

  it("finds speeches with Portuguese stemming", async () => {
    // "professor" must match "professores" in the demo speeches
    const r = await db.execute(
      sql`select count(*)::int as n from falas where to_tsvector('portuguese', coalesce(titulo,'') || ' ' || texto) @@ websearch_to_tsquery('portuguese', 'professor')`,
    );
    const n = (r as unknown as { rows: { n: number }[] }).rows[0].n;
    expect(n).toBeGreaterThan(0);
  });

  it("is idempotent: reloading replaces snapshots and keeps history without duplicates", async () => {
    const contar = async () => {
      const [{ p }] = await db.select({ p: sql<number>`count(*)::int` }).from(schema.politicos);
      const [{ f }] = await db.select({ f: sql<number>`count(*)::int` }).from(schema.falas);
      return { p, f };
    };
    const antes = await contar();
    await carregar(db as never, dir);
    expect(await contar()).toEqual(antes);
  });
});
