import Link from "next/link";
import type { ReactNode } from "react";
import { rotuloVoto } from "@/lib/linguagem";

/** Canonical vote label + color. Color is never the only signal: the word is always shown. */
export function VotoChip({ voto, compacto = false }: { voto?: string; compacto?: boolean }) {
  const r = rotuloVoto(voto);
  const cls = {
    sim: "bg-sim text-white",
    nao: "bg-nao text-white",
    outro: "bg-abst text-white",
    ausente: "bg-surface-2 text-ink-2 ring-1 ring-inset ring-line",
  }[r.tipo];
  return (
    <span
      title={r.explicacao}
      className={`inline-flex items-center whitespace-nowrap rounded-md font-semibold ${compacto ? "px-1.5 py-0.5 text-xs" : "px-2 py-0.5 text-sm"} ${cls}`}
    >
      {r.rotulo}
    </span>
  );
}

export function Fonte({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link text-sm">
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
      <svg aria-hidden viewBox="0 0 12 12" className="ml-1 inline h-3 w-3 align-baseline" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4.5 2.5h5v5M9.5 2.5 3 9" />
      </svg>
    </a>
  );
}

/** Section with a plain-language title and an optional "where does this come from" disclosure. */
export function Secao({
  id,
  titulo,
  subtitulo,
  origem,
  children,
  acao,
}: {
  id?: string;
  titulo: string;
  subtitulo?: ReactNode;
  origem?: ReactNode;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-8 pb-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          <h2 className="display text-2xl font-bold sm:text-[1.7rem]">{titulo}</h2>
          {subtitulo && <p className="mt-1.5 text-ink-2">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
      {origem && <Origem>{origem}</Origem>}
    </section>
  );
}

export function Origem({ children, titulo = "De onde vêm esses dados?" }: { children: ReactNode; titulo?: string }) {
  return (
    <details className="group mt-5 rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-2">
      <summary className="flex items-center gap-2 font-semibold text-ink">
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 transition-transform group-open:rotate-90" fill="currentColor">
          <path d="M6 3.5 10.5 8 6 12.5z" />
        </svg>
        {titulo}
      </summary>
      <div className="mt-3 space-y-2 leading-relaxed">{children}</div>
    </details>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-surface-2 px-4 py-5 text-ink-2">{children}</p>;
}

export function Pill({ children, href, ativo }: { children: ReactNode; href?: string; ativo?: boolean }) {
  const cls = `chip ${ativo ? "chip-ativo" : ""}`;
  return href ? (
    <Link href={href} className={cls} aria-current={ativo ? "page" : undefined}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Horizontal bars with direct labels: the default way to compare a handful of values. */
export function Barras({
  itens,
  formato,
  max,
}: {
  itens: { rotulo: ReactNode; valor: number; detalhe?: ReactNode; href?: string }[];
  formato: (n: number) => string;
  max?: number;
}) {
  const m = max ?? Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-3">
      {itens.map((it, i) => {
        const w = Math.max(0.5, (it.valor / m) * 100);
        const corpo = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{it.rotulo}</span>
              <span className="tnum shrink-0 font-semibold">{formato(it.valor)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-2">
              <div className="crescer-x h-2 rounded-full bg-accent" style={{ width: `${w}%` }} />
            </div>
            {it.detalhe && <div className="mt-1 text-xs text-ink-3">{it.detalhe}</div>}
          </>
        );
        return (
          <li key={i}>
            {it.href ? (
              <Link href={it.href} className="block hover:opacity-80">
                {corpo}
              </Link>
            ) : (
              corpo
            )}
          </li>
        );
      })}
    </ul>
  );
}
