import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Unzip, UnzipInflate } from "fflate";

type Linha = (row: Record<string, string>, arquivo: string) => void;
interface Opcoes {
  /** Which files inside the archive to read */
  arquivo?: (nome: string) => boolean;
  /** Cheap test on the raw line before it is split, for files where few rows matter */
  filtroRapido?: (linhaCrua: string) => boolean;
  encoding?: "latin1" | "utf-8";
}

/**
 * Streams the CSV files inside an official ZIP one line at a time and hands each row to `linha`
 * as an object keyed by the file's own header. Large TSE files (hundreds of MB, larger than the
 * maximum JavaScript string) are never decoded whole, and rows the caller does not keep are
 * dropped right away, so memory stays proportional to what is kept.
 *
 * TSE files are Latin-1, ";"-separated, every field in double quotes.
 */
export function percorrerCsvZip(zip: Uint8Array, linha: Linha, opts: Opcoes = {}) {
  const uz = leitor(linha, opts);
  // Pushed in slices: pushed whole, the decompressor would emit each file as a single chunk
  const FATIA = 1 << 16;
  for (let i = 0; i < zip.length; i += FATIA) uz.push(zip.subarray(i, i + FATIA), i + FATIA >= zip.length);
}

/** Same as percorrerCsvZip, reading the archive from disk in small chunks (files of several GB). */
export async function percorrerCsvZipArquivo(caminho: string, linha: Linha, opts: Opcoes = {}) {
  const uz = leitor(linha, opts);
  const { size } = await stat(caminho);
  let lido = 0;
  for await (const chunk of createReadStream(caminho, { highWaterMark: 1 << 16 })) {
    lido += (chunk as Buffer).length;
    uz.push(new Uint8Array(chunk as Buffer), lido >= size);
  }
  if (size === 0) uz.push(new Uint8Array(0), true);
}

function leitor(linha: Linha, opts: Opcoes) {
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    if (!/\.(csv|txt)$/i.test(f.name) || (opts.arquivo && !opts.arquivo(f.name))) return;
    const dec = new TextDecoder(opts.encoding ?? "latin1");
    let resto = "";
    let cabecalho: string[] | undefined;
    const processar = (l: string) => {
      if (!l) return;
      if (!cabecalho) {
        cabecalho = campos(l.replace(/^﻿/, ""));
        return;
      }
      // Cheap substring test before splitting, for files where only a few rows matter
      if (opts.filtroRapido && !opts.filtroRapido(l)) return;
      const c = campos(l);
      const row: Record<string, string> = {};
      for (let i = 0; i < cabecalho.length; i++) row[cabecalho[i]] = c[i] ?? "";
      linha(row, f.name);
    };
    f.ondata = (err, chunk, final) => {
      if (err) throw err;
      const linhas = (resto + dec.decode(chunk, { stream: !final })).split(/\r?\n/);
      resto = final ? "" : (linhas.pop() ?? "");
      for (const l of linhas) processar(l);
    };
    f.start();
  };
  return uz;
}

/** A quoted field next to an unquoted one: the line mixes both styles, so the fast split is wrong. */
const MISTO = /";(?!")|(?<!");"/;

/**
 * Splits one ";"-separated line, removing the quotes the TSE puts around fields. Most files quote
 * every field, which allows a plain split; the national candidacy file ("_BR") leaves numbers
 * unquoted (`"#NULO";280001681360;"PARTIDO ISOLADO"`), which a plain split would shift by one
 * column, so those lines are walked field by field, honoring quotes.
 */
export function campos(l: string): string[] {
  if (l.startsWith('"') && l.endsWith('"') && !MISTO.test(l)) {
    const partes = l.slice(1, -1).split('";"');
    return l.includes('""') ? partes.map((x) => x.replace(/""/g, '"')) : partes;
  }
  if (!l.includes('"')) return l.split(";");
  const out: string[] = [];
  const re = /"((?:[^"]|"")*)"|([^;]*)/y;
  let i = 0;
  for (;;) {
    re.lastIndex = i;
    const m = re.exec(l)!;
    out.push(m[1] != null ? m[1].replace(/""/g, '"') : m[2]);
    i = re.lastIndex;
    if (i >= l.length) break;
    // Skip the separator (or anything stray after a closing quote, up to the next separator)
    i = l[i] === ";" ? i + 1 : l.indexOf(";", i) < 0 ? l.length : l.indexOf(";", i) + 1;
    if (i >= l.length) {
      out.push("");
      break;
    }
  }
  return out;
}
