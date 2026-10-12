import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { numerosDePagina } from "@/lib/paginacao";

/**
 * Page buttons shared by every list. The page lives in the address: lists filtered on the server
 * pass `href`, lists filtered in the browser pass `aoIr` (and write the address themselves), so back
 * and forward in the browser always move between pages. No "use client": it renders on the server
 * with links, and inside client components with buttons.
 */
export function Paginacao({
  pagina,
  paginas,
  aoIr,
  href,
  rotulo = "Páginas",
}: {
  pagina: number;
  paginas: number;
  aoIr?: (p: number) => void;
  href?: (p: number) => string;
  rotulo?: string;
}) {
  if (paginas <= 1) return null;
  const botao = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-line px-2 text-sm font-semibold tnum hover:border-line-strong";
  const ir = (p: number, conteudo: ReactNode, extra: { label?: string; atual?: boolean; desligado?: boolean } = {}) => {
    const cls = `${botao} ${extra.atual ? "border-accent bg-accent text-on-accent hover:border-accent" : ""} ${extra.desligado ? "pointer-events-none opacity-40" : ""}`;
    const comum = { "aria-label": extra.label, "aria-current": extra.atual ? ("page" as const) : undefined, className: cls };
    if (href)
      return extra.desligado ? (
        <span {...comum} aria-disabled>
          {conteudo}
        </span>
      ) : (
        <Link href={href(p)} {...comum}>
          {conteudo}
        </Link>
      );
    return (
      <button type="button" disabled={extra.desligado} onClick={() => aoIr?.(p)} {...comum}>
        {conteudo}
      </button>
    );
  };
  return (
    <nav aria-label={rotulo} className="flex flex-wrap items-center gap-1.5">
      {ir(pagina - 1, <ChevronLeft className="h-4 w-4" aria-hidden />, { label: "Página anterior", desligado: pagina <= 1 })}
      {numerosDePagina(pagina, paginas).map((p, i) =>
        p == null ? (
          <span key={`gap-${i}`} className="px-1 text-ink-3" aria-hidden>
            …
          </span>
        ) : (
          <span key={p}>{ir(p, p, { label: `Página ${p}`, atual: p === pagina })}</span>
        ),
      )}
      {ir(pagina + 1, <ChevronRight className="h-4 w-4" aria-hidden />, { label: "Próxima página", desligado: pagina >= paginas })}
    </nav>
  );
}
