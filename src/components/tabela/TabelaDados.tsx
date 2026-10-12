"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
        <MenuColunas
          colunas={tabela.getAllLeafColumns().map((c) => ({
            id: c.id,
            rotulo: String(c.columnDef.header),
            visivel: c.getIsVisible(),
            fixa: !!(c.columnDef.meta as MetaColuna | undefined)?.fixa,
            alternar: () => c.toggleVisibility(),
          }))}
        />
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

      <div className="tabela-caixa hidden md:block" tabIndex={0} role="region" aria-label="Tabela; use as setas para rolar">
        <table className="tabela">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            {tabela.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => {
                  const meta = h.column.columnDef.meta as MetaColuna | undefined;
                  const Icone = meta?.ordenado === "asc" ? ArrowUp : meta?.ordenado === "desc" ? ArrowDown : ArrowUpDown;
                  const titulo = flexRender(h.column.columnDef.header, h.getContext());
                  // Width only once the person resized the column; otherwise the browser fits the content
                  const largura = larguras[h.column.id];
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      data-num={meta?.direita ? "" : undefined}
                      style={largura ? { width: largura, minWidth: largura } : undefined}
                      aria-sort={meta?.ordenado === "asc" ? "ascending" : meta?.ordenado === "desc" ? "descending" : undefined}
                      title={meta?.explicacao}
                    >
                      {meta?.hrefOrdem ? (
                        <Link href={meta.hrefOrdem} className="ordenar">
                          {meta.direita && <Icone className="h-3.5 w-3.5" aria-hidden />}
                          <span>{titulo}</span>
                          {!meta.direita && <Icone className="h-3.5 w-3.5" aria-hidden />}
                          <span className="sr-only">{meta.ordenado ? ", em ordem. Toque para inverter" : ", toque para ordenar"}</span>
                        </Link>
                      ) : (
                        titulo
                      )}
                      {h.column.getCanResize() && (
                        <span
                          onMouseDown={h.getResizeHandler()}
                          onTouchStart={h.getResizeHandler()}
                          onDoubleClick={() => h.column.resetSize()}
                          title="Arraste para mudar a largura; dois cliques voltam ao normal"
                          aria-hidden
                          className={`absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-2 after:right-0.5 after:w-0.5 after:rounded after:bg-line-strong after:opacity-0 hover:after:opacity-100 ${h.column.getIsResizing() ? "after:bg-accent after:opacity-100" : ""}`}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabela.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => {
                  const meta = c.column.columnDef.meta as MetaColuna | undefined;
                  return (
                    <td key={c.id} data-num={meta?.direita ? "" : undefined} data-ordenado={meta?.ordenado ? "" : undefined}>
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

/**
 * Column chooser: a button that opens a panel, closed by "Pronto", by Esc, or by clicking outside.
 * Checking a column shows it at once; nothing is applied later.
 */
function MenuColunas({ colunas }: { colunas: { id: string; rotulo: string; visivel: boolean; fixa: boolean; alternar: () => void }[] }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);
  const visiveis = colunas.filter((c) => c.visivel).length;
  return (
    <div ref={caixa} className="relative">
      <button ref={botao} type="button" className="botao-sec" aria-expanded={aberto} aria-controls="menu-colunas" onClick={() => setAberto((a) => !a)}>
        <Columns3 className="h-4 w-4" aria-hidden />
        Colunas ({visiveis} de {colunas.length})
      </button>
      {aberto && (
        <div id="menu-colunas" role="group" aria-label="Colunas da tabela" className="absolute left-0 z-30 mt-2 w-72 rounded-xl border border-line bg-surface p-3 shadow-3">
          <p className="mb-2 text-sm text-ink-3">Marque o que quer ver. A escolha fica guardada neste aparelho.</p>
          <ul className="max-h-80 overflow-y-auto">
            {colunas.map((c) => (
              <li key={c.id}>
                <label className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-surface-2 ${c.fixa ? "cursor-default text-ink-3" : ""}`}>
                  <input type="checkbox" checked={c.visivel} disabled={c.fixa} onChange={c.alternar} className="h-4 w-4 accent-[var(--accent)]" />
                  {c.rotulo}
                  {c.fixa && <span className="ml-auto text-xs">sempre</span>}
                </label>
              </li>
            ))}
          </ul>
          <button type="button" className="botao mt-3 w-full" onClick={() => setAberto(false)}>
            Pronto
          </button>
        </div>
      )}
    </div>
  );
}
