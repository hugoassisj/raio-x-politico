import { getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { addDays } from "../lib/util";
import type { Fala, RedeSocial } from "../../src/lib/types";
import { handleDe } from "./falas";

/**
 * Connectors for platforms whose content is only reachable through official, credentialed APIs.
 * We never scrape: each connector is enabled only when its credential is configured, and every
 * collected post keeps its permalink so anyone can verify it on the platform.
 *
 *  - X (Twitter) API v2           X_BEARER_TOKEN            (paid tier with user timeline access)
 *  - Instagram Graph API          IG_ACCESS_TOKEN + IG_USER_ID (Business Discovery: public business/creator accounts)
 *  - TikTok Research API          TIKTOK_RESEARCH_TOKEN     (approved researchers only)
 */
export interface ConnectorStatus {
  plataforma: string;
  ativo: boolean;
  motivo?: string;
  coletados: number;
}

export async function coletarConectoresSociais(redes: RedeSocial[], dias: number): Promise<{ falas: Fala[]; status: ConnectorStatus[] }> {
  const falas: Fala[] = [];
  const status: ConnectorStatus[] = [];
  const desde = addDays(new Date(), -dias).toISOString();

  // ---- X ----
  const xTok = process.env.X_BEARER_TOKEN;
  if (!xTok) status.push({ plataforma: "x", ativo: false, motivo: "X_BEARER_TOKEN não configurado", coletados: 0 });
  else {
    const n0 = falas.length;
    const h = { Authorization: `Bearer ${xTok}` };
    await mapLimit(
      redes.filter((r) => r.plataforma === "x"),
      1,
      async (r) => {
        const user = handleDe(r.url);
        if (!user) return;
        const u: any = await getJson(`https://api.x.com/2/users/by/username/${encodeURIComponent(user)}`, { headers: h, ttlHours: 24 * 7 });
        const id = u?.data?.id;
        if (!id) return;
        r.verificado = true;
        const t: any = await getJson(`https://api.x.com/2/users/${id}/tweets?max_results=100&start_time=${desde}&tweet.fields=created_at&exclude=replies`, { headers: h, ttlHours: 20 });
        for (const tw of t?.data ?? []) {
          falas.push({ id: `x-${tw.id}`, pid: r.pid, data: tw.created_at.slice(0, 10), tipo: "x", texto: tw.text, url: `https://x.com/${user}/status/${tw.id}`, fonte: "X API v2" });
        }
      },
      "X",
    );
    status.push({ plataforma: "x", ativo: true, coletados: falas.length - n0 });
  }

  // ---- Instagram (Business Discovery) ----
  const igTok = process.env.IG_ACCESS_TOKEN;
  const igUser = process.env.IG_USER_ID;
  if (!igTok || !igUser) status.push({ plataforma: "instagram", ativo: false, motivo: "IG_ACCESS_TOKEN/IG_USER_ID não configurados", coletados: 0 });
  else {
    const n0 = falas.length;
    await mapLimit(
      redes.filter((r) => r.plataforma === "instagram"),
      1,
      async (r) => {
        const user = handleDe(r.url);
        if (!user) return;
        const j: any = await getJson(
          `https://graph.facebook.com/v21.0/${igUser}?fields=business_discovery.username(${encodeURIComponent(user)}){media.limit(50){caption,timestamp,permalink,media_type}}&access_token=${igTok}`,
          { ttlHours: 20 },
        );
        const media = j?.business_discovery?.media?.data ?? [];
        if (media.length) r.verificado = true;
        for (const m of media) {
          if (!m.timestamp || m.timestamp < desde) continue;
          falas.push({ id: `ig-${m.id}`, pid: r.pid, data: m.timestamp.slice(0, 10), tipo: "instagram", texto: m.caption ?? "", url: m.permalink, fonte: "Instagram Graph API" });
        }
      },
      "Instagram",
    );
    status.push({ plataforma: "instagram", ativo: true, coletados: falas.length - n0 });
  }

  // ---- TikTok Research API ----
  const ttTok = process.env.TIKTOK_RESEARCH_TOKEN;
  if (!ttTok) status.push({ plataforma: "tiktok", ativo: false, motivo: "TIKTOK_RESEARCH_TOKEN não configurado (acesso restrito a pesquisadores)", coletados: 0 });
  else {
    const n0 = falas.length;
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    await mapLimit(
      redes.filter((r) => r.plataforma === "tiktok"),
      1,
      async (r) => {
        const user = handleDe(r.url);
        if (!user) return;
        const res = await fetch("https://open.tiktokapis.com/v2/research/video/query/?fields=id,create_time,video_description,username", {
          method: "POST",
          headers: { Authorization: `Bearer ${ttTok}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: { and: [{ operation: "EQ", field_name: "username", field_values: [user] }] },
            start_date: fmt(addDays(new Date(), -Math.min(dias, 30))),
            end_date: fmt(new Date()),
            max_count: 100,
          }),
        });
        if (!res.ok) return;
        const j: any = await res.json();
        for (const v of j?.data?.videos ?? []) {
          falas.push({
            id: `tt-${v.id}`,
            pid: r.pid,
            data: new Date(v.create_time * 1000).toISOString().slice(0, 10),
            tipo: "tiktok",
            texto: v.video_description ?? "",
            url: `https://www.tiktok.com/@${user}/video/${v.id}`,
            fonte: "TikTok Research API",
          });
        }
      },
      "TikTok",
    );
    status.push({ plataforma: "tiktok", ativo: true, coletados: falas.length - n0 });
  }

  for (const s of status) log.info(`Conector ${s.plataforma}: ${s.ativo ? `${s.coletados} posts` : s.motivo}`);
  return { falas, status };
}
