import { getJson, getJsonWithHeaders } from "../lib/http";
import { log } from "../lib/log";
import { norm, num } from "../lib/util";
import type { EmendaAgg } from "../model";

const TG = "https://api.transferegov.gestao.gov.br/transferenciasespeciais";
const PT = "https://api.portaldatransparencia.gov.br/api-de-dados";

function add(m: Map<string, EmendaAgg>, nome: string, codigo: string | undefined, ano: number, valor: number, destino: string, uf: string | undefined, fonte: string) {
  if (!nome || !valor) return;
  const k = norm(nome);
  let a = m.get(k);
  if (!a) m.set(k, (a = { nome, codigo, total: 0, porAno: new Map(), destinos: new Map(), fonte }));
  a.total += valor;
  a.porAno.set(ano, (a.porAno.get(ano) ?? 0) + valor);
  const dk = `${norm(destino)}|${uf ?? ""}`;
  const d = a.destinos.get(dk) ?? { nome: destino, uf, valor: 0 };
  d.valor += valor;
  a.destinos.set(dk, d);
}

/**
 * "Emendas Pix" (transferências especiais) from Transferegov: public PostgREST API, no key.
 * Keyed by normalized author name (the author code is the budget system's, not Câmara/Senado ids).
 */
export async function coletarEmendasPix(anoInicial: number): Promise<{ agg: Map<string, EmendaAgg>; registros: number }> {
  const agg = new Map<string, EmendaAgg>();
  const page = 1000;
  let offset = 0;
  let registros = 0;
  const cols = [
    "ano_emenda_parlamentar_plano_acao",
    "nome_parlamentar_emenda_plano_acao",
    "codigo_parlamentar_emenda_plano_acao",
    "valor_investimento_plano_acao",
    "valor_custeio_plano_acao",
    "nome_beneficiario_plano_acao",
    "uf_beneficiario_plano_acao",
  ].join(",");
  for (;;) {
    const url = `${TG}/plano_acao_especial?select=${cols}&ano_emenda_parlamentar_plano_acao=gte.${anoInicial}&order=id_plano_acao.asc&limit=${page}&offset=${offset}`;
    const rows: any[] = (await getJson(url, { ttlHours: 20, timeoutMs: 120_000 })) ?? [];
    for (const r of rows) {
      add(
        agg,
        r.nome_parlamentar_emenda_plano_acao,
        r.codigo_parlamentar_emenda_plano_acao,
        Number(r.ano_emenda_parlamentar_plano_acao),
        num(r.valor_investimento_plano_acao) + num(r.valor_custeio_plano_acao),
        r.nome_beneficiario_plano_acao ?? "Não informado",
        r.uf_beneficiario_plano_acao,
        "Transferegov - Transferências Especiais",
      );
    }
    registros += rows.length;
    if (rows.length < page) break;
    offset += page;
    if (offset > 500_000) break;
  }
  log.info(`Emendas Pix: ${registros} planos de ação, ${agg.size} autores`);
  return { agg, registros };
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
          num(r.valorPago) || num(r.valorEmpenhado),
          r.localidadeDoGasto ?? "Não informado",
          undefined,
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
