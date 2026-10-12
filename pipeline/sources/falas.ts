import { getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { addDays, arr, get, isoDate, windows, ymd } from "../lib/util";
import type { Fala, RedeSocial } from "../../src/lib/types";
import type { PoliticoParcial } from "../model";

const CAM = "https://dadosabertos.camara.leg.br/api/v2";
const SEN = "https://legis.senado.leg.br/dadosabertos";

/** Official plenary speeches. Câmara has summaries + full transcripts; Senado has summaries + link to full text. */
export async function coletarDiscursos(pols: PoliticoParcial[], hoje: Date, dias: number): Promise<{ falas: Fala[]; avisos: string[] }> {
  const falas: Fala[] = [];
  const avisos: string[] = [];
  const ini = addDays(hoje, -dias);

  const deps = pols.filter((p) => p.casa === "camara");
  let falhas = 0;
  await mapLimit(
    deps,
    3,
    async (p) => {
      const id = p.id.slice(4);
      for (const [a, b] of windows(ini, hoje, 60)) {
        try {
          const j: any = await getJson(`${CAM}/deputados/${id}/discursos?dataInicio=${a}&dataFim=${b}&ordenarPor=dataHoraInicio&ordem=DESC&itens=100`, {
            ttlHours: b < ymd(addDays(hoje, -7)) ? 24 * 30 : 20,
            timeoutMs: 90_000,
            retries: 2,
          });
          for (const d of j?.dados ?? []) {
            const data = isoDate(d.dataHoraInicio);
            if (!data) continue;
            falas.push({
              id: `cam-disc-${id}-${d.dataHoraInicio}`.replace(/[^\w-]/g, ""),
              pid: p.id,
              data,
              tipo: "discurso",
              titulo: [d.tipoDiscurso, d.faseEvento?.titulo].filter(Boolean).join(" - ") || "Discurso",
              texto: (d.transcricao ?? d.sumario ?? "").replace(/\s+/g, " ").trim().slice(0, 12000),
              resumoOficial: d.sumario ?? undefined,
              palavrasChave: d.keywords ? String(d.keywords).split(/[,;]\s*/).filter(Boolean).slice(0, 12) : undefined,
              url: d.urlTexto ?? d.urlVideo ?? `https://www.camara.leg.br/deputados/${id}`,
              midia: d.urlVideo ?? d.urlAudio ?? undefined,
              fonte: "Câmara dos Deputados - Discursos",
            });
          }
        } catch {
          falhas++;
        }
      }
    },
    "Câmara discursos",
  );
  if (falhas) avisos.push(`Discursos Câmara: ${falhas} janelas falharam (API instável); serão tentadas na próxima execução`);

  const sens = pols.filter((p) => p.casa === "senado");
  await mapLimit(
    sens,
    3,
    async (p) => {
      const id = p.id.slice(4);
      const j: any = await getJson(`${SEN}/senador/${id}/discursos.json?dataInicio=${ymd(ini).replace(/-/g, "")}&dataFim=${ymd(hoje).replace(/-/g, "")}`, {
        ttlHours: 20,
        retries: 2,
      });
      for (const d of arr(get(j, "DiscursosParlamentar.Parlamentar.Pronunciamentos.Pronunciamento"))) {
        const data = isoDate(d.DataPronunciamento);
        if (!data) continue;
        falas.push({
          id: `sen-disc-${d.CodigoPronunciamento}`,
          pid: p.id,
          data,
          tipo: "discurso",
          titulo: get(d, "TipoUsoPalavra.Descricao") ?? "Pronunciamento",
          texto: String(d.TextoResumo ?? "").trim(),
          resumoOficial: d.TextoResumo ?? undefined,
          palavrasChave: d.Indexacao ? String(d.Indexacao).split(/[,;.]\s*/).filter(Boolean).slice(0, 12) : undefined,
          url: d.UrlTexto ?? `https://www25.senado.leg.br/web/atividade/pronunciamentos/-/p/pronunciamento/${d.CodigoPronunciamento}`,
          fonte: "Senado Federal - Pronunciamentos",
        });
      }
    },
    "Senado discursos",
  );
  log.info(`Discursos: ${falas.length}`);
  return { falas, avisos };
}

// ---------------- Social media ----------------

export function plataforma(url: string): RedeSocial["plataforma"] {
  const u = url.toLowerCase();
  if (/(twitter\.com|x\.com)\//.test(u)) return "x";
  if (/instagram\.com/.test(u)) return "instagram";
  if (/tiktok\.com/.test(u)) return "tiktok";
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (/facebook\.com|fb\.com/.test(u)) return "facebook";
  if (/threads\.net/.test(u)) return "threads";
  if (/bsky\.app/.test(u)) return "bluesky";
  if (/kwai/.test(u)) return "kwai";
  if (/linkedin\.com/.test(u)) return "linkedin";
  if (/t\.me\//.test(u)) return "telegram";
  return "site";
}

export function normalizaUrl(raw: string): string | undefined {
  let s = raw.trim();
  if (!s || /^(-|#|n[aã]o possui)/i.test(s)) return undefined;
  if (/^@/.test(s)) return undefined; // bare handle without platform is ambiguous
  if (!/^https?:\/\//i.test(s)) s = "https://" + s.replace(/^\/+/, "");
  try {
    const u = new URL(s);
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

export function handleDe(url: string): string | undefined {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    if (!seg.length) return undefined;
    const h = seg[0] === "channel" || seg[0] === "c" || seg[0] === "user" ? seg[1] : seg[0];
    return h?.replace(/^@/, "");
  } catch {
    return undefined;
  }
}

/**
 * YouTube Data API v3 (official, free quota). Resolves a channel from its URL and lists recent uploads.
 * Other platforms (X, Instagram, TikTok) have no free public content API; see pipeline/sources/social-connectors.ts.
 */
export async function coletarYouTube(redes: RedeSocial[], chave: string, dias: number): Promise<Fala[]> {
  const yt = redes.filter((r) => r.plataforma === "youtube");
  const falas: Fala[] = [];
  const desde = addDays(new Date(), -dias).toISOString();
  await mapLimit(
    yt,
    2,
    async (r) => {
      const h = handleDe(r.url);
      if (!h) return;
      const byId = /^UC[\w-]{20,}$/.test(h);
      const ch: any = await getJson(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&${byId ? `id=${h}` : `forHandle=${encodeURIComponent("@" + h)}`}&key=${chave}`,
        { ttlHours: 24 * 7 },
      );
      const c = ch?.items?.[0];
      const uploads = c?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploads) return;
      r.verificado = true;
      const pl: any = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploads}&key=${chave}`, { ttlHours: 20 });
      for (const it of pl?.items ?? []) {
        const s = it.snippet ?? {};
        if (!s.publishedAt || s.publishedAt < desde) continue;
        const vid = s.resourceId?.videoId;
        falas.push({
          id: `yt-${vid}`,
          pid: r.pid,
          data: s.publishedAt.slice(0, 10),
          tipo: "youtube",
          titulo: s.title,
          texto: String(s.description ?? "").slice(0, 4000),
          url: `https://www.youtube.com/watch?v=${vid}`,
          fonte: "YouTube Data API",
        });
      }
    },
    "YouTube",
  );
  log.info(`YouTube: ${falas.length} vídeos`);
  return falas;
}
