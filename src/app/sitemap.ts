import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";
import { getPoliticos, getVotacoes } from "@/lib/data";
import { ESTADOS } from "@/lib/ufs";

const SITE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pols, vots] = await Promise.all([getPoliticos(), getVotacoes()]);
  const fixas = ["", "/sobre", "/politicos", "/votacoes", "/partidos", "/gastos", "/falas", "/comparar", "/como-funciona", "/analises", "/dados"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "daily" as const,
  }));
  return [
    ...fixas,
    ...ESTADOS.map((e) => ({ url: `${SITE}/estado/${e.uf.toLowerCase()}`, changeFrequency: "daily" as const })),
    ...pols.map((p) => ({ url: `${SITE}/politico/${p.id}`, changeFrequency: "daily" as const })),
    ...vots.map((v) => ({ url: `${SITE}/votacao/${v.id}`, changeFrequency: "monthly" as const })),
  ];
}
