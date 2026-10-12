/**
 * The whole electoral life of each person we track: every candidacy found in the TSE files since
 * 1994, for any office (vereador and prefeito included), with the result and the assets declared.
 *
 * Identity: a person is first linked to one recent candidacy (see vincularTSE in build.ts). From
 * there we follow the voter registration number (título eleitoral), which never changes, then a
 * full CPF. Older files without either are matched only by exact birth date and exact name.
 * A key shared by two different people is dropped: we prefer missing a candidacy to attributing
 * someone else's.
 */
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import { baixarArquivo } from "../lib/http";
import { log } from "../lib/log";
import { percorrerCsvZipArquivo } from "../lib/csvzip";
import { isoDate, norm, num } from "../lib/util";
import type { CandidatoTSE } from "../model";

const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";

/** General (federal and state) and municipal elections with public candidate files */
export const ANOS_GERAIS = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026];
export const ANOS_MUNICIPAIS = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
/** Asset declarations are published from 2006 on */
const PRIMEIRO_ANO_BENS = 2006;

/** Prefeito, vice-prefeito and vereador: the place of the candidacy is a municipality */
export const CARGOS_MUNICIPAIS = new Set([11, 12, 13]);

export interface ChavesPessoa {
  pid: string;
  titulos: string[];
  cpfs: string[];
  nascimento?: string;
  nomes: string[];
}

const limpar = (v?: string) => {
  const s = (v ?? "").trim();
  return /^(#NULO#?|#NE#?|-1|-3|-4|NÃO DIVULGÁVEL)$/i.test(s) ? "" : s;
};
/** Voter registration numbers appear with and without leading zeros across years */
export const tituloNorm = (t?: string) => (t ?? "").replace(/\D/g, "").replace(/^0+/, "");
/** Full CPFs only: masked ones ("***.123.456-**") or wrong lengths are not identity keys */
export const cpfNorm = (c?: string) => {
  const d = (c ?? "").replace(/\D/g, "");
  return d.length === 11 && !/^(\d)\1{10}$/.test(d) && !/\*/.test(c ?? "") ? d : "";
};

/** Builds the lookup indexes, dropping keys that point to more than one person. */
export function indicesIdentidade(pessoas: ChavesPessoa[]) {
  const montar = (pares: [string, string][]) => {
    const m = new Map<string, string>();
    const conflito = new Set<string>();
    for (const [k, pid] of pares) {
      if (!k) continue;
      const atual = m.get(k);
      if (atual && atual !== pid) conflito.add(k);
      else m.set(k, pid);
    }
    for (const k of conflito) m.delete(k);
    return m;
  };
  return {
    porTitulo: montar(pessoas.flatMap((p) => p.titulos.map((t) => [tituloNorm(t), p.pid] as [string, string]))),
    porCpf: montar(pessoas.flatMap((p) => p.cpfs.map((c) => [cpfNorm(c), p.pid] as [string, string]))),
    porNascNome: montar(pessoas.flatMap((p) => (p.nascimento ? p.nomes.map((n) => [`${p.nascimento}|${norm(n)}`, p.pid] as [string, string]) : []))),
  };
}

/** Normalizes one row of consulta_cand into a candidacy. */
export function candidaturaDaLinha(r: Record<string, string>, ano: number): CandidatoTSE | undefined {
  const sq = limpar(r.SQ_CANDIDATO);
  const cod = Number(r.CD_CARGO);
  if (!sq || !cod) return undefined;
  const municipal = CARGOS_MUNICIPAIS.has(cod);
  return {
    ano,
    sq,
    cpf: cpfNorm(limpar(r.NR_CPF_CANDIDATO)) || undefined,
    titulo: tituloNorm(limpar(r.NR_TITULO_ELEITORAL_CANDIDATO)) || undefined,
    nome: limpar(r.NM_CANDIDATO),
    nomeUrna: limpar(r.NM_URNA_CANDIDATO) || limpar(r.NM_CANDIDATO),
    nascimento: isoDate(limpar(r.DT_NASCIMENTO)),
    uf: limpar(r.SG_UF) === "BR" ? "BR" : limpar(r.SG_UF),
    municipio: municipal ? limpar(r.NM_UE) || undefined : undefined,
    cargo: limpar(r.DS_CARGO),
    codCargo: cod,
    partido: limpar(r.SG_PARTIDO),
    numero: limpar(r.NR_CANDIDATO),
    turno: Number(r.NR_TURNO) || 1,
    situacao: limpar(r.DS_SIT_TOT_TURNO) || limpar(r.DS_SITUACAO_CANDIDATURA) || limpar(r.DS_DETALHE_SITUACAO_CAND),
    situacaoRegistro: limpar(r.DS_SITUACAO_CANDIDATURA) || limpar(r.DS_DETALHE_SITUACAO_CAND) || undefined,
    ocupacao: limpar(r.DS_OCUPACAO) || undefined,
    instrucao: limpar(r.DS_GRAU_INSTRUCAO) || undefined,
    genero: limpar(r.DS_GENERO) || undefined,
  };
}

/** Which tracked person, if any, a candidacy belongs to. */
export function donoDaCandidatura(c: CandidatoTSE, idx: ReturnType<typeof indicesIdentidade>): string | undefined {
  if (c.titulo && idx.porTitulo.has(c.titulo)) return idx.porTitulo.get(c.titulo);
  if (c.cpf && idx.porCpf.has(c.cpf)) return idx.porCpf.get(c.cpf);
  // Without título or CPF (older files), only an exact birth date and exact name are accepted
  if (!c.titulo && !c.cpf && c.nascimento) return idx.porNascNome.get(`${c.nascimento}|${norm(c.nome)}`);
  return undefined;
}

export async function coletarHistoricoTSE(
  pessoas: ChavesPessoa[],
  anos = [...ANOS_GERAIS, ...ANOS_MUNICIPAIS].sort(),
): Promise<{ porPessoa: Map<string, CandidatoTSE[]>; arquivos: string[]; avisos: string[] }> {
  const idx = indicesIdentidade(pessoas);
  const porPessoa = new Map<string, CandidatoTSE[]>();
  const avisos: string[] = [];
  const arquivos: string[] = [];

  for (const ano of anos) {
    const url = `${CDN}/consulta_cand/consulta_cand_${ano}.zip`;
    const doAno = new Map<string, { pid: string; c: CandidatoTSE }>();
    try {
      const { caminho } = await baixarArquivo(url, { ttlHours: ano >= 2026 ? 24 : 24 * 90 });
      arquivos.push(url);
      // Each archive has one file per state plus a national "_BRASIL" file repeating them
      await percorrerCsvZipArquivo(
        caminho,
        (row) => {
          const c = candidaturaDaLinha(row, ano);
          if (!c) return;
          const pid = donoDaCandidatura(c, idx);
          if (!pid) return;
          const prev = doAno.get(c.sq);
          // Run-offs repeat the candidacy: keep the last round
          if (prev && (prev.c.turno ?? 1) > (c.turno ?? 1)) return;
          doAno.set(c.sq, { pid, c });
        },
        { arquivo: (n) => !/_BRASIL\.(csv|txt)$/i.test(n) },
      );
      await rm(caminho, { force: true });
    } catch (e) {
      avisos.push(`Candidaturas TSE ${ano}: ${(e as Error).message}`);
      continue;
    }

    if (ano >= PRIMEIRO_ANO_BENS && doAno.size) {
      const urlBens = `${CDN}/bem_candidato/bem_candidato_${ano}.zip`;
      try {
        const { caminho } = await baixarArquivo(urlBens, { ttlHours: ano >= 2026 ? 24 : 24 * 90 });
        arquivos.push(urlBens);
        await percorrerCsvZipArquivo(
          caminho,
          (b) => {
            const alvo = doAno.get(limpar(b.SQ_CANDIDATO));
            if (!alvo) return;
            const valor = num(b.VR_BEM_CANDIDATO);
            alvo.c.patrimonio = (alvo.c.patrimonio ?? 0) + valor;
            (alvo.c.bens ??= []).push({ tipo: limpar(b.DS_TIPO_BEM_CANDIDATO), descricao: limpar(b.DS_BEM_CANDIDATO).slice(0, 160), valor });
          },
          { arquivo: (n) => !/_BRASIL\.(csv|txt)$/i.test(n) },
        );
        await rm(caminho, { force: true });
      } catch (e) {
        avisos.push(`Bens TSE ${ano}: ${(e as Error).message}`);
      }
    }

    for (const { pid, c } of doAno.values()) {
      c.bens?.sort((a, b) => b.valor - a.valor);
      porPessoa.set(pid, [...(porPessoa.get(pid) ?? []), c]);
    }
    log.info(`TSE histórico ${ano}: ${doAno.size} candidaturas de pessoas acompanhadas`);
  }
  for (const l of porPessoa.values()) l.sort((a, b) => a.ano - b.ano || a.codCargo - b.codCargo);
  return { porPessoa, arquivos, avisos };
}

// ------------------------------------------------------------ Presidency

/** TSE code of the office of President of the Republic */
export const CARGO_PRESIDENTE = 1;

/**
 * Every candidacy for President since 1994, from the national file ("_BR") of each general
 * election. The archives stay on disk so the full scan right after reuses them.
 */
export async function coletarCandidaturasPresidente(anos = ANOS_GERAIS): Promise<{ candidaturas: CandidatoTSE[]; arquivos: string[]; avisos: string[] }> {
  const candidaturas: CandidatoTSE[] = [];
  const arquivos: string[] = [];
  const avisos: string[] = [];
  for (const ano of anos) {
    const url = `${CDN}/consulta_cand/consulta_cand_${ano}.zip`;
    try {
      const { caminho } = await baixarArquivo(url, { ttlHours: 24 });
      arquivos.push(url);
      const doAno = new Map<string, CandidatoTSE>();
      await percorrerCsvZipArquivo(
        caminho,
        (row) => {
          const c = candidaturaDaLinha(row, ano);
          if (!c || c.codCargo !== CARGO_PRESIDENTE) return;
          const prev = doAno.get(c.sq);
          if (prev && (prev.turno ?? 1) > (c.turno ?? 1)) return;
          doAno.set(c.sq, c);
        },
        { arquivo: (n) => /_BR\.(csv|txt)$/i.test(n) },
      );
      if (!doAno.size) avisos.push(`Presidência ${ano}: nenhuma candidatura no arquivo nacional`);
      candidaturas.push(...doAno.values());
    } catch (e) {
      avisos.push(`Presidência ${ano}: ${(e as Error).message}`);
    }
  }
  log.info(`TSE Presidência: ${candidaturas.length} candidaturas desde ${anos[0]}`);
  return { candidaturas, arquivos, avisos };
}

/**
 * Groups presidential candidacies into people. Someone already followed by the site (a member of
 * Congress or of an assembly) keeps that profile; everyone else gets a stable "pres-" id derived
 * from the título (or CPF, or birth date and name), never exposing the number itself.
 */
export function agruparPresidenciaveis(candidaturas: CandidatoTSE[], acompanhadas: ChavesPessoa[]): { novas: ChavesPessoa[]; donoPorCandidatura: Map<string, string> } {
  const idx = indicesIdentidade(acompanhadas);
  const chaveDe = (c: CandidatoTSE) => (c.titulo ? `t:${c.titulo}` : c.cpf ? `c:${c.cpf}` : c.nascimento ? `n:${c.nascimento}|${norm(c.nome)}` : `s:${c.ano}:${c.sq}`);
  // Different years of the same person may carry different keys: join them through any shared one
  const pai = new Map<string, string>();
  const achar = (k: string): string => {
    const p = pai.get(k) ?? k;
    if (p === k) return k;
    const r = achar(p);
    pai.set(k, r);
    return r;
  };
  const unir = (a: string, b: string) => {
    const ra = achar(a);
    const rb = achar(b);
    if (ra !== rb) pai.set(rb, ra);
  };
  const chaves = (c: CandidatoTSE) => [c.titulo && `t:${c.titulo}`, c.cpf && `c:${c.cpf}`, c.nascimento && `n:${c.nascimento}|${norm(c.nome)}`].filter((k): k is string => !!k);
  for (const c of candidaturas) {
    const ks = chaves(c);
    for (const k of ks.slice(1)) unir(ks[0], k);
  }

  const grupos = new Map<string, CandidatoTSE[]>();
  for (const c of candidaturas) {
    const raiz = achar(chaves(c)[0] ?? chaveDe(c));
    grupos.set(raiz, [...(grupos.get(raiz) ?? []), c]);
  }

  const novas: ChavesPessoa[] = [];
  const donoPorCandidatura = new Map<string, string>();
  for (const [raiz, cs] of grupos) {
    const existente = cs.map((c) => donoDaCandidatura(c, idx)).find(Boolean);
    const pid = existente ?? `pres-${createHash("sha256").update(raiz).digest("hex").slice(0, 12)}`;
    if (!existente)
      novas.push({
        pid,
        titulos: [...new Set(cs.map((c) => c.titulo).filter((x): x is string => !!x))],
        cpfs: [...new Set(cs.map((c) => c.cpf).filter((x): x is string => !!x))],
        nascimento: cs.find((c) => c.nascimento)?.nascimento,
        nomes: [...new Set(cs.map((c) => c.nome))],
      });
    for (const c of cs) donoPorCandidatura.set(`${c.ano}:${c.sq}`, pid);
  }
  return { novas, donoPorCandidatura };
}
