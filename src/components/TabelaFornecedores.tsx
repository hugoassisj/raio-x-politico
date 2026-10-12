"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Building, ChevronRight } from "lucide-react";
import { formatarCnpj } from "@/lib/cnpj";
import { data, moeda, moedaCurta, numero, pct, VAZIO } from "@/lib/format";
import type { LinhaFornecedor, OrdemFornecedor, OrdemFornecedores } from "@/lib/fornecedores";
import { TabelaDados, type MetaColuna } from "./tabela/TabelaDados";

/**
 * Suppliers of the parliamentary quota in the shared table: sortable headers, column chooser,
 * resizing, CSV and cards on phones. A supplier with a company page links to it, so one tap shows
 * who else pays the same company and every receipt.
 */
export function TabelaFornecedores({
  linhas,
  ordem,
  hrefOrdem,
  csv,
}: {
  linhas: LinhaFornecedor[];
  ordem: OrdemFornecedores;
  hrefOrdem: Record<OrdemFornecedor, string>;
  csv: string;
}) {
  const meta = (id: OrdemFornecedor, extra: MetaColuna = {}): MetaColuna => ({ hrefOrdem: hrefOrdem[id], ordenado: ordem.ordem === id ? ordem.dir : undefined, ...extra });
  const num = (v: number | undefined, f: (n: number) => string) => (v == null ? <span className="text-ink-3">{VAZIO}</span> : f(v));
  const colunas: ColumnDef<LinhaFornecedor, unknown>[] = [
    {
      id: "nome",
      header: "Fornecedor",
      size: 300,
      meta: meta("nome", { fixa: true }),
      cell: ({ row: { original: f } }) => <Nome f={f} />,
    },
    {
      id: "cnpj",
      header: "CNPJ",
      size: 170,
      meta: { explicacao: "Só CNPJ válido é publicado; pessoas físicas nunca aparecem com documento" },
      cell: ({ row: { original: f } }) => (f.cnpj ? <span className="tnum">{formatarCnpj(f.cnpj)}</span> : <span className="text-ink-3">pessoa ou sem CNPJ</span>),
    },
    {
      id: "valor",
      header: "Total",
      size: 120,
      meta: meta("valor", { direita: true, explicacao: "Soma reembolsada no período" }),
      cell: ({ row: { original: f } }) => <b>{moedaCurta(f.valor)}</b>,
    },
    {
      id: "parte",
      header: "Parte da cota",
      size: 110,
      meta: meta("parte", { direita: true, explicacao: "Quanto este fornecedor representa de tudo o que foi reembolsado no período" }),
      cell: ({ row: { original: f } }) => pct(f.parte, 1),
    },
    {
      id: "parlamentares",
      header: "Parlamentares",
      size: 120,
      meta: meta("parlamentares", { direita: true, explicacao: "Quantas pessoas diferentes pagaram" }),
      cell: ({ row: { original: f } }) => numero(f.parlamentares),
    },
    { id: "n", header: "Pagamentos", size: 110, meta: meta("n", { direita: true }), cell: ({ row: { original: f } }) => numero(f.n) },
    {
      id: "maiorPagador",
      header: "Quem mais pagou",
      size: 220,
      meta: { explicacao: "A pessoa que mais reembolsou com este fornecedor" },
      cell: ({ row: { original: f } }) =>
        f.maiorPagador ? (
          <span className="block min-w-0">
            <Link href={`/politico/${f.maiorPagador.pid}`} className="block truncate font-semibold hover:underline">
              {f.maiorPagador.nome}
            </Link>
            <span className="tnum block text-ink-3">{moedaCurta(f.maiorPagador.valor)}</span>
          </span>
        ) : (
          <span className="text-ink-3">{VAZIO}</span>
        ),
    },
    {
      id: "mediaPagamento",
      header: "Média por pagamento",
      size: 130,
      meta: meta("mediaPagamento", { direita: true, oculta: true, explicacao: "Total dividido pelo número de pagamentos" }),
      cell: ({ row: { original: f } }) => moeda(f.mediaPagamento),
    },
    {
      id: "mediaParlamentar",
      header: "Média por parlamentar",
      size: 130,
      meta: meta("mediaParlamentar", { direita: true, oculta: true, explicacao: "Total dividido pelo número de pessoas que pagaram" }),
      cell: ({ row: { original: f } }) => moeda(f.mediaParlamentar),
    },
    {
      id: "deputados",
      header: "Deputados federais",
      size: 110,
      meta: meta("deputados", { direita: true, oculta: true }),
      cell: ({ row: { original: f } }) => num(f.deputados, numero),
    },
    { id: "senadores", header: "Senadores", size: 100, meta: meta("senadores", { direita: true, oculta: true }), cell: ({ row: { original: f } }) => num(f.senadores, numero) },
    {
      id: "estaduais",
      header: "Deputados estaduais",
      size: 110,
      meta: meta("estaduais", { direita: true, oculta: true }),
      cell: ({ row: { original: f } }) => num(f.estaduais, numero),
    },
    {
      id: "campanhas",
      header: "Campanhas",
      size: 120,
      meta: meta("campanhas", { direita: true, oculta: true, explicacao: "Doou para ou foi paga por campanhas de quem acompanhamos, segundo o TSE" }),
      cell: ({ row: { original: f } }) => (f.campanhas ? moedaCurta(f.campanhas) : <span className="text-ink-3">não</span>),
    },
    {
      id: "categoria",
      header: "Para quê",
      size: 200,
      meta: { oculta: true, explicacao: "Categoria em que mais dinheiro foi reembolsado com este fornecedor" },
      cell: ({ row: { original: f } }) => f.categoria ?? <span className="text-ink-3">{VAZIO}</span>,
    },
    {
      id: "primeira",
      header: "Período",
      size: 180,
      meta: meta("primeira", { oculta: true, explicacao: "Primeiro e último pagamento encontrados" }),
      cell: ({ row: { original: f } }) => (f.primeira ? `${data(f.primeira)} a ${data(f.ultima)}` : <span className="text-ink-3">{VAZIO}</span>),
    },
  ];
  return (
    <TabelaDados
      id="fornecedores"
      linhas={linhas}
      colunas={colunas}
      chave={(f) => `${f.cnpj ?? ""}|${f.nome}`}
      legenda="Fornecedores que mais receberam da cota parlamentar"
      csv={{ href: csv }}
      cartao={(f) => (
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="min-w-0 flex-1">
            <Nome f={f} />
            <span className="block text-sm text-ink-3">
              {numero(f.parlamentares)} parlamentares · {numero(f.n)} pagamentos
              {f.maiorPagador ? ` · mais: ${f.maiorPagador.nome}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="figure block text-lg font-semibold">{moedaCurta(f.valor)}</span>
            <span className="block text-xs text-ink-3">{pct(f.parte, 1)} da cota</span>
          </span>
        </div>
      )}
    />
  );
}

/** Name with the company page one tap away; people and unknown documents stay plain text. */
function Nome({ f }: { f: LinhaFornecedor }) {
  if (!f.cnpj || !f.temPagina) return <span className="block truncate font-semibold">{f.nome}</span>;
  return (
    <Link href={`/empresa/${f.cnpj}`} className="group flex items-center gap-2" title="Ver a empresa: quem pagou, para quê e cada nota fiscal">
      <Building className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate font-semibold group-hover:underline">{f.nome}</span>
        <span className="block text-xs text-accent-ink">Ver a empresa</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
    </Link>
  );
}
