/**
 * Shared pagination: one rule for every list in the site. Pages are numbered from 1, an out of
 * range page snaps to the nearest valid one, and the list must already be in a stable order.
 */
export interface Pagina<T> {
  itens: T[];
  pagina: number;
  paginas: number;
  total: number;
  /** 1-based position of the first and last item shown, 0 when the list is empty */
  inicio: number;
  fim: number;
}

export function paginar<T>(lista: T[], pagina: number, tamanho: number): Pagina<T> {
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / Math.max(1, tamanho)));
  const p = Math.min(paginas, Math.max(1, Math.floor(Number.isFinite(pagina) ? pagina : 1)));
  const de = (p - 1) * tamanho;
  const itens = lista.slice(de, de + tamanho);
  return { itens, pagina: p, paginas, total, inicio: total ? de + 1 : 0, fim: de + itens.length };
}

/**
 * Page numbers to show as buttons: always the first, the last and the neighbors of the current page,
 * with null where a gap is collapsed ("1 … 4 5 6 … 20").
 */
export function numerosDePagina(pagina: number, paginas: number, vizinhos = 1): (number | null)[] {
  const set = new Set([1, paginas]);
  for (let p = pagina - vizinhos; p <= pagina + vizinhos; p++) if (p >= 1 && p <= paginas) set.add(p);
  const ordem = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const [i, p] of ordem.entries()) {
    if (i && p - ordem[i - 1] > 1) out.push(p - ordem[i - 1] === 2 ? p - 1 : null);
    out.push(p);
  }
  return out;
}

/** Reads a page number from a URL value, defaulting to 1. */
export function lerPagina(v: string | null | undefined): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
