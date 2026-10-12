import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { log } from "./log";

/**
 * Polite HTTP client for public government APIs:
 * - per-host concurrency limit and minimum spacing between requests
 * - retries with exponential backoff, honoring Retry-After (429/5xx)
 * - on-disk cache with TTL so reruns (and CI cache restores) are cheap
 */

const CACHE_DIR = process.env.PIPELINE_CACHE_DIR ?? path.join(process.cwd(), ".cache", "http");
const UA = "raio-x-politico/1.0 (+https://github.com/hugoassisj/raio-x-politico; dados abertos)";

interface HostState {
  active: number;
  queue: (() => void)[];
  lastStart: number;
}
const hosts = new Map<string, HostState>();
const HOST_LIMITS: Record<string, { concurrency: number; spacingMs: number }> = {
  "dadosabertos.camara.leg.br": { concurrency: 4, spacingMs: 120 },
  "legis.senado.leg.br": { concurrency: 3, spacingMs: 150 },
  "adm.senado.gov.br": { concurrency: 2, spacingMs: 200 },
  "api.portaldatransparencia.gov.br": { concurrency: 1, spacingMs: 700 },
  default: { concurrency: 3, spacingMs: 150 },
};

export const stats = { requests: 0, cacheHits: 0, failures: 0, bytes: 0 };

async function acquire(host: string) {
  const lim = HOST_LIMITS[host] ?? HOST_LIMITS.default;
  let st = hosts.get(host);
  if (!st) {
    st = { active: 0, queue: [], lastStart: 0 };
    hosts.set(host, st);
  }
  const s = st;
  if (s.active >= lim.concurrency) {
    await new Promise<void>((resolve) => s.queue.push(resolve));
  }
  s.active++;
  const wait = s.lastStart + lim.spacingMs - Date.now();
  s.lastStart = Math.max(Date.now(), s.lastStart + lim.spacingMs);
  if (wait > 0) await sleep(wait);
}

function release(host: string) {
  const s = hosts.get(host)!;
  s.active--;
  const next = s.queue.shift();
  if (next) next();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchOpts {
  /** Cache time-to-live in hours. 0 disables reading from cache. */
  ttlHours?: number;
  headers?: Record<string, string>;
  retries?: number;
  timeoutMs?: number;
  /** Treat these statuses as a valid empty response instead of an error */
  allowStatus?: number[];
}

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  fromCache: boolean;
}

function cacheKey(url: string, headers?: Record<string, string>) {
  // never put secrets in the key file name; hash everything
  return createHash("sha1")
    .update(url + JSON.stringify(headers ?? {}))
    .digest("hex");
}

export async function fetchRaw(url: string, opts: FetchOpts = {}): Promise<RawResponse> {
  const { ttlHours = 20, headers = {}, retries = 4, timeoutMs = 60_000, allowStatus = [] } = opts;
  const key = cacheKey(url, headers);
  const bodyPath = path.join(CACHE_DIR, key.slice(0, 2), key + ".bin");
  const metaPath = bodyPath.replace(/\.bin$/, ".json");

  if (ttlHours > 0) {
    try {
      const st = await stat(metaPath);
      if (Date.now() - st.mtimeMs < ttlHours * 3600_000) {
        const meta = JSON.parse(await readFile(metaPath, "utf8"));
        const body = await readFile(bodyPath);
        stats.cacheHits++;
        return { status: meta.status, headers: meta.headers, body, fromCache: true };
      }
    } catch {
      /* cache miss */
    }
  }

  const host = new URL(url).host;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await acquire(host);
    let res: Response | undefined;
    try {
      stats.requests++;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json, */*", ...headers },
        signal: ctrl.signal,
        redirect: "follow",
      });
      const buf = Buffer.from(await res.arrayBuffer());
      clearTimeout(t);
      const hdrs: Record<string, string> = {};
      res.headers.forEach((v, k) => (hdrs[k] = v));
      if (res.ok || allowStatus.includes(res.status)) {
        stats.bytes += buf.length;
        await mkdir(path.dirname(bodyPath), { recursive: true });
        await writeFile(bodyPath, buf);
        await writeFile(metaPath, JSON.stringify({ url: redact(url), status: res.status, headers: hdrs }));
        return { status: res.status, headers: hdrs, body: buf, fromCache: false };
      }
      lastErr = new Error(`HTTP ${res.status} ${redact(url)}`);
      const retriable = res.status === 429 || res.status >= 500 || res.status === 408;
      if (!retriable) break;
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : backoff(attempt));
    } catch (e) {
      lastErr = e;
      await sleep(backoff(attempt));
    } finally {
      release(host);
    }
  }
  stats.failures++;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function backoff(attempt: number) {
  return Math.min(30_000, 1000 * 2 ** attempt) + Math.random() * 500;
}

function redact(url: string) {
  return url.replace(/(chave|key|token)=[^&]+/gi, "$1=***");
}

export async function getJson<T = any>(url: string, opts?: FetchOpts): Promise<T> {
  const r = await fetchRaw(url, opts);
  const text = r.body.toString("utf8").replace(/^﻿/, "");
  if (!text.trim()) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`JSON inválido de ${redact(url)}: ${text.slice(0, 120)}`);
  }
}

export async function getJsonWithHeaders<T = any>(url: string, opts?: FetchOpts): Promise<{ data: T; headers: Record<string, string> }> {
  const r = await fetchRaw(url, opts);
  const text = r.body.toString("utf8").replace(/^﻿/, "");
  return { data: (text.trim() ? JSON.parse(text) : null) as T, headers: r.headers };
}

/** Run `fn` over items with bounded parallelism (HTTP layer still enforces per-host limits). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>, label?: string): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length);
  let i = 0;
  let done = 0;
  let failed = 0;
  const started = Date.now();
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (e) {
        failed++;
        if (failed <= 5) log.warn(`${label ?? "item"} #${idx} falhou: ${(e as Error).message}`);
      }
      done++;
      if (label && done % 50 === 0) log.info(`${label}: ${done}/${items.length} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (label && failed) log.warn(`${label}: ${failed}/${items.length} falharam`);
  return out;
}
