import { documentoPublicavel } from "../src/lib/cnpj";
import type { Alerta, Gastos, Metricas, VotacaoDetalhe, VotoItem } from "../src/lib/types";
import type { Despesa, PoliticoParcial, Sessao } from "./model";
import { groupBy, mean, median, quantile, round, validDoc } from "./lib/util";
import { orientacaoDoPartido } from "../src/lib/orientacao";

export { orientacaoDoPartido };

// ---------------------------------------------------------------- votes

const VOTO_POSICIONAL = /^(sim|n[aã]o|absten[cç][aã]o|obstru[cç][aã]o)$/i;
const canon = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Recorded for each participant of a secret ballot, where the individual vote is not published. */
export const VOTO_SECRETO = "Participou (voto secreto)";

/** Official totals written in the vote description, e.g. "Sim: 404; Não: 61; Abstenção: 1". */
export function totaisDoTexto(texto: string): { sim: number; nao: number; outros: number } | undefined {
  const n = (re: RegExp) => Number(texto.match(re)?.[1] ?? NaN);
  const sim = n(/\bsim:\s*(\d+)/i);
  const nao = n(/\bn[ãa]o:\s*(\d+)/i);
  if (!Number.isFinite(sim) || !Number.isFinite(nao)) return undefined;
  const abst = n(/absten[çc][ãa]o:\s*(\d+)/i);
  const obst = n(/obstru[çc][ãa]o:\s*(\d+)/i);
  return { sim, nao, outros: (Number.isFinite(abst) ? abst : 0) + (Number.isFinite(obst) ? obst : 0) };
}

export function enriquecerVotacoes(vs: VotacaoDetalhe[]) {
  for (const v of vs) {
    if (v.votos.length) {
      let sim = 0;
      let nao = 0;
      let outros = 0;
      const pp = new Map<string, { partido: string; sim: number; nao: number; outros: number }>();
      for (const x of v.votos) {
        const c = canon(x.voto);
        const g = pp.get(x.partido) ?? { partido: x.partido, sim: 0, nao: 0, outros: 0 };
        if (c === "sim") {
          sim++;
          g.sim++;
        } else if (c === "nao") {
          nao++;
          g.nao++;
        } else {
          outros++;
          g.outros++;
        }
        pp.set(x.partido, g);
      }
      const oficial = totaisDoTexto(v.descricao);
      if (!sim && !nao && oficial) {
        // Secret ballot: the house lists who took part but publishes only the totals.
        Object.assign(v, oficial, { secreta: true });
        for (const x of v.votos) x.voto = VOTO_SECRETO;
        v.porPartido = [];
        continue;
      } else if (v.casa === "camara" || !v.sim) Object.assign(v, { sim, nao, outros });
      v.porPartido = [...pp.values()].sort((a, b) => b.sim + b.nao + b.outros - (a.sim + a.nao + a.outros));
    }
  }
}

/** Party majority position in a vote (used where no official orientation exists). */
function maioriaPorPartido(v: VotacaoDetalhe) {
  const m = new Map<string, string>();
  for (const g of v.porPartido) {
    const tot = g.sim + g.nao;
    if (tot < 2) continue;
    if (g.sim / tot > 0.5) m.set(g.partido, "Sim");
    else if (g.nao / tot > 0.5) m.set(g.partido, "Não");
  }
  return m;
}

/** Whether someone was in office on a date: uses status-history periods when known. */
export function emExercicioEm(p: PoliticoParcial, data: string) {
  if (p.exercicio?.length) return p.exercicio.some((e) => e.ini <= data && (!e.fim || data < e.fim));
  return !p.inicioExercicioAtual || p.inicioExercicioAtual <= data;
}

export interface ResultadoVotos {
  votos: Map<string, VotoItem[]>;
  metricas: Map<string, Pick<Metricas, "participacao" | "votacoesBase" | "fidelidade" | "fidelidadeMetodo" | "governismo">>;
}

export function calcularVotos(vs: VotacaoDetalhe[], pols: PoliticoParcial[], presenteRe: RegExp): ResultadoVotos {
  const byId = new Map(pols.map((p) => [p.id, p]));
  const votos = new Map<string, VotoItem[]>();
  const acc = new Map<string, { eleg: number; votou: number; seg: number; naoSeg: number; gov: number; naoGov: number; metodo: "orientacao" | "maioria" }>();
  const sorted = [...vs].sort((a, b) => b.data.localeCompare(a.data));

  for (const v of sorted) {
    if (!v.votos.length) continue;
    const maioria = maioriaPorPartido(v);
    const votosPorPid = new Map(v.votos.map((x) => [x.pid, x]));
    const elegiveis = v.casa === "camara" ? pols.filter((p) => p.casa === "camara" && emExercicioEm(p, v.data)) : pols.filter((p) => p.casa === "senado" && votosPorPid.has(p.id));

    for (const p of elegiveis) {
      const a = acc.get(p.id) ?? { eleg: 0, votou: 0, seg: 0, naoSeg: 0, gov: 0, naoGov: 0, metodo: "orientacao" as const };
      a.eleg++;
      const x = votosPorPid.get(p.id);
      // No record in the official list: kept empty, shown as "sem voto registrado", never as a choice
      const voto = x?.voto ?? "";
      const presente = !!x && (v.casa === "camara" || presenteRe.test(voto));
      if (presente) a.votou++;

      const partido = x?.partido ?? byId.get(p.id)?.partido ?? "";
      let oriP = v.orientacoes.length ? orientacaoDoPartido(v.orientacoes, partido) : undefined;
      if (!oriP && !v.orientacoes.length) {
        oriP = maioria.get(partido);
        if (oriP) a.metodo = "maioria";
      }
      const oriG = v.orientacaoGoverno;
      if (VOTO_POSICIONAL.test(voto)) {
        if (oriP && VOTO_POSICIONAL.test(oriP)) {
          if (canon(oriP) === canon(voto)) a.seg++;
          else a.naoSeg++;
        }
        if (oriG && VOTO_POSICIONAL.test(oriG)) {
          if (canon(oriG) === canon(voto)) a.gov++;
          else a.naoGov++;
        }
      }
      acc.set(p.id, a);

      const l = votos.get(p.id) ?? [];
      l.push({
        votacaoId: v.id,
        data: v.data,
        titulo: v.titulo,
        descricao: v.descricao?.slice(0, 280),
        voto,
        orientacaoPartido: oriP,
        orientacaoGoverno: oriG,
        resultado: v.resultado,
        objeto: v.objeto,
      });
      votos.set(p.id, l);
    }
  }

  const metricas: ResultadoVotos["metricas"] = new Map();
  for (const [pid, a] of acc) {
    const fb = a.seg + a.naoSeg;
    const gb = a.gov + a.naoGov;
    metricas.set(pid, {
      participacao: a.eleg ? round(a.votou / a.eleg) : undefined,
      votacoesBase: a.eleg,
      // Parlametria rule: at least 10 comparable votes
      fidelidade: fb >= 10 ? round(a.seg / fb) : undefined,
      fidelidadeMetodo: fb >= 10 ? a.metodo : undefined,
      governismo: gb >= 10 ? round(a.gov / gb) : undefined,
    });
  }
  return { votos, metricas };
}

// ---------------------------------------------------------------- presence

export function calcularPresenca(sessoes: Sessao[], pols: PoliticoParcial[]) {
  const out = new Map<string, { sessoes: number; presente: number; justificadas: number; ini: string; fim: string }>();
  const daCasa = (s: Sessao, casa: PoliticoParcial["casa"]) => (casa === "senado") === s.id.startsWith("sen-");
  for (const p of pols) {
    if (p.casa === "assembleia") continue; // no attendance feed for state assemblies yet
    const rel = sessoes.filter((s) => daCasa(s, p.casa) && emExercicioEm(p, s.data));
    if (!rel.length) continue;
    let presente = 0;
    let justificadas = 0;
    for (const s of rel) {
      if (s.presentes.includes(p.id)) presente++;
      else if (s.justificadas?.includes(p.id)) justificadas++;
    }
    const datas = rel.map((s) => s.data).sort();
    out.set(p.id, { sessoes: rel.length, presente, justificadas, ini: datas[0], fim: datas[datas.length - 1] });
  }
  return out;
}

// ---------------------------------------------------------------- expenses

/**
 * Last month with complete data. Reimbursements are filed with a delay, so the newest months can be
 * partial: up to the two most recent months are dropped while their national total is below 80% of
 * the median of the previous 12. Only the tail is trimmed, because spending also drops for legitimate
 * reasons (recess, the electoral period) and those months must stay in the window.
 */
/**
 * Houses use placeholder codes for internal services (e.g. "00000000000001" for official phones).
 * Only real-looking CPF/CNPJ numbers are checked.
 */
export function documentoVerificavel(doc: string | undefined) {
  const d = (doc ?? "").replace(/\D/g, "");
  return (d.length === 11 || d.length === 14) && Number(d) >= 1_000_000;
}

export function ultimoMesCompleto(desp: Despesa[], hoje: Date): string | undefined {
  const tot = new Map<string, number>();
  for (const d of desp) {
    const k = `${d.ano}-${String(d.mes).padStart(2, "0")}`;
    tot.set(k, (tot.get(k) ?? 0) + d.valor);
  }
  const meses = [...tot.keys()].filter((k) => k <= hoje.toISOString().slice(0, 7)).sort();
  let i = meses.length - 1;
  for (let cortes = 0; cortes < 2 && i > 0; cortes++) {
    const med = median(meses.slice(Math.max(0, i - 12), i).map((k) => tot.get(k)!));
    if (med == null || tot.get(meses[i])! >= 0.8 * med) break;
    i--;
  }
  return meses[i];
}

export function janela12(fimMes: string): string[] {
  const [y, m] = fimMes.split("-").map(Number);
  const out: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export function calcularGastos(desp: Despesa[], hoje: Date): Map<string, Gastos & { gastoAno: number }> {
  const out = new Map<string, Gastos & { gastoAno: number }>();
  if (!desp.length) return out;
  const fim = ultimoMesCompleto(desp, hoje)!;
  const meses = new Set(janela12(fim));
  const anoAtual = hoje.getUTCFullYear();
  const mesKey = (d: Despesa) => `${d.ano}-${String(d.mes).padStart(2, "0")}`;

  // thresholds for anomaly rules, per category over everyone in the same house
  const porCat = groupBy(desp, (d) => d.categoria);
  const limiarCat = new Map<string, number>();
  for (const [cat, ds] of porCat) {
    if (ds.length < 1000) continue;
    const q = quantile(
      ds.map((d) => d.valor),
      0.999,
    );
    if (q) limiarCat.set(cat, q);
  }
  const refeicoes = desp.filter((d) => /aliment|refei/i.test(d.categoria)).map((d) => d.valor);
  const mu = mean(refeicoes) ?? 0;
  const sd = Math.sqrt(mean(refeicoes.map((x) => (x - mu) ** 2)) ?? 0);
  const limiarRefeicao = mu + 4 * sd;

  for (const [pid, ds] of groupBy(desp, (d) => d.pid)) {
    const j = ds.filter((d) => meses.has(mesKey(d)));
    const total12m = j.reduce((s, d) => s + d.valor, 0);
    const porMesM = new Map<string, number>();
    for (const m of meses) porMesM.set(m, 0);
    for (const d of j) porMesM.set(mesKey(d), porMesM.get(mesKey(d))! + d.valor);
    const cat = new Map<string, number>();
    for (const d of j) cat.set(d.categoria, (cat.get(d.categoria) ?? 0) + d.valor);
    const forn = new Map<string, { nome: string; doc?: string; valor: number; n: number }>();
    for (const d of j) {
      const k = d.doc || d.fornecedor;
      // Only a valid CNPJ is published; a person's CPF never is
      const f = forn.get(k) ?? { nome: d.fornecedor, doc: documentoPublicavel(d.doc), valor: 0, n: 0 };
      f.valor += d.valor;
      f.n++;
      forn.set(k, f);
    }

    const alertas: Alerta[] = [];
    const vistos = new Map<string, Despesa>();
    for (const d of ds) {
      if (documentoVerificavel(d.doc) && validDoc(d.doc) === false)
        alertas.push({
          regra: "documento_invalido",
          descricao:
            (d.doc ?? "").replace(/\D/g, "").length === 14 ? `CNPJ do fornecedor com dígito verificador inválido (${d.doc})` : "CPF do fornecedor com dígito verificador inválido",
          valor: d.valor,
          data: d.data,
          fornecedor: d.fornecedor,
          url: d.url,
        });
      if (/aliment|refei/i.test(d.categoria) && limiarRefeicao > 0 && d.valor > limiarRefeicao)
        alertas.push({
          regra: "refeicao_atipica",
          descricao: `Refeição de valor muito acima do padrão da casa (limite estatístico R$ ${limiarRefeicao.toFixed(2)})`,
          valor: d.valor,
          data: d.data,
          fornecedor: d.fornecedor,
          url: d.url,
        });
      const lc = limiarCat.get(d.categoria);
      if (lc && d.valor > lc && !/aliment|refei/i.test(d.categoria))
        alertas.push({
          regra: "valor_atipico",
          descricao: `Valor entre os 0,1% maiores da categoria "${d.categoria}"`,
          valor: d.valor,
          data: d.data,
          fornecedor: d.fornecedor,
          url: d.url,
        });
      // A true duplicate is the same receipt reimbursed twice: supplier, receipt number, value and
      // issue date all identical. Placeholder numbers ("NF", "s/n", "001") and recurring bills that
      // reuse a contract number in different months are not duplicates.
      const numero = (d.numeroDoc ?? "").replace(/\D/g, "").replace(/^0+/, "");
      if (d.doc && d.data && numero.length >= 4) {
        const k = `${d.doc}|${numero}|${d.valor.toFixed(2)}|${d.data}`;
        const prev = vistos.get(k);
        if (prev && prev.docId !== d.docId)
          alertas.push({
            regra: "duplicidade",
            descricao: `Mesmo documento fiscal (nº ${d.numeroDoc}, emitido em ${d.data}) reembolsado mais de uma vez`,
            valor: d.valor,
            data: d.data,
            fornecedor: d.fornecedor,
            url: d.url,
          });
        vistos.set(k, d);
      }
    }
    const top = [...forn.values()].sort((a, b) => b.valor - a.valor);
    if (top[0] && total12m > 20000 && top[0].valor / total12m >= 0.5)
      alertas.push({
        regra: "fornecedor_concentrado",
        descricao: `${Math.round((top[0].valor / total12m) * 100)}% dos gastos dos últimos 12 meses foram para um único fornecedor`,
        valor: top[0].valor,
        fornecedor: top[0].nome,
      });

    out.set(pid, {
      total12m: round(total12m, 2)!,
      gastoAno: round(
        ds.filter((d) => d.ano === anoAtual).reduce((s, d) => s + d.valor, 0),
        2,
      )!,
      porMes: [...porMesM.entries()].map(([mes, valor]) => ({ mes, valor: round(valor, 2)! })),
      porCategoria: [...cat.entries()].map(([categoria, valor]) => ({ categoria, valor: round(valor, 2)! })).sort((a, b) => b.valor - a.valor),
      topFornecedores: top.slice(0, 10).map((f) => ({ ...f, valor: round(f.valor, 2)! })),
      alertas: alertas.sort((a, b) => b.valor - a.valor).slice(0, 60),
      recentes: [...ds]
        .sort((a, b) => (b.data ?? mesKey(b)).localeCompare(a.data ?? mesKey(a)))
        .slice(0, 40)
        .map((d) => ({ data: d.data, categoria: d.categoria, fornecedor: d.fornecedor, valor: d.valor, url: d.url })),
    });
  }
  return out;
}
