"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { METRICAS, type ChaveMetrica } from "@/lib/metricas";
import { nomeUf } from "@/lib/ufs";
import type { PoliticoResumo } from "@/lib/types";
import { Avatar } from "./Avatar";
import { cargoDe } from "./Listas";
import { SiglaPartido } from "./Partido";
import { TabelaDados, type MetaColuna } from "./tabela/TabelaDados";

/** Columns shown at first; every other metric can be turned on in "Colunas". */
const VISIVEIS: ChaveMetrica[] = ["presenca", "participacao", "fidelidade", "gasto12m", "proposicoes"];

/**
 * Everyone in a sortable, configurable table on computers and one card per person on phones.
 * Metric columns come from metricas.ts, so names and formats match the rest of the site.
 */
export function TabelaPoliticos({
  itens,
  ordem = "",
  dir = "asc",
  hrefOrdem = {},
  csv,
  id = "politicos",
}: {
  itens: PoliticoResumo[];
  ordem?: string;
  dir?: "asc" | "desc";
  /** Address that sorts by each column (by column id); without it the table is not sortable */
  hrefOrdem?: Record<string, string>;
  csv?: string;
  /** Name under which column choices are remembered */
  id?: string;
}) {
  const meta = (id: string, extra: MetaColuna = {}): MetaColuna => ({ hrefOrdem: hrefOrdem[id], ordenado: ordem === id ? dir : undefined, ...extra });
  const colunas: ColumnDef<PoliticoResumo, unknown>[] = [
    {
      id: "nome",
      header: "Nome",
      size: 280,
      meta: meta("nome", { fixa: true }),
      cell: ({ row: { original: p } }) => (
        <Link href={`/politico/${p.id}`} className="flex items-center gap-3">
          <Avatar src={p.foto} nome={p.nome} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-semibold hover:underline">{p.nome}</span>
            <span className="block truncate text-ink-3">{cargoDe(p)}</span>
          </span>
        </Link>
      ),
    },
    { id: "partido", header: "Partido", size: 110, cell: ({ row: { original: p } }) => <SiglaPartido sigla={p.partido} /> },
    { id: "uf", header: "Estado", size: 90, meta: { explicacao: "Estado que a pessoa representa" }, cell: ({ row: { original: p } }) => <abbr title={nomeUf(p.uf)}>{p.uf}</abbr> },
    {
      id: "inicioPolitica",
      header: "Na política desde",
      size: 130,
      meta: { direita: true, oculta: true, explicacao: "Ano do primeiro cargo eletivo encontrado" },
      cell: ({ row: { original: p } }) => p.inicioPolitica ?? "",
    },
    ...METRICAS.map((d): ColumnDef<PoliticoResumo, unknown> => ({
      id: d.chave,
      header: d.titulo,
      size: 130,
      meta: meta(d.chave, { direita: true, explicacao: d.pergunta, oculta: !VISIVEIS.includes(d.chave) }),
      cell: ({ row: { original: p } }) => <span className={ordem === d.chave ? "font-semibold" : "text-ink-2"}>{d.formato(p.m[d.chave])}</span>,
    })),
  ];
  const def = METRICAS.find((m) => m.chave === ordem);
  return (
    <TabelaDados
      id={id}
      linhas={itens}
      colunas={colunas}
      chave={(p) => p.id}
      legenda="Políticos e seus números principais"
      csv={csv ? { href: csv } : undefined}
      cartao={(p) => (
        <Link href={`/politico/${p.id}`} className="flex items-center gap-3 px-3 py-3">
          <Avatar src={p.foto} nome={p.nome} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{p.nome}</span>
            <span className="block truncate text-sm text-ink-3">
              {cargoDe(p)} · {p.partido}-{p.uf}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="figure block text-lg font-semibold">{(def ?? METRICAS[0]).formato(p.m[(def ?? METRICAS[0]).chave])}</span>
            <span className="block text-xs text-ink-3">{(def ?? METRICAS[0]).titulo}</span>
          </span>
        </Link>
      )}
    />
  );
}
