import { unzipSync } from "fflate";
import { parse } from "csv-parse/sync";

/** "DEPUTADO FEDERAL" -> "Deputado federal" (TSE publishes text in capitals) */
export function capitalizar(s: string) {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "ARTHUR CÉSAR PEREIRA DE LIRA" -> "Arthur César Pereira de Lira"; mixed-case names are kept as published. */
export function nomeProprio(s: string): string {
  if (s !== s.toUpperCase()) return s.trim();
  return s
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (["da", "de", "do", "das", "dos", "e"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function norm(s: string | undefined | null): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "jr", "junior", "filho", "neto", "sobrinho"]);
export function nameTokens(s: string) {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Token overlap similarity (Dice coefficient) for person names. */
export function nameSimilarity(a: string, b: string) {
  const A = new Set(nameTokens(a));
  const B = new Set(nameTokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}

/** "1.234,56" | "1234.56" | number -> number */
export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  if (/,\d{1,2}$/.test(s) || (s.includes(",") && !s.includes("."))) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** dd/mm/yyyy or yyyy-mm-dd(...) -> yyyy-mm-dd */
export function isoDate(v: unknown): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return undefined;
}

/** Ensure array (Senado XML->JSON returns object when only one item). */
export function arr<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Safe deep getter: get(o, "a.b.c") */
export function get(o: any, p: string): any {
  return p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
}

export function unzipFirst(buf: Buffer, match?: RegExp): { name: string; data: Uint8Array }[] {
  const files = unzipSync(new Uint8Array(buf));
  return Object.entries(files)
    .filter(([name]) => !match || match.test(name))
    .map(([name, data]) => ({ name, data }));
}

export function decode(data: Uint8Array, encoding: "utf8" | "latin1" = "utf8") {
  return new TextDecoder(encoding === "latin1" ? "latin1" : "utf-8").decode(data).replace(/^﻿/, "");
}

/**
 * Decodes text whose encoding the server does not state reliably: UTF-8 when the bytes are valid
 * UTF-8, Latin-1 otherwise. (ALESP serves UTF-8 files; reading them as Latin-1 garbled accents.)
 */
export function decodeAuto(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/^\uFEFF/, "");
  } catch {
    return decode(data, "latin1");
  }
}

export function parseCsv(text: string, delimiter = ";"): Record<string, string>[] {
  return parse(text, {
    delimiter,
    columns: (h: string[]) => h.map((c) => c.trim().replace(/^"|"$/g, "")),
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

/** Validate CNPJ (14) / CPF (11) check digits. Returns null when the string is not a document. */
export function validDoc(raw: string | undefined): boolean | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11) return validCpf(d);
  if (d.length === 14) return validCnpj(d);
  return null;
}

function validCpf(c: string) {
  if (/^(\d)\1{10}$/.test(c)) return false;
  const dv = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(c[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

function validCnpj(c: string) {
  if (/^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(c[i]) * w[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export function median(xs: number[]) {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return undefined;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function mean(xs: number[]) {
  const a = xs.filter((x) => Number.isFinite(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : undefined;
}

export function quantile(xs: number[], q: number) {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, r) => p - r);
  if (!a.length) return undefined;
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}

export function round(n: number | undefined, d = 4) {
  if (n == null || !Number.isFinite(n)) return undefined;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Split [from, to] into windows of at most `days` days. */
export function windows(from: Date, to: Date, days: number) {
  const out: [string, string][] = [];
  let a = new Date(from);
  while (a <= to) {
    const b = addDays(a, days - 1);
    out.push([ymd(a), ymd(b > to ? to : b)]);
    a = addDays(b, 1);
  }
  return out;
}

export function groupBy<T>(xs: T[], key: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    let g = m.get(k);
    if (!g) m.set(k, (g = []));
    g.push(x);
  }
  return m;
}

export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
