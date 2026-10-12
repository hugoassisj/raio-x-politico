import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
