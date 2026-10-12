import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Unzip, UnzipInflate } from "fflate";
import sharp from "sharp";
import { fetchRaw, mapLimit } from "./lib/http";
import { log } from "./lib/log";

/** Portrait size served by the app (4:5, retina-ready for the largest avatar). */
const LARGURA = 192;
const ALTURA = 240;

export interface FotoAlvo {
  id: string;
  /** Official photo URL at the source */
  url?: string;
}

/**
 * Downloads each official photo once, resizes it to a small WebP and stores it under public/fotos.
 * Serving from our own origin is faster and keeps pages working when government hosts are slow.
 * Returns the local path per politician; the original URL stays as the attributed source.
 */
export async function baixarFotos(alvos: FotoAlvo[], dirPublico: string): Promise<{ locais: Map<string, string>; falhas: number }> {
  const dir = path.join(dirPublico, "fotos");
  await mkdir(dir, { recursive: true });
  const locais = new Map<string, string>();
  let falhas = 0;
  await mapLimit(
    alvos.filter((a) => a.url),
    6,
    async (a) => {
      const candidatos = [a.url!, a.url!.replace(/^https:/, "http:")].filter((u, i, l) => l.indexOf(u) === i);
      for (const url of candidatos) {
        try {
          const r = await fetchRaw(url, { ttlHours: 24 * 30, retries: 1, timeoutMs: 30_000, headers: { Accept: "image/*" } });
          if (!/^image\//.test(r.headers["content-type"] ?? "image/") || r.body.length < 500) continue;
          const webp = await sharp(r.body).resize(LARGURA, ALTURA, { fit: "cover", position: "top" }).webp({ quality: 72 }).toBuffer();
          const arquivo = path.join(dir, `${a.id}.webp`);
          const atual = await readFile(arquivo).catch(() => undefined);
          if (!atual || !atual.equals(webp)) await writeFile(arquivo, webp);
          locais.set(a.id, `/fotos/${a.id}.webp`);
          return;
        } catch {
          /* try next candidate */
        }
      }
      falhas++;
    },
    "Fotos",
  );
  log.info(`Fotos: ${locais.size} salvas, ${falhas} sem foto disponível`);
  return { locais, falhas };
}

/**
 * Candidate photos from the TSE, published as one ZIP per state with every 2022 candidate. Only
 * the files of the people we show are extracted (matched by the candidate sequence number).
 */
export async function baixarFotosTSE(alvos: { id: string; uf: string; sq: string }[], dirPublico: string): Promise<Map<string, string>> {
  const dir = path.join(dirPublico, "fotos");
  await mkdir(dir, { recursive: true });
  const locais = new Map<string, string>();
  const porUf = new Map<string, { id: string; sq: string }[]>();
  for (const a of alvos) porUf.set(a.uf, [...(porUf.get(a.uf) ?? []), a]);
  for (const [uf, lista] of porUf) {
    try {
      const r = await fetchRaw(`https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2022/fotos/foto_cand2022_${uf}_div.zip`, {
        ttlHours: 24 * 180,
        timeoutMs: 900_000,
        retries: 2,
      });
      const porSq = new Map(lista.map((a) => [a.sq, a.id]));
      const achados: { id: string; dados: Uint8Array }[] = [];
      const uz = new Unzip();
      uz.register(UnzipInflate);
      uz.onfile = (f) => {
        const sq = f.name.match(/(\d{9,})/)?.[1];
        const id = sq ? porSq.get(sq) : undefined;
        if (!id) return;
        const partes: Uint8Array[] = [];
        f.ondata = (err, chunk, final) => {
          if (err) throw err;
          partes.push(chunk);
          if (final) achados.push({ id, dados: Buffer.concat(partes) });
        };
        f.start();
      };
      const FATIA = 1 << 16;
      for (let i = 0; i < r.body.length; i += FATIA) uz.push(r.body.subarray(i, i + FATIA), i + FATIA >= r.body.length);
      for (const { id, dados } of achados) {
        const webp = await sharp(dados).resize(LARGURA, ALTURA, { fit: "cover", position: "top" }).webp({ quality: 72 }).toBuffer();
        await writeFile(path.join(dir, `${id}.webp`), webp);
        locais.set(id, `/fotos/${id}.webp`);
      }
      log.info(`Fotos TSE ${uf}: ${achados.length} de ${lista.length}`);
    } catch (e) {
      log.warn(`Fotos TSE ${uf}: ${(e as Error).message}`);
    }
  }
  return locais;
}
