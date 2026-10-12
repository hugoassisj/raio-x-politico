import { getJson, getJsonWithHeaders } from "../lib/http";
import { log } from "../lib/log";
import { norm, num } from "../lib/util";
import type { EmendaAgg } from "../model";

const TG = "https://api.transferegov.gestao.gov.br/transferenciasespeciais";
const PT = "https://api.portaldatransparencia.gov.br/api-de-dados";

/** Money at each step of an amendment: indicated, reserved (empenho) and paid (bank order issued). */
export interface Ciclo {
  indicado: number;
  empenhado: number;
  pago: number;
}

const zero = (): Ciclo => ({ indicado: 0, empenhado: 0, pago: 0 });
const somar = (a: Ciclo, b: Partial<Ciclo>) => {
  a.indicado += b.indicado ?? 0;
  a.empenhado += b.empenhado ?? 0;
  a.pago += b.pago ?? 0;
};

function add(
  m: Map<string, EmendaAgg>,
  nome: string,
  codigo: string | undefined,
  ano: number,
  ciclo: Partial<Ciclo>,
  destino: string,
  uf: string | undefined,
  fonte: string,
  cnpj?: string,
) {
  const valor = ciclo.indicado ?? 0;
  if (!nome || !(valor || ciclo.empenhado || ciclo.pago)) return;
  const k = norm(nome);
  let a = m.get(k);
  if (!a) m.set(k, (a = { nome, codigo, total: 0, porAno: new Map(), destinos: new Map(), fonte, ciclo: zero() }));
  a.total += valor;
  somar(a.ciclo!, ciclo);
  a.porAno.set(ano, (a.porAno.get(ano) ?? 0) + valor);
  const dk = `${norm(destino)}|${uf ?? ""}`;
  const d = a.destinos.get(dk) ?? { nome: destino, uf, cnpj, valor: 0, empenhado: 0, pago: 0 };
  d.valor += valor;
  d.empenhado = (d.empenhado ?? 0) + (ciclo.empenhado ?? 0);
  d.pago = (d.pago ?? 0) + (ciclo.pago ?? 0);
  d.cnpj ??= cnpj;
  a.destinos.set(dk, d);
}

/** Reads a whole PostgREST table page by page (Transferegov answers at most 1000 rows per call). */
async function tabela(nome: string, cols: string[], filtro: string, ordem: string): Promise<any[]> {
  const out: any[] = [];
  const page = 1000;
  for (let offset = 0; offset <= 1_000_000; offset += page) {
    const rows: any[] =
      (await getJson(`${TG}/${nome}?select=${cols.join(",")}&${filtro}&order=${ordem}.asc&limit=${page}&offset=${offset}`, { ttlHours: 20, timeoutMs: 120_000 })) ?? [];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

const cancelado = (s?: string) => /cancel|estorn|anulad/i.test(s ?? "");

/**
 * How much of each action plan was reserved and paid. The chain is plan -> empenho (reserve) ->
 * documento hábil (payment document) -> ordem bancária (money sent). Cancelled or reversed steps
 * are left out. A plan counts as paid only up to the documents whose bank order was issued.
 */
export function cicloPorPlano(empenhos: any[], documentos: any[], ordens: any[]): Map<string, { empenhado: number; pago: number }> {
  const enviados = new Set(ordens.filter((o) => o.data_emissao_ob && !cancelado(o.descricao_situacao_op)).map((o) => String(o.id_dh)));
  const planoDoEmpenho = new Map<string, string>();
  const out = new Map<string, { empenhado: number; pago: number }>();
  for (const e of empenhos) {
    if (cancelado(e.descricao_situacao_empenho)) continue;
    const plano = String(e.id_plano_acao);
    planoDoEmpenho.set(String(e.id_empenho), plano);
    const x = out.get(plano) ?? { empenhado: 0, pago: 0 };
    x.empenhado += num(e.valor_empenho);
    out.set(plano, x);
  }
  for (const d of documentos) {
    if (cancelado(d.descricao_situacao_dh) || !enviados.has(String(d.id_dh))) continue;
    const plano = planoDoEmpenho.get(String(d.id_empenho));
    if (!plano) continue;
    out.get(plano)!.pago += num(d.valor_dh);
  }
  return out;
}

/**
 * "Emendas Pix" (transferências especiais) from Transferegov: public PostgREST API, no key.
 * Keyed by normalized author name (the author code is the budget system's, not Câmara/Senado ids).
 * The lifecycle (reserved and paid) is added when those tables answer; otherwise only the
 * indicated amount is kept and a warning says so.
 */
export async function coletarEmendasPix(anoInicial: number): Promise<{ agg: Map<string, EmendaAgg>; registros: number; avisos: string[] }> {
  const agg = new Map<string, EmendaAgg>();
  const avisos: string[] = [];
  const planos = await tabela(
    "plano_acao_especial",
    [
      "id_plano_acao",
      "ano_emenda_parlamentar_plano_acao",
      "nome_parlamentar_emenda_plano_acao",
      "codigo_parlamentar_emenda_plano_acao",
      "valor_investimento_plano_acao",
      "valor_custeio_plano_acao",
      "nome_beneficiario_plano_acao",
      "uf_beneficiario_plano_acao",
      "cnpj_beneficiario_plano_acao",
    ],
    `ano_emenda_parlamentar_plano_acao=gte.${anoInicial}`,
    "id_plano_acao",
  );

  let ciclo = new Map<string, { empenhado: number; pago: number }>();
  try {
    const desde = `${anoInicial}-01-01`;
    const [empenhos, documentos, ordens] = await Promise.all([
      tabela("empenho_especial", ["id_empenho", "id_plano_acao", "valor_empenho", "descricao_situacao_empenho"], `data_emissao_empenho=gte.${desde}`, "id_empenho"),
      tabela("documento_habil_especial", ["id_dh", "id_empenho", "valor_dh", "descricao_situacao_dh"], `data_emissao_dh=gte.${desde}`, "id_dh"),
      tabela("ordem_pagamento_ordem_bancaria_especial", ["id_op_ob", "id_dh", "data_emissao_ob", "descricao_situacao_op"], `data_emissao_op=gte.${desde}`, "id_op_ob"),
    ]);
    ciclo = cicloPorPlano(empenhos, documentos, ordens);
    log.info(`Emendas Pix: ${empenhos.length} empenhos, ${documentos.length} documentos de pagamento, ${ordens.length} ordens bancárias`);
  } catch (e) {
    avisos.push(`Emendas Pix: valores reservados e pagos indisponíveis (${(e as Error).message})`);
  }

  for (const r of planos) {
    const c = ciclo.get(String(r.id_plano_acao));
    add(
      agg,
      r.nome_parlamentar_emenda_plano_acao,
      r.codigo_parlamentar_emenda_plano_acao,
      Number(r.ano_emenda_parlamentar_plano_acao),
      { indicado: num(r.valor_investimento_plano_acao) + num(r.valor_custeio_plano_acao), empenhado: c?.empenhado ?? 0, pago: c?.pago ?? 0 },
      r.nome_beneficiario_plano_acao ?? "Não informado",
      r.uf_beneficiario_plano_acao,
      "Transferegov - Transferências Especiais",
      r.cnpj_beneficiario_plano_acao ? String(r.cnpj_beneficiario_plano_acao).replace(/\D/g, "") : undefined,
    );
  }
  log.info(`Emendas Pix: ${planos.length} planos de ação, ${agg.size} autores`);
  return { agg, registros: planos.length, avisos };
}

/** "CAMPINAS (SP)" -> ["CAMPINAS", "SP"]; "Nacional" or a whole state stay as published. */
export function localidade(v: string | undefined): [string, string | undefined] {
  const t = (v ?? "").trim();
  const m = t.match(/^(.*?)\s*\(([A-Z]{2})\)$/);
  return m ? [m[1], m[2]] : [t || "Não informado", undefined];
}

/** All parliamentary amendments from Portal da Transparência (requires free API key). */
export async function coletarEmendasPortal(anos: number[], chave: string): Promise<{ agg: Map<string, EmendaAgg>; registros: number }> {
  const agg = new Map<string, EmendaAgg>();
  let registros = 0;
  for (const ano of anos) {
    for (let pagina = 1; pagina < 2000; pagina++) {
      const { data } = await getJsonWithHeaders(`${PT}/emendas?ano=${ano}&pagina=${pagina}`, {
        headers: { "chave-api-dados": chave },
        ttlHours: 20,
      });
      const rows: any[] = data ?? [];
      for (const r of rows) {
        // Committee/bench amendments have non-person authors; they are kept and simply never match a politician
        add(
          agg,
          r.nomeAutor ?? r.autor,
          r.codigoEmenda,
          Number(r.ano) || ano,
          { indicado: num(r.valorEmpenhado), empenhado: num(r.valorEmpenhado), pago: num(r.valorPago) + num(r.valorRestoPago) },
          ...localidade(r.localidadeDoGasto),
          "Portal da Transparência - Emendas",
        );
      }
      registros += rows.length;
      if (rows.length < 15) break;
    }
  }
  log.info(`Portal da Transparência: ${registros} emendas, ${agg.size} autores`);
  return { agg, registros };
}
