import type { Casa, PoliticoResumo } from "./types";
import { METRICAS, type ChaveMetrica } from "./metricas";

export interface Filtro {
  casa?: Casa;
  uf?: string;
  partido?: string;
  /** Part of the name */
  q?: string;
  ordem: ChaveMetrica | "nome";
  dir: "asc" | "desc";
  pagina: number;
}

const CASAS: Casa[] = ["camara", "senado", "assembleia"];
export const POR_PAGINA = 50;

const texto = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Parse and validate URL search params; anything unknown falls back to a safe default. */
export function lerFiltro(sp: Record<string, string | string[] | undefined>): Filtro {
  const casa = texto(sp.casa) as Casa;
  const ordem = texto(sp.ordem);
  const pagina = Math.max(1, Math.floor(Number(texto(sp.pagina)) || 1));
  return {
    casa: CASAS.includes(casa) ? casa : undefined,
    uf: /^[A-Za-z]{2}$/.test(texto(sp.uf)) ? texto(sp.uf).toUpperCase() : undefined,
    partido: texto(sp.partido).slice(0, 30) || undefined,
    q: texto(sp.q).trim().slice(0, 60) || undefined,
    ordem: METRICAS.some((m) => m.chave === ordem) ? (ordem as ChaveMetrica) : "nome",
    dir: texto(sp.dir) === "desc" ? "desc" : "asc",
    pagina,
  };
}

/** Filter and sort. People without a value for the sort metric always go to the end. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtered and sorted list, whole (for downloads); `aplicarFiltro` cuts it into pages. */
export function filtrarOrdenar(pols: PoliticoResumo[], f: Filtro): PoliticoResumo[] {
  const q = f.q ? norm(f.q) : "";
  const lista = pols.filter(
    (p) => (!f.casa || p.casa === f.casa) && (!f.uf || p.uf === f.uf) && (!f.partido || p.partido === f.partido) && (!q || norm(`${p.nome} ${p.nomeCivil ?? ""}`).includes(q)),
  );
  const s = f.dir === "asc" ? 1 : -1;
  lista.sort((a, b) => {
    if (f.ordem === "nome") return s * a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
    const va = a.m[f.ordem];
    const vb = b.m[f.ordem];
    if (va == null && vb == null) return a.nome.localeCompare(b.nome, "pt-BR");
    if (va == null) return 1;
    if (vb == null) return -1;
    return s * (va - vb) || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
  });
  return lista;
}

export function aplicarFiltro(pols: PoliticoResumo[], f: Filtro) {
  const lista = filtrarOrdenar(pols, f);
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(f.pagina, paginas);
  return { total, paginas, pagina, itens: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA) };
}

export function urlFiltro(base: string, f: Partial<Filtro>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v != null && v !== "" && !(k === "pagina" && v === 1)) q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
