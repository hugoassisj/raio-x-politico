"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { numerosDePagina } from "@/lib/paginacao";

/**
 * Page buttons shared by every list. The caller owns the page state (usually in the address), so
 * back and forward in the browser move between pages.
 */
export function Paginacao({ pagina, paginas, aoIr, rotulo = "Páginas" }: { pagina: number; paginas: number; aoIr: (p: number) => void; rotulo?: string }) {
  if (paginas <= 1) return null;
  const botao = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-line px-2 text-sm font-semibold tnum hover:border-line-strong disabled:opacity-40";
  return (
    <nav aria-label={rotulo} className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={botao} disabled={pagina <= 1} onClick={() => aoIr(pagina - 1)} aria-label="Página anterior">
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {numerosDePagina(pagina, paginas).map((p, i) =>
        p == null ? (
          <span key={`gap-${i}`} className="px-1 text-ink-3" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => aoIr(p)}
            aria-current={p === pagina ? "page" : undefined}
            aria-label={`Página ${p}`}
            className={`${botao} ${p === pagina ? "border-accent bg-accent text-on-accent hover:border-accent" : ""}`}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={botao} disabled={pagina >= paginas} onClick={() => aoIr(pagina + 1)} aria-label="Próxima página">
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
