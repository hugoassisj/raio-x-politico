/** Median of the finite numbers in a list, or undefined when there are none. */
export function median(xs: number[]): number | undefined {
  const a = xs.filter((x) => Number.isFinite(x)).sort((p, q) => p - q);
  if (!a.length) return undefined;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Pearson correlation of paired values, or undefined with fewer than 10 pairs. */
export function correlacao(pares: [number, number][]): number | undefined {
  const p = pares.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (p.length < 10) return undefined;
  const mx = p.reduce((s, [x]) => s + x, 0) / p.length;
  const my = p.reduce((s, [, y]) => s + y, 0) / p.length;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (const [x, y] of p) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : undefined;
}

/** Plain-language strength of a correlation, never implying cause. */
export function forcaCorrelacao(r: number | undefined) {
  if (r == null) return "Poucos dados para comparar.";
  const a = Math.abs(r);
  const sentido = r > 0 ? "quanto maior um, maior o outro" : "quanto maior um, menor o outro";
  if (a < 0.1) return "Praticamente nenhuma relação: um número não ajuda a prever o outro.";
  if (a < 0.3) return `Relação fraca (${sentido}, mas com muitas exceções).`;
  if (a < 0.5) return `Relação moderada: em geral, ${sentido}.`;
  return `Relação forte: ${sentido}.`;
}
