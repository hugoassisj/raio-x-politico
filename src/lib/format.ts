/** Shown wherever a value is missing (no data is never displayed as zero). */
export const VAZIO = "–";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export const numero = (n: number | undefined) => (n == null ? VAZIO : nf0.format(n));

export const pct = (n: number | undefined, casas = 0) => (n == null ? VAZIO : `${(n * 100).toFixed(casas).replace(".", ",")}%`);

export const moeda = (n: number | undefined) => (n == null ? VAZIO : brl.format(n));
export const moedaCentavos = (n: number | undefined) => (n == null ? VAZIO : brl2.format(n));

/** Compact currency for headlines: R$ 124 mil, R$ 1,2 mi, R$ 3,4 bi */
export function moedaCurta(n: number | undefined) {
  if (n == null) return VAZIO;
  const a = Math.abs(n);
  if (a >= 1e9) return `R$ ${nf1.format(n / 1e9)} bi`;
  if (a >= 1e6) return `R$ ${nf1.format(n / 1e6)} mi`;
  if (a >= 1e3) return `R$ ${nf0.format(n / 1e3)} mil`;
  return brl.format(n);
}

export function numeroCurto(n: number | undefined) {
  if (n == null) return VAZIO;
  if (Math.abs(n) >= 1e6) return `${nf1.format(n / 1e6)} mi`;
  if (Math.abs(n) >= 1e4) return `${nf0.format(n / 1e3)} mil`;
  return nf0.format(n);
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** yyyy-mm-dd -> 3 set 2026 (parsed as a calendar date, never shifted by timezone) */
export function data(iso: string | undefined) {
  if (!iso) return VAZIO;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function mesAno(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${String(y).slice(2)}`;
}

export function dataHora(iso: string | undefined) {
  if (!iso) return VAZIO;
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "long", timeStyle: "short" });
}

export function idade(nasc: string | undefined, hoje = new Date()) {
  if (!nasc) return undefined;
  const [y, m, d] = nasc.split("-").map(Number);
  let a = hoje.getUTCFullYear() - y;
  if (hoje.getUTCMonth() + 1 < m || (hoje.getUTCMonth() + 1 === m && hoje.getUTCDate() < d)) a--;
  return a;
}

export const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;

export function iniciais(nome: string) {
  const p = nome.split(/\s+/).filter((x) => x.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(x));
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
