import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { normalizarCnpj } from "./cnpj";
import { REPO_URL } from "./site";
import type {
  DestinoEmenda,
  EmpresaDetalhe,
  EmpresaResumo,
  Presidencia,
  Agregado,
  ExplicacaoIA,
  Fala,
  FalasArquivo,
  GastosGerais,
  IAArquivo,
  MateriaVotada,
  Meta,
  PoliticoDetalhe,
  PoliticoResumo,
  VotacaoDetalhe,
  VotacaoResumo,
} from "./types";

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

export const getMaterias = cache(async () => new Map(((await ler<MateriaVotada[]>("materias.json")) ?? []).map((m) => [m.id, m])));
export const getExplicacoes = cache(async () => new Map(Object.entries((await ler<Record<string, ExplicacaoIA>>("explicacoes.json")) ?? {})));
export const getGastosGerais = cache(() => ler<GastosGerais>("gastos.json"));
export const getPresidencia = cache(() => ler<Presidencia>("presidencia.json"));
export const getDestinosEmendas = cache(async () => (await ler<DestinoEmenda[]>("emendas.json")) ?? []);
export const getEmpresas = cache(async () => (await ler<EmpresaResumo[]>("empresas.json")) ?? []);
/** One company by CNPJ, read from its group file (see pipeline/empresas.ts) */
export const getEmpresa = cache(async (cnpj: string) => {
  const c = normalizarCnpj(cnpj);
  if (!c) return undefined;
  return (await ler<Record<string, EmpresaDetalhe>>(`empresas/${c.slice(0, 2)}.json`))?.[c];
});
export const getPolitico = cache((id: string) => (seguro(id) ? ler<PoliticoDetalhe>(`politicos/${id}.json`) : Promise.resolve(undefined)));
export const getVotacao = cache((id: string) => (seguro(id) ? ler<VotacaoDetalhe>(`votacoes/${id}.json`) : Promise.resolve(undefined)));
export const getFalas = cache(async (id: string) => (seguro(id) ? ((await ler<FalasArquivo>(`falas/${id}.json`))?.falas ?? []) : []));
export const getIA = cache(async (id: string) => (seguro(id) ? ((await ler<IAArquivo>(`ia/${id}.json`))?.resumos ?? []) : []));

/** Public URL of a raw snapshot file in the repository, for "see the raw data" links. */
export function urlDadoBruto(rel: string) {
  const repo = REPO_URL;
  return `${repo}/blob/main/data/${rel}`;
}
