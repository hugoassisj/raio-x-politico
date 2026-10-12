"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type ColumnSizingState, type VisibilityState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, RotateCcw } from "lucide-react";

/** Extra information each column can carry, read by the shared header. */
export interface MetaColuna {
  /** Link that sorts by this column (sorting happens on the server, through the address) */
  hrefOrdem?: string;
  ordenado?: "asc" | "desc";
  direita?: boolean;
  /** Cannot be hidden (the name column, for example) */
  fixa?: boolean;
  /** Full explanation shown on hover over the header */
  explicacao?: string;
  /** Hidden until the person turns it on */
  oculta?: boolean;
}

const PREFIXO = "tabela:";

function lerPreferencias(id: string): { visibilidade?: VisibilityState; larguras?: ColumnSizingState } {
  try {
    return JSON.parse(localStorage.getItem(PREFIXO + id) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Shared table on TanStack Table: hide and show columns, drag to resize, sort through links, download
 * the whole filtered list as CSV, and choices remembered on this device. On phones the caller's
 * card layout is shown instead of a wide table.
 */
export function TabelaDados<T>({
  id,
  linhas,
  colunas,
  chave,
  cartao,
  csv,
  legenda,
}: {
  /** Stable name used to remember choices on this device */
  id: string;
  linhas: T[];
  colunas: ColumnDef<T, unknown>[];
  chave: (t: T) => string;
  /** How one row looks on a phone */
  cartao: (t: T) => ReactNode;
  /** Download of the whole filtered list (not only this page) */
  csv?: { href: string; rotulo?: string };
  legenda: string;
}) {
  // Columns marked "oculta" start hidden
  const padrao: VisibilityState = Object.fromEntries(colunas.filter((c) => (c.meta as MetaColuna | undefined)?.oculta).map((c) => [c.id!, false]));
  const [visibilidade, setVisibilidade] = useState<VisibilityState>(padrao);
  const [larguras, setLarguras] = useState<ColumnSizingState>({});
  const [carregado, setCarregado] = useState(false);

  // Saved choices are applied after the first render, so the server and the browser start equal
  useEffect(() => {
    const p = lerPreferencias(id);
    setVisibilidade(p.visibilidade ?? padrao);
    setLarguras(p.larguras ?? {});
    setCarregado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the default comes from the column list, fixed for this table
  }, [id]);
  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(PREFIXO + id, JSON.stringify({ visibilidade, larguras }));
    } catch {
      // Storage may be blocked; the choice still holds for this visit
    }
  }, [id, visibilidade, larguras, carregado]);

  // TanStack Table returns new functions on each render, so the React Compiler skips this component
  // eslint-disable-next-line react-hooks/incompatible-library -- known and intended
  const tabela = useReactTable({
    data: linhas,
    columns: colunas,
    getRowId: chave,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: { columnVisibility: visibilidade, columnSizing: larguras },
    onColumnVisibilityChange: setVisibilidade,
    onColumnSizingChange: setLarguras,
  });
  const alteradas = JSON.stringify(visibilidade) !== JSON.stringify(padrao) || Object.keys(larguras).length > 0;

  return (
    <div>
      <div className="mb-3 hidden flex-wrap items-center gap-2 md:flex">
        <details className="relative">
          <summary className="botao-sec cursor-pointer list-none">
            <Columns3 className="h-4 w-4" aria-hidden />
            Colunas
          </summary>
          <fieldset className="absolute z-20 mt-1 w-64 rounded-xl border border-line bg-surface p-3 shadow-2">
            <legend className="sr-only">Colunas visíveis</legend>
            {tabela.getAllLeafColumns().map((c) => {
              const meta = c.columnDef.meta as MetaColuna | undefined;
              return (
                <label key={c.id} className={`flex min-h-9 items-center gap-2 text-sm ${meta?.fixa ? "text-ink-3" : ""}`}>
                  <input type="checkbox" checked={c.getIsVisible()} disabled={meta?.fixa} onChange={c.getToggleVisibilityHandler()} className="h-4 w-4 accent-[var(--accent)]" />
                  {String(c.columnDef.header)}
                </label>
              );
            })}
          </fieldset>
        </details>
        {alteradas && (
          <button
            type="button"
            className="botao-sec"
            onClick={() => {
              setVisibilidade(padrao);
              setLarguras({});
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Voltar ao padrão
          </button>
        )}
        {csv && (
          <a href={csv.href} className="botao-sec" download>
            <Download className="h-4 w-4" aria-hidden />
            {csv.rotulo ?? "Baixar a lista (CSV)"}
          </a>
        )}
      </div>

      <ul className="divide-y divide-line cartao rounded-xl md:hidden">
        {linhas.map((t) => (
          <li key={chave(t)}>{cartao(t)}</li>
        ))}
      </ul>
      {csv && (
        <a href={csv.href} className="botao-sec mt-3 md:hidden" download>
          <Download className="h-4 w-4" aria-hidden />
          {csv.rotulo ?? "Baixar a lista (CSV)"}
        </a>
      )}

      <div className="hidden overflow-x-auto cartao rounded-xl md:block">
        <table className="w-full text-sm" style={{ minWidth: tabela.getTotalSize() }}>
          <caption className="sr-only">{legenda}</caption>
          <thead>
            {tabela.getHeaderGroups().map((g) => (
              <tr key={g.id} className="border-b border-line text-left text-ink-3">
                {g.headers.map((h) => {
                  const meta = h.column.columnDef.meta as MetaColuna | undefined;
                  const Icone = meta?.ordenado === "asc" ? ArrowUp : meta?.ordenado === "desc" ? ArrowDown : ArrowUpDown;
                  const titulo = flexRender(h.column.columnDef.header, h.getContext());
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      style={{ width: h.getSize() }}
                      aria-sort={meta?.ordenado === "asc" ? "ascending" : meta?.ordenado === "desc" ? "descending" : undefined}
                      title={meta?.explicacao}
                      className={`relative px-3 py-3 font-normal ${meta?.direita ? "text-right" : ""} ${meta?.ordenado ? "text-ink" : ""}`}
                    >
                      {meta?.hrefOrdem ? (
                        <Link href={meta.hrefOrdem} className={`inline-flex items-center gap-1 hover:underline ${meta.direita ? "flex-row-reverse" : ""}`}>
                          {titulo}
                          <Icone className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only">{meta.ordenado ? ", ordenado. Toque para inverter" : ", toque para ordenar"}</span>
                        </Link>
                      ) : (
                        titulo
                      )}
                      {h.column.getCanResize() && (
                        <span
                          onMouseDown={h.getResizeHandler()}
                          onTouchStart={h.getResizeHandler()}
                          onDoubleClick={() => h.column.resetSize()}
                          aria-hidden
                          className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-line-strong ${h.column.getIsResizing() ? "bg-accent" : ""}`}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-line">
            {tabela.getRowModel().rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-2/60">
                {r.getVisibleCells().map((c) => {
                  const meta = c.column.columnDef.meta as MetaColuna | undefined;
                  return (
                    <td key={c.id} style={{ width: c.column.getSize() }} className={`px-3 py-2.5 ${meta?.direita ? "tnum text-right" : ""}`}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
