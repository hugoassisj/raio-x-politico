import type { RedeSocial } from "./types";

/** Display names of each platform, so every page names them the same way. */
export const NOME_REDE: Record<RedeSocial["plataforma"], string> = {
  x: "X (antigo Twitter)",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
  kwai: "Kwai",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  site: "Site",
};

/** Fixed order, so profiles list networks the same way regardless of the source order. */
const ORDEM: RedeSocial["plataforma"][] = ["instagram", "x", "facebook", "youtube", "tiktok", "threads", "bluesky", "kwai", "telegram", "linkedin", "site"];

/** Splits links into social networks and personal sites, deduplicated by address and ordered. */
export function separarRedes(redes: RedeSocial[]): { sociais: RedeSocial[]; sites: RedeSocial[] } {
  const vistos = new Set<string>();
  const unicas = redes.filter((r) => {
    const k = r.url
      .replace(/^https?:\/\/(www\.)?/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const ordem = (r: RedeSocial) => ORDEM.indexOf(r.plataforma);
  const sociais = unicas.filter((r) => r.plataforma !== "site").sort((a, b) => ordem(a) - ordem(b) || a.url.localeCompare(b.url));
  const sites = unicas.filter((r) => r.plataforma === "site").sort((a, b) => a.url.localeCompare(b.url));
  return { sociais, sites };
}
