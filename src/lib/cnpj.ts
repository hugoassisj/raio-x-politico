/**
 * CNPJ (company registry number) normalization and check digits, shared by the pipeline and the
 * site. Supports the numeric format and the alphanumeric one the Receita Federal started issuing
 * in July 2026 (IN RFB 2.229/2024): the first 12 characters may be letters, each worth its ASCII
 * code minus 48, and the two check digits stay numeric.
 */

/** Uppercase, without dots, slashes or dashes; undefined when it cannot be a CNPJ. */
export function normalizarCnpj(v: string | undefined | null): string | undefined {
  const s = (v ?? "")
    .toUpperCase()
    .replace(/[.\-/\s]/g, "")
    .trim();
  if (/^\d{1,14}$/.test(s) && s.length >= 12) return s.padStart(14, "0");
  return /^[0-9A-Z]{12}\d{2}$/.test(s) ? s : undefined;
}

const valor = (c: string) => c.charCodeAt(0) - 48;

function digito(base: string): number {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = [...base].reduce((s, c, i) => s + valor(c) * pesos[i], 0);
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

/** True when the two check digits match (and the number is not a run of one repeated character). */
export function cnpjValido(v: string | undefined | null): boolean {
  const c = normalizarCnpj(v);
  if (!c || /^(.)\1{13}$/.test(c)) return false;
  const d1 = digito(c.slice(0, 12));
  const d2 = digito(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}

/** "12.345.678/0001-95" */
export function formatarCnpj(v: string): string {
  const c = normalizarCnpj(v);
  return c ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : v;
}

/**
 * The document of a supplier or donor that can be published: a valid CNPJ. A CPF (a person) is
 * never published, even when the official source shows it.
 */
export function documentoPublicavel(doc: string | undefined | null): string | undefined {
  const d = (doc ?? "").replace(/[.\-/\s]/g, "");
  if (/^\d{11}$/.test(d)) return undefined;
  return cnpjValido(d) ? normalizarCnpj(d) : undefined;
}
