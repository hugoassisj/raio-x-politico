import { documentoPublicavel } from "./cnpj";

/**
 * Identity of a place that receives amendments: the CNPJ of the receiving government when
 * published (two spellings of the same city become one), otherwise the plain name and state.
 * Shared by the pipeline (index) and the pages (links).
 */
export function chaveDestino(d: { nome: string; uf?: string; cnpj?: string }): string {
  const cnpj = documentoPublicavel(d.cnpj);
  if (cnpj) return cnpj;
  const nome = d.nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${nome}|${d.uf ?? ""}`;
}
