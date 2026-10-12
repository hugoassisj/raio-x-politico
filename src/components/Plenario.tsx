"use client";

import { useMemo, useState } from "react";
import { ALTURA, LARGURA, MESA, layoutPlenario, type Cadeira, type ItemLegenda } from "@/lib/plenario";
import { Avatar } from "./Avatar";

/**
 * Hemicycle of the plenary: one circle per seat, ordered so groups form wedges, with the central
 * aisle and the presiding board (Mesa). Hover or tap a seat to see who sits there.
 */
export function Plenario({ cadeiras, legenda, titulo, linhaMeta }: { cadeiras: Cadeira[]; legenda: ItemLegenda[]; titulo: string; linhaMeta?: { n: number; rotulo: string } }) {
  const assentos = useMemo(() => layoutPlenario(cadeiras.length), [cadeiras.length]);
  const [ativo, setAtivo] = useState<number | null>(null);
  const pad = (assentos[0]?.r ?? 10) + 6;
  const sel = ativo != null ? cadeiras[ativo] : undefined;

  return (
    <figure className="w-full">
      <div className="relative">
        <svg viewBox={`${-pad} ${-pad} ${LARGURA + 2 * pad} ${ALTURA + 2 * pad}`} className="h-auto w-full" role="img" aria-label={titulo}>
          <title>{titulo}</title>
          <rect x={MESA.x} y={MESA.y} width={MESA.largura} height={MESA.altura} rx="8" fill="var(--surface-2)" stroke="var(--line)" />
          <text x={LARGURA / 2} y={MESA.y + MESA.altura / 2 + 6} textAnchor="middle" fontSize="18" fill="var(--ink-3)" fontWeight="600">
            Mesa
          </text>
          {cadeiras.map((c, i) => {
            const a = assentos[i];
            if (!a) return null;
            const circulo = (
              <circle
                cx={a.x}
                cy={a.y}
                r={a.r}
                fill={c.cor}
                opacity={c.esmaecido ? 0.22 : 1}
                stroke={ativo === i ? "var(--ink)" : "var(--surface)"}
                strokeWidth={ativo === i ? 3 : 1.5}
                onMouseEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                tabIndex={c.href ? undefined : 0}
              />
            );
            return c.href ? (
              <a key={c.id} href={c.href} aria-label={`${c.nome}, ${c.partido}-${c.uf}${c.detalhe ? `: ${c.detalhe}` : ""}`} onFocus={() => setAtivo(i)}>
                {circulo}
              </a>
            ) : (
              <g key={c.id}>{circulo}</g>
            );
          })}
        </svg>
      </div>
      <div aria-live="polite" className="mt-2 flex min-h-14 justify-center">
        {sel ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <Avatar src={sel.foto} nome={sel.nome} size={40} />
            <div className="text-left">
              <p className="font-semibold leading-tight">{sel.nome}</p>
              <p className="text-sm text-ink-3">
                {sel.partido}-{sel.uf}
                {sel.detalhe ? ` · ${sel.detalhe}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="self-center text-sm text-ink-3">Passe o dedo ou o mouse sobre uma cadeira para ver quem é.</p>
        )}
      </div>
      <figcaption className="mt-2">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {legenda.map((l) => (
            <li key={l.rotulo} className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: l.cor }} aria-hidden />
              <span>
                {l.rotulo} <b className="tnum">{l.n}</b>
              </span>
            </li>
          ))}
        </ul>
        {linhaMeta && <p className="mt-2 text-center text-sm text-ink-2">{linhaMeta.rotulo}</p>}
      </figcaption>
    </figure>
  );
}

/** Small static hemicycle used in explainers: highlights the first `destaque` seats. */
export function MiniPlenario({ total, destaque, cor = "var(--ink)", rotulo }: { total: number; destaque: number; cor?: string; rotulo: string }) {
  const assentos = layoutPlenario(total);
  const pad = (assentos[0]?.r ?? 10) + 4;
  return (
    <svg viewBox={`${-pad} ${-pad} ${LARGURA + 2 * pad} ${ALTURA + 2 * pad}`} className="h-auto w-full" role="img" aria-label={rotulo}>
      {assentos.map((a, i) => (
        <circle key={i} cx={a.x} cy={a.y} r={a.r} fill={i < destaque ? cor : "var(--line)"} />
      ))}
    </svg>
  );
}
