import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Agregado, Fala, FalasArquivo, GastosGerais, IAArquivo, Meta, PoliticoDetalhe, PoliticoResumo, VotacaoDetalhe, VotacaoResumo } from "./types";

/**
 * Read-only access to the published snapshot (./data, or DATA_DIR).
 * Pages are statically generated from these files; a missing file is an empty state, never a crash.
 */
const DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATA_DIR ?? "data");

async function ler<T>(rel: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(DIR, rel), "utf8")) as T;
  } catch {
    return undefined;
  }
}

const seguro = (id: string) => /^[\w-]+$/.test(id);

export const getMeta = cache(() => ler<Meta>("meta.json"));
export const getPoliticos = cache(async () => (await ler<PoliticoResumo[]>("politicos.json")) ?? []);
export const getVotacoes = cache(async () => (await ler<VotacaoResumo[]>("votacoes.json")) ?? []);
export const getFalasRecentes = cache(async () => (await ler<Fala[]>("falas-recentes.json")) ?? []);
export const getAgregados = cache(
  async () => (await ler<{ porCasa: Agregado[]; porPartido: Agregado[]; porUf: Agregado[] }>("agregados.json")) ?? { porCasa: [], porPartido: [], porUf: [] },
);

export const getGastosGerais = cache(() => ler<GastosGerais>("gastos.json"));
export const getPolitico = cache((id: string) => (seguro(id) ? ler<PoliticoDetalhe>(`politicos/${id}.json`) : Promise.resolve(undefined)));
export const getVotacao = cache((id: string) => (seguro(id) ? ler<VotacaoDetalhe>(`votacoes/${id}.json`) : Promise.resolve(undefined)));
export const getFalas = cache(async (id: string) => (seguro(id) ? ((await ler<FalasArquivo>(`falas/${id}.json`))?.falas ?? []) : []));
export const getIA = cache(async (id: string) => (seguro(id) ? ((await ler<IAArquivo>(`ia/${id}.json`))?.resumos ?? []) : []));

/** Public URL of a raw snapshot file in the repository, for "see the raw data" links. */
export function urlDadoBruto(rel: string) {
  const repo = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/hugoassisj/raio-x-politico";
  return `${repo}/blob/main/data/${rel}`;
}
