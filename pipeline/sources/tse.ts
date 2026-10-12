import { Unzip, UnzipInflate } from "fflate";
import { fetchRaw } from "../lib/http";
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

      // Social media links declared by the candidate. 2022 is published per state, 2026 nationally,
      // and 2018 has no such dataset.
      const arquivosRedes = ano === 2022 ? [...UFS, "BR"].map((uf) => `rede_social_candidato_${ano}_${uf}.zip`) : ano >= 2026 ? [`rede_social_candidato_${ano}.zip`] : [];
      let falhasRedes = 0;
      for (const arq of arquivosRedes) {
        try {
          for (const r of await lerZipCsv(`${CDN}/consulta_cand/${arq}`, /./)) {
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
          if (++falhasRedes === 1) out.avisos.push(`Redes sociais TSE ${ano} (${arq}): ${(e as Error).message}`);
        }
      }

      if (ano === 2022) await votos2022(porSq, out.avisos);
      out.candidatos.push(...cands);
    } catch (e) {
      out.avisos.push(`Candidatos TSE ${ano}: ${(e as Error).message}`);
    }
  }
  return out;
}

/**
 * Votes per candidate in the 2022 first round, summed over every municipality and zone from the
 * official bulk results file (the interactive results JSON is taken offline after each election).
 */
async function votos2022(porSq: Map<string, CandidatoTSE>, avisos: string[]) {
  try {
    const r = await fetchRaw(`${CDN}/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip`, { ttlHours: 24 * 90, timeoutMs: 900_000, retries: 2 });
    const totais = somarVotosZip(r.body);
    let ok = 0;
    for (const [sq, v] of totais) {
      const c = porSq.get(sq);
      if (c) {
        c.votos = v;
        ok++;
      }
    }
    log.info(`TSE 2022: votos de ${ok} candidatos`);
  } catch (e) {
    avisos.push(`Votos 2022: ${(e as Error).message}`);
  }
}

/** Sums QT_VOTOS_NOMINAIS by SQ_CANDIDATO for the first round of the offices we track, one CSV line at a time. */
class SomadorVotos {
  readonly totais = new Map<string, number>();
  private col?: { sq: number; votos: number; turno: number; cargo: number };

  /** A new file starts with its own header line. */
  novoArquivo() {
    this.col = undefined;
  }

  linha(l: string) {
    if (!l) return;
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, ""));
    if (!this.col) {
      this.col = { sq: c.indexOf("SQ_CANDIDATO"), votos: c.indexOf("QT_VOTOS_NOMINAIS"), turno: c.indexOf("NR_TURNO"), cargo: c.indexOf("CD_CARGO") };
      return;
    }
    const { sq, votos, turno, cargo } = this.col;
    if (sq < 0 || votos < 0) return;
    if (turno >= 0 && c[turno] !== "1") return;
    if (cargo >= 0 && !CARGOS.has(Number(c[cargo]))) return;
    this.totais.set(c[sq], (this.totais.get(c[sq]) ?? 0) + (Number(c[votos]) || 0));
  }
}

/** Already decoded CSV texts (small inputs and tests). */
export function somarVotos(csvs: string[]): Map<string, number> {
  const s = new SomadorVotos();
  for (const t of csvs) {
    s.novoArquivo();
    for (const l of t.split(/\r?\n/)) s.linha(l);
  }
  return s.totais;
}

/**
 * Streams the official ZIP: each CSV is inflated and decoded in chunks, so files larger than the
 * maximum JavaScript string length (the 2022 one is) are handled without building one huge string.
 */
export function somarVotosZip(zip: Uint8Array): Map<string, number> {
  const s = new SomadorVotos();
  const uz = new Unzip();
  uz.register(UnzipInflate);
  uz.onfile = (f) => {
    if (!/\.csv$/i.test(f.name)) return;
    const dec = new TextDecoder("latin1");
    let resto = "";
    s.novoArquivo();
    f.ondata = (err, chunk, final) => {
      if (err) throw err;
      const linhas = (resto + dec.decode(chunk, { stream: !final })).split(/\r?\n/);
      resto = final ? "" : (linhas.pop() ?? "");
      for (const l of linhas) s.linha(l);
    };
    f.start();
  };
  // Feed the archive in slices: pushed whole, the decompressor would emit each file as one chunk.
  const FATIA = 1 << 16;
  for (let i = 0; i < zip.length; i += FATIA) uz.push(zip.subarray(i, i + FATIA), i + FATIA >= zip.length);
  return s.totais;
}

export function fotoTSE(ano: number, sq: string, uf: string) {
  const el = ELEICAO_DIVULGA[ano];
  return el ? `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${el}/${sq}/${uf}` : undefined;
}

export function eleito(situacao?: string) {
  return /^eleito|eleito por/i.test(situacao ?? "");
}
