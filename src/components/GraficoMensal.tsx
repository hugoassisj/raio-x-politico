"use client";

import { useState } from "react";
import { mesAno, moeda, moedaCurta } from "@/lib/format";

/** Round tick values (1, 2, 2.5 or 5 times a power of ten) inside (0, max], for the value gridlines. */
function ticksRedondos(max: number, alvo = 3): number[] {
  const bruto = max / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((x) => x >= bruto) ?? 10 * pot;
  const out: number[] = [];
  for (let v = passo; v <= max; v += passo) out.push(v);
  return out;
}

/** Monthly columns with a hover/focus readout. Single series, so no legend; the title names it. */
export function GraficoMensal({ meses, referencia, rotuloReferencia }: { meses: { mes: string; valor: number }[]; referencia?: number; rotuloReferencia?: string }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const max = Math.max(...meses.map((m) => m.valor), referencia ?? 0, 1);
  const H = 160;
  const sel = ativo != null ? meses[ativo] : undefined;
  return (
    <figure>
      <div className="mb-2 h-6 text-sm" aria-live="polite">
        {sel ? (
          <span>
            <b>{mesAno(sel.mes)}</b>: {moeda(sel.valor)}
          </span>
        ) : (
          <span className="text-ink-3">Passe o dedo ou o mouse sobre as colunas para ver cada mês.</span>
        )}
      </div>
      <div className="relative" style={{ height: H }}>
        {ticksRedondos(max).map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: (t / max) * H }} aria-hidden>
            <span className="absolute -top-2 right-0 bg-paper px-1 text-[10px] leading-4 text-ink-3">{moedaCurta(t)}</span>
          </div>
        ))}
        {referencia != null && referencia > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink-3" style={{ bottom: (referencia / max) * H }}>
            <span className="absolute -top-5 right-0 bg-paper px-1 text-xs text-ink-3">{rotuloReferencia}</span>
          </div>
        )}
        <div className="flex h-full items-end gap-[3px] sm:gap-1.5">
          {meses.map((m, i) => (
            <button
              key={m.mes}
              type="button"
              aria-label={`${mesAno(m.mes)}: ${moeda(m.valor)}`}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              onClick={() => setAtivo(i)}
              className="group flex h-full flex-1 items-end"
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${ativo === i ? "bg-ink" : "bg-ink-2/70 group-hover:bg-ink"}`}
                style={{ height: Math.max(2, (m.valor / max) * H) }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[10px] text-ink-3 sm:gap-1.5 sm:text-[11px]">
        {meses.map((m, i) => (
          <span key={m.mes} className="flex-1 text-center">
            {i % 2 === 0 ? mesAno(m.mes).split(" ")[0] : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">Gastos por mês: {meses.map((m) => `${mesAno(m.mes)} ${moedaCurta(m.valor)}`).join("; ")}</figcaption>
    </figure>
  );
}
