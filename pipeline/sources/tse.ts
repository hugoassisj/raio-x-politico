import { fetchRaw, getJson } from "../lib/http";
import { log } from "../lib/log";
import { decode, isoDate, num, parseCsv, unzipFirst, UFS } from "../lib/util";
import type { CandidatoTSE } from "../model";

const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
/** Cargos we track: 1 presidente, 3 governador, 5 senador, 6 dep. federal, 7 dep. estadual, 8 dep. distrital */
const CARGOS = new Set([1, 3, 5, 6, 7, 8]);
/** DivulgaCandContas election ids (ordinary general elections) */
export const ELEICAO_DIVULGA: Record<number, string> = { 2018: "2022802018", 2022: "2040602022", 2026: "2045202026" };

export interface TseOutput {
  candidatos: CandidatoTSE[];
  redes: Map<string, string[]>; // key `${ano}:${sq}`
  avisos: string[];
}

async function lerZipCsv(url: string, prefer: RegExp): Promise<Record<string, string>[]> {
  const r = await fetchRaw(url, { ttlHours: 24 * 7, timeoutMs: 600_000, retries: 3 });
  const files = unzipFirst(r.body, /\.(csv|txt)$/i);
  if (!files.length) throw new Error(`zip vazio: ${url}`);
  const br = files.filter((f) => prefer.test(f.name));
  const use = br.length ? br : files;
  const rows: Record<string, string>[] = [];
  for (const f of use) rows.push(...parseCsv(decode(f.data, "latin1")));
  return rows;
}

const clean = (v?: string) => {
  const s = (v ?? "").trim();
  return s === "#NULO#" || s === "#NE#" || s === "-1" || s === "-3" || s === "-4" ? "" : s;
};

export async function coletarTSE(anos: number[]): Promise<TseOutput> {
  const out: TseOutput = { candidatos: [], redes: new Map(), avisos: [] };

  for (const ano of anos) {
    try {
      const rows = await lerZipCsv(`${CDN}/consulta_cand/consulta_cand_${ano}.zip`, /BRASIL/i);
      const porSq = new Map<string, CandidatoTSE>();
      for (const r of rows) {
        const cod = Number(r.CD_CARGO);
        if (!CARGOS.has(cod)) continue;
        const sq = clean(r.SQ_CANDIDATO);
        if (!sq) continue;
        // Keep the last round row for candidates in run-offs (same SQ)
        const prev = porSq.get(sq);
        if (prev && Number(r.NR_TURNO) < 2) continue;
        porSq.set(sq, {
          ano,
          sq,
          cpf: clean(r.NR_CPF_CANDIDATO) || undefined,
          titulo: clean(r.NR_TITULO_ELEITORAL_CANDIDATO) || undefined,
          nome: clean(r.NM_CANDIDATO),
          nomeUrna: clean(r.NM_URNA_CANDIDATO) || clean(r.NM_CANDIDATO),
          nascimento: isoDate(clean(r.DT_NASCIMENTO)),
          uf: clean(r.SG_UF) === "BR" ? clean(r.SG_UE) || "BR" : clean(r.SG_UF),
          cargo: clean(r.DS_CARGO),
          codCargo: cod,
          partido: clean(r.SG_PARTIDO),
          numero: clean(r.NR_CANDIDATO),
          situacao: clean(r.DS_SIT_TOT_TURNO) || clean(r.DS_SITUACAO_CANDIDATURA) || clean(r.DS_DETALHE_SITUACAO_CAND),
          ocupacao: clean(r.DS_OCUPACAO) || undefined,
          instrucao: clean(r.DS_GRAU_INSTRUCAO) || undefined,
          genero: clean(r.DS_GENERO) || undefined,
        });
      }
      const cands = [...porSq.values()];
      log.info(`TSE ${ano}: ${cands.length} candidaturas (cargos legislativos e executivos estaduais/federal)`);

      // Declared assets
      try {
        const bens = await lerZipCsv(`${CDN}/bem_candidato/bem_candidato_${ano}.zip`, /BRASIL/i);
        for (const b of bens) {
          const c = porSq.get(clean(b.SQ_CANDIDATO));
          if (!c) continue;
          const valor = num(b.VR_BEM_CANDIDATO);
          c.patrimonio = (c.patrimonio ?? 0) + valor;
          (c.bens ??= []).push({ tipo: clean(b.DS_TIPO_BEM_CANDIDATO), descricao: clean(b.DS_BEM_CANDIDATO).slice(0, 160), valor });
        }
        for (const c of cands) c.bens?.sort((a, b) => b.valor - a.valor);
      } catch (e) {
        out.avisos.push(`Bens TSE ${ano}: ${(e as Error).message}`);
      }

      // Social media links declared by the candidate
      try {
        const redes = await lerZipCsv(`${CDN}/rede_social_candidato/rede_social_candidato_${ano}.zip`, /BRASIL/i);
        for (const r of redes) {
          const sq = clean(r.SQ_CANDIDATO);
          if (!porSq.has(sq)) continue;
          const url = clean(r.DS_URL);
          if (!url) continue;
          const k = `${ano}:${sq}`;
          const l = out.redes.get(k) ?? [];
          if (!l.includes(url)) l.push(url);
          out.redes.set(k, l);
        }
      } catch (e) {
        out.avisos.push(`Redes sociais TSE ${ano}: ${(e as Error).message}`);
      }

      if (ano === 2022) await votos2022(porSq, out.avisos);
      out.candidatos.push(...cands);
    } catch (e) {
      out.avisos.push(`Candidatos TSE ${ano}: ${(e as Error).message}`);
    }
  }
  return out;
}

/** Votes per candidate from the official results JSON (first round, election 546). */
async function votos2022(porSq: Map<string, CandidatoTSE>, avisos: string[]) {
  let ok = 0;
  for (const uf of UFS) {
    const ufl = uf.toLowerCase();
    const cargos = uf === "DF" ? ["0005", "0006", "0008"] : ["0005", "0006", "0007"];
    for (const c of cargos) {
      try {
        const j: any = await getJson(`https://resultados.tse.jus.br/oficial/ele2022/546/dados-simplificados/${ufl}/${ufl}-c${c}-e000546-r.json`, {
          ttlHours: 24 * 30,
          retries: 2,
        });
        for (const x of j?.cand ?? []) {
          const cand = porSq.get(String(x.sqcand));
          if (cand) {
            cand.votos = num(x.vap);
            ok++;
          }
        }
      } catch (e) {
        if (ok === 0 && uf === "AC") avisos.push(`Votos 2022 (${uf}/${c}): ${(e as Error).message}`);
      }
    }
  }
  log.info(`TSE 2022: votos de ${ok} candidatos`);
}

export function fotoTSE(ano: number, sq: string, uf: string) {
  const el = ELEICAO_DIVULGA[ano];
  return el ? `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${el}/${sq}/${uf}` : undefined;
}

export function eleito(situacao?: string) {
  return /^eleito|eleito por/i.test(situacao ?? "");
}
