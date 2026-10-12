"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { definirUf, useUf } from "./MeuEstado";
import { MAPA_ESTADOS, MAPA_VIEWBOX } from "@/lib/mapa-br";
import { moedaCurta, numero, pct } from "@/lib/format";
import { ESTADOS } from "@/lib/ufs";

const FORMATOS = { numero, moeda: moedaCurta, pct: (n: number | undefined) => pct(n) };

export interface CamadaMapa {
  id: string;
  rotulo: string;
  /** Value per state; states without a value are drawn neutral */
  valores: Record<string, number | undefined>;
  formato: "numero" | "moeda" | "pct";
  /** One sentence telling what the color means */
  legenda: string;
}

/** Small states whose labels would collide; their names appear on hover and in the panel. */
const PEQUENOS = new Set(["DF", "SE", "AL", "PB", "RN", "PE", "ES", "RJ"]);

/** Sequential single-hue ramp (light to dark ink-blue), 5 steps. */
const RAMPA = ["#dce7f5", "#b3cbea", "#7fa6d8", "#4a7cc0", "#24559b"];

function quintil(v: number, xs: number[]) {
  const ord = [...xs].sort((a, b) => a - b);
  const pos = ord.filter((x) => x <= v).length / ord.length;
  return Math.min(4, Math.floor(pos * 5 - 1e-9));
}

/**
 * Real map of Brazil. Tap a state to open its page; switch layers to color states by a metric.
 * The panel beside the map repeats the information in text, so color is never the only channel.
 */
export function MapaBrasil({ camadas, resumoUf }: { camadas: CamadaMapa[]; resumoUf: Record<string, { senadores: number; federais: number; estaduais: number }> }) {
  const router = useRouter();
  const [camadaId, setCamadaId] = useState(camadas[0]?.id);
  const [uf, setUf] = useState<string | null>(null);
  const meu = useUf();
  const camada = camadas.find((c) => c.id === camadaId) ?? camadas[0];
  const valores = useMemo(() => Object.values(camada?.valores ?? {}).filter((v): v is number => v != null), [camada]);
  const corDe = (u: string) => {
    if (!camada || camada.id === "estados") return "var(--surface-2)";
    const v = camada.valores[u];
    return v == null ? "var(--surface-2)" : RAMPA[quintil(v, valores)];
  };
  const nome = (u: string) => ESTADOS.find((e) => e.uf === u)?.nome ?? u;
  const info = uf ? resumoUf[uf] : undefined;

  return (
    <div>
      {camadas.length > 1 && (
        <div role="tablist" aria-label="O que o mapa mostra" className="mb-3 flex flex-wrap gap-1.5">
          {camadas.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === camada.id} onClick={() => setCamadaId(c.id)} className={`chip ${c.id === camada.id ? "chip-ativo" : ""}`}>
              {c.rotulo}
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <svg viewBox={MAPA_VIEWBOX} className="h-auto w-full" role="group" aria-label="Mapa do Brasil por estado">
          {MAPA_ESTADOS.map((e) => (
            <a
              key={e.uf}
              href={`/estado/${e.uf.toLowerCase()}`}
              aria-label={`${nome(e.uf)}${camada && camada.id !== "estados" ? `: ${FORMATOS[camada.formato](camada.valores[e.uf])}` : ""}`}
              onMouseEnter={() => setUf(e.uf)}
              onFocus={() => setUf(e.uf)}
              onClick={(ev) => {
                ev.preventDefault();
                definirUf(e.uf);
                router.push(`/estado/${e.uf.toLowerCase()}`);
              }}
            >
              <path
                d={e.d}
                fill={uf === e.uf ? "var(--mark)" : corDe(e.uf)}
                stroke={meu === e.uf ? "var(--accent)" : "var(--ink-3)"}
                strokeWidth={uf === e.uf || meu === e.uf ? 2.2 : 0.7}
                strokeLinejoin="round"
                className="cursor-pointer transition-[fill] duration-150"
              />
            </a>
          ))}
          {MAPA_ESTADOS.filter((e) => !PEQUENOS.has(e.uf)).map((e) => (
            <text
              key={e.uf}
              x={e.cx}
              y={e.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="15"
              fontWeight="700"
              fill="var(--ink)"
              pointerEvents="none"
              style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}
            >
              {e.uf}
            </text>
          ))}
        </svg>
        <div aria-live="polite" className="absolute bottom-0 left-0 max-w-[44%] cartao rounded-xl/95 p-3 shadow-sm">
          {uf && info ? (
            <>
              <p className="font-display text-lg font-bold leading-tight">{nome(uf)}</p>
              {camada && camada.id !== "estados" && (
                <p className="text-sm">
                  {camada.rotulo}: <b>{FORMATOS[camada.formato](camada.valores[uf])}</b>
                </p>
              )}
              <p className="text-sm text-ink-2">
                {info.senadores} senadores · {info.federais} dep. federais · {info.estaduais} dep. {uf === "DF" ? "distritais" : "estaduais"}
              </p>
              <p className="mt-1 text-sm font-semibold text-link">Toque para ver todos</p>
            </>
          ) : (
            <p className="text-sm text-ink-2">Toque no seu estado para ver quem te representa.</p>
          )}
        </div>
      </div>
      {camada && camada.id !== "estados" && (
        <div className="mt-2 flex items-center gap-2 text-xs text-ink-3">
          <span>menor</span>
          {RAMPA.map((c) => (
            <span key={c} className="h-2.5 w-6 rounded-sm" style={{ background: c }} aria-hidden />
          ))}
          <span>maior</span>
          <span className="ml-2">{camada.legenda}</span>
        </div>
      )}
    </div>
  );
}
