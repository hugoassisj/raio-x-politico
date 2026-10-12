import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { Fala, FalasArquivo } from "./types";

export interface ResultadoBusca {
  itens: (Fala & { trecho?: string })[];
  total: number;
  motor: "banco" | "arquivos";
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let todas: Promise<Fala[]> | undefined;
/** Snapshot fallback: every statement file loaded once per server instance. */
function carregarTodas(): Promise<Fala[]> {
  todas ??= (async () => {
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATA_DIR ?? "data", "falas");
    const arquivos = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith(".json"));
    const out: Fala[] = [];
    for (const f of arquivos) {
      try {
        out.push(...(JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(dir, f), "utf8")) as FalasArquivo).falas);
      } catch {
        // a malformed file is skipped; the rest of the search still works
      }
    }
    return out.sort((a, b) => b.data.localeCompare(a.data));
  })();
  return todas;
}

/**
 * Excerpt around the first match with every match wrapped in « », the same markers Postgres
 * ts_headline produces. Accent stripping keeps string length for precomposed text, so indexes
 * found on the normalized copy apply to the original.
 */
export function trecho(texto: string, termos: string[]) {
  const n = norm(texto);
  const pos = termos.map((t) => n.indexOf(t)).filter((x) => x >= 0);
  if (!pos.length || n.length !== texto.length) return texto.slice(0, 280);
  const ini = Math.max(0, Math.min(...pos) - 120);
  const fim = Math.min(texto.length, ini + 300);
  let out = "";
  let i = ini;
  while (i < fim) {
    const t = termos.find((x) => n.startsWith(x, i));
    if (t) {
      out += `«${texto.slice(i, i + t.length)}»`;
      i += t.length;
    } else out += texto[i++];
  }
  return `${ini > 0 ? "…" : ""}${out}${fim < texto.length ? "…" : ""}`;
}

/**
 * Full-text search over speeches and posts. Uses Postgres (Portuguese stemming, ranking) when
 * DATABASE_URL is set; otherwise scans the published snapshot.
 */
export async function buscarFalas(q: string, opts: { pid?: string; tipo?: string; pagina: number; porPagina: number }): Promise<ResultadoBusca> {
  const d = db();
  const termo = q.trim();
  if (d && termo) {
    const tsq = sql`websearch_to_tsquery('portuguese', ${termo})`;
    const doc = sql`to_tsvector('portuguese', coalesce(${schema.falas.titulo}, '') || ' ' || ${schema.falas.texto})`;
    const filtros = [sql`${doc} @@ ${tsq}`, opts.pid ? eq(schema.falas.pid, opts.pid) : undefined, opts.tipo ? eq(schema.falas.tipo, opts.tipo) : undefined].filter(Boolean);
    const where = and(...(filtros as Parameters<typeof and>));
    const [{ n }] = await d
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.falas)
      .where(where);
    const rows = await d
      .select({
        id: schema.falas.id,
        pid: schema.falas.pid,
        data: schema.falas.data,
        tipo: schema.falas.tipo,
        titulo: schema.falas.titulo,
        texto: sql<string>`left(${schema.falas.texto}, 1500)`,
        url: schema.falas.url,
        fonte: schema.falas.fonte,
        trecho: sql<string>`ts_headline('portuguese', ${schema.falas.texto}, ${tsq}, 'MaxWords=45, MinWords=20, StartSel=«, StopSel=»')`,
      })
      .from(schema.falas)
      .where(where)
      .orderBy(desc(sql`ts_rank(${doc}, ${tsq})`), desc(schema.falas.data))
      .limit(opts.porPagina)
      .offset((opts.pagina - 1) * opts.porPagina);
    return {
      itens: rows.map((r) => ({ ...r, tipo: r.tipo as Fala["tipo"], titulo: r.titulo ?? undefined, data: String(r.data) })),
      total: n,
      motor: "banco",
    };
  }

  const termos = norm(termo).split(/\s+/).filter(Boolean);
  const lista = (await carregarTodas()).filter(
    (f) => (!opts.pid || f.pid === opts.pid) && (!opts.tipo || f.tipo === opts.tipo) && (!termos.length || termos.every((t) => norm(`${f.titulo ?? ""} ${f.texto}`).includes(t))),
  );
  return {
    itens: lista.slice((opts.pagina - 1) * opts.porPagina, opts.pagina * opts.porPagina).map((f) => ({ ...f, trecho: termos.length ? trecho(f.texto, termos) : undefined })),
    total: lista.length,
    motor: "arquivos",
  };
}
