"use client";

import { SiglaPartido } from "./Partido";
import { Uf } from "./Bandeira";
import { useMemo, useState } from "react";
import { ALTURA, LARGURA, MESA, layoutPlenario, type Cadeira, type ItemLegenda } from "@/lib/plenario";
import { Avatar } from "./Avatar";

/**
 * Hemicycle of the plenary: one circle per seat, ordered so groups form wedges, with the central
 * aisle and the presiding board (Mesa). Hover or tap a seat to see who sits there.
 */
export function Plenario({
  cadeiras,
  legenda,
  titulo,
  linhaMeta,
  filtro,
}: {
  cadeiras: Cadeira[];
  legenda: ItemLegenda[];
  titulo: string;
  linhaMeta?: { n: number; rotulo: string };
  /** When given, legend items become buttons that filter by group */
  filtro?: { ativo: (id: string) => boolean; aoTocar: (id: string) => void };
}) {
  const assentos = useMemo(() => layoutPlenario(cadeiras.length), [cadeiras.length]);
  const [ativo, setAtivo] = useState<number | null>(null);
  const pad = (assentos[0]?.r ?? 10) + 6;
  const sel = ativo != null ? cadeiras[ativo] : undefined;

  return (
    <figure className="w-full">
      <div className="relative">
        <svg viewBox={`${-pad} ${-pad} ${LARGURA + 2 * pad} ${ALTURA + 2 * pad}`} className="h-auto w-full" role="group" aria-label={titulo}>
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
                className="assento"
                style={{ "--d": Math.round((i / cadeiras.length) * 700) } as React.CSSProperties}
                cx={a.x}
                cy={a.y}
                r={a.r}
                fill={c.cor}
                fillOpacity={c.esmaecido ? 0.18 : 1}
                stroke={ativo === i ? "var(--ink)" : "var(--surface)"}
                strokeWidth={ativo === i ? 3 : 1.5}
                onMouseEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                tabIndex={c.href ? undefined : 0}
              />
            );
            return c.href ? (
              <a
                key={c.id}
                href={c.href}
                aria-label={`${c.nome}, ${c.partido}-${c.uf}${c.detalhe ? `: ${c.detalhe}` : ""}`}
                onFocus={() => setAtivo(i)}
                onClick={(e) => {
                  // On touch screens the first tap shows who it is; the second opens the profile
                  if (ativo !== i && window.matchMedia("(hover: none)").matches) {
                    e.preventDefault();
                    setAtivo(i);
                  }
                }}
              >
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
          <div className="flex items-center gap-3 cartao rounded-xl px-3 py-2 shadow-2">
            <Avatar src={sel.foto} nome={sel.nome} size={40} />
            <div className="text-left">
              <p className="font-semibold leading-tight">{sel.nome}</p>
              <p className="text-sm text-ink-3">
                <SiglaPartido sigla={sel.partido} /> · <Uf uf={sel.uf} altura={10} />
                {sel.detalhe ? ` · ${sel.detalhe}` : ""}
              </p>
            </div>
            {sel.href && (
              <a href={sel.href} className="ml-2 text-sm font-semibold text-accent-ink hover:underline">
                Ver perfil
              </a>
            )}
          </div>
        ) : (
          <p className="self-center text-sm text-ink-3">Passe o dedo ou o mouse sobre uma cadeira para ver quem é.</p>
        )}
      </div>
      <figcaption className="mt-2">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {legenda.map((l) => {
            const conteudo = (
              <>
                <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: l.cor }} aria-hidden />
                <span>
                  {l.rotulo} <b className="tnum">{l.n}</b>
                </span>
              </>
            );
            return (
              <li key={l.rotulo}>
                {filtro && l.id ? (
                  <button
                    type="button"
                    aria-pressed={filtro.ativo(l.id)}
                    onClick={() => filtro.aoTocar(l.id!)}
                    className={`flex min-h-9 items-center gap-2 rounded-full px-3 transition-colors hover:bg-surface-2 ${filtro.ativo(l.id) ? "" : "line-through decoration-2 ring-1 ring-inset ring-line"}`}
                    title={filtro.ativo(l.id) ? "Esconder este grupo da lista" : "Escondido da lista. Toque para mostrar"}
                  >
                    {conteudo}
                  </button>
                ) : (
                  <span className="flex items-center gap-2">{conteudo}</span>
                )}
              </li>
            );
          })}
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
