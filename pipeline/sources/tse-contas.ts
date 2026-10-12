/**
 * Campaign finance from the candidates' own accounts filed with the TSE (prestação de contas):
 * where the campaign money came from and who was paid. Only the candidacies of people we track
 * are kept while the (very large) national files stream by.
 *
 * File: prestacao_de_contas_eleitorais_candidatos_{ano}.zip, with one receitas_ and one
 * despesas_contratadas_ CSV per state. Available in this layout from 2018.
 */
import { documentoPublicavel } from "../../src/lib/cnpj";
import type { CampanhaFinancas } from "../../src/lib/types";
import { rm } from "node:fs/promises";
import { baixarArquivo } from "../lib/http";
import { log } from "../lib/log";
import { percorrerCsvZipArquivo } from "../lib/csvzip";
import { num } from "../lib/util";

const CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele";
export const ANOS_CONTAS = [2018, 2020, 2022, 2024, 2026];

/** Plain-language buckets for where campaign money came from, public money first. */
export function origemSimples(fonte: string, origem: string): string {
  const t = `${fonte} ${origem}`.toLowerCase();
  if (/fundo especial|fefc|financiamento de campanha/.test(t)) return "Fundo eleitoral (dinheiro público)";
  if (/fundo partid/.test(t)) return "Fundo partidário (dinheiro público)";
  if (/recursos pr[oó]prios/.test(t)) return "Dinheiro do próprio candidato";
  if (/financiamento coletivo/.test(t)) return "Vaquinha pela internet";
  if (/pessoas? f[ií]sicas?/.test(t)) return "Doações de pessoas";
  if (/partido|outros candidatos|candidato/.test(t)) return "Repasses de partidos e outros candidatos";
  if (/comercializa|eventos|aplica[cç]/.test(t)) return "Venda de produtos, eventos e rendimentos";
  return "Outras origens";
}

const PUBLICO = new Set(["Fundo eleitoral (dinheiro público)", "Fundo partidário (dinheiro público)"]);

/** People are named but never identified by CPF; companies and parties keep their CNPJ. */
function quem(doc: string, nome: string) {
  const d = doc.replace(/\D/g, "");
  return d.length === 14 ? { chave: d, nome, cnpj: documentoPublicavel(d) } : { chave: `pf:${nome}`, nome };
}

interface Acumulador {
  receitas: number;
  porOrigem: Map<string, number>;
  doadores: Map<string, { nome: string; cnpj?: string; origem: string; valor: number }>;
  despesas: number;
  fornecedores: Map<string, { nome: string; cnpj?: string; valor: number }>;
}

export function finalizar(a: Acumulador, ano: number): CampanhaFinancas {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const publico = [...a.porOrigem].filter(([o]) => PUBLICO.has(o)).reduce((s, [, v]) => s + v, 0);
  return {
    ano,
    receitas: r2(a.receitas),
    dinheiroPublico: r2(publico),
    porOrigem: [...a.porOrigem].map(([origem, valor]) => ({ origem, valor: r2(valor) })).sort((x, y) => y.valor - x.valor),
    doadores: [...a.doadores.values()]
      .sort((x, y) => y.valor - x.valor)
      .slice(0, 10)
      .map((d) => ({ ...d, valor: r2(d.valor) })),
    despesas: r2(a.despesas),
    fornecedores: [...a.fornecedores.values()]
      .sort((x, y) => y.valor - x.valor)
      .slice(0, 10)
      .map((f) => ({ ...f, valor: r2(f.valor) })),
    fonte: `${CDN}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`,
  };
}

/** Adds one receitas row to its candidacy. */
export function somarReceita(a: Acumulador, r: Record<string, string>) {
  const valor = num(r.VR_RECEITA);
  if (!valor) return;
  const origem = origemSimples(r.DS_FONTE_RECEITA ?? "", r.DS_ORIGEM_RECEITA ?? "");
  a.receitas += valor;
  a.porOrigem.set(origem, (a.porOrigem.get(origem) ?? 0) + valor);
  const q = quem(r.NR_CPF_CNPJ_DOADOR ?? "", (r.NM_DOADOR_RFB || r.NM_DOADOR || "Não informado").trim());
  const d = a.doadores.get(q.chave) ?? { nome: q.nome, cnpj: q.cnpj, origem, valor: 0 };
  d.valor += valor;
  a.doadores.set(q.chave, d);
}

export function somarDespesa(a: Acumulador, r: Record<string, string>) {
  const valor = num(r.VR_DESPESA_CONTRATADA);
  if (!valor) return;
  a.despesas += valor;
  const q = quem(r.NR_CPF_CNPJ_FORNECEDOR ?? "", (r.NM_FORNECEDOR_RFB || r.NM_FORNECEDOR || "Não informado").trim());
  const f = a.fornecedores.get(q.chave) ?? { nome: q.nome, cnpj: q.cnpj, valor: 0 };
  f.valor += valor;
  a.fornecedores.set(q.chave, f);
}

export const novoAcumulador = (): Acumulador => ({ receitas: 0, porOrigem: new Map(), doadores: new Map(), despesas: 0, fornecedores: new Map() });

/**
 * Campaign finance of the given candidacies, keyed by `${ano}:${sq}`. Years whose file is missing
 * or in another layout are reported and skipped.
 */
export async function coletarContasCampanha(alvos: Map<number, Set<string>>): Promise<{ contas: Map<string, CampanhaFinancas>; arquivos: string[]; avisos: string[] }> {
  const contas = new Map<string, CampanhaFinancas>();
  const arquivos: string[] = [];
  const avisos: string[] = [];
  for (const [ano, sqs] of [...alvos].sort((a, b) => a[0] - b[0])) {
    if (!sqs.size || !ANOS_CONTAS.includes(ano)) continue;
    const url = `${CDN}/prestacao_contas/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`;
    try {
      const { caminho } = await baixarArquivo(url, { ttlHours: ano >= 2026 ? 24 : 24 * 90 });
      arquivos.push(url);
      const acc = new Map<string, Acumulador>();
      const de = (sq: string) => {
        let a = acc.get(sq);
        if (!a) acc.set(sq, (a = novoAcumulador()));
        return a;
      };
      // One file per state (and "BR" for president); "_BRASIL" repeats them all
      await percorrerCsvZipArquivo(
        caminho,
        (row, arquivo) => {
          const sq = (row.SQ_CANDIDATO ?? "").trim();
          if (!sqs.has(sq)) return;
          if (/^receitas_candidatos_\d{4}_[A-Z]{2}\./i.test(base(arquivo))) somarReceita(de(sq), row);
          else somarDespesa(de(sq), row);
        },
        { arquivo: (n) => /^(receitas_candidatos|despesas_contratadas_candidatos)_\d{4}_[A-Z]{2}\.csv$/i.test(base(n)) },
      );
      for (const [sq, a] of acc) contas.set(`${ano}:${sq}`, finalizar(a, ano));
      // Gigabytes each: freed right away (the weekly run downloads them again)
      await rm(caminho, { force: true });
      log.info(`Contas de campanha ${ano}: ${acc.size} de ${sqs.size} candidaturas`);
    } catch (e) {
      avisos.push(`Contas de campanha ${ano}: ${(e as Error).message}`);
    }
  }
  return { contas, arquivos, avisos };
}

const base = (n: string) => n.split("/").pop() ?? n;
