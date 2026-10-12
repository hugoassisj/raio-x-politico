"use client";

import { useMemo, useState } from "react";
import { moedaCurta, numero, pct } from "@/lib/format";
import { Avatar } from "./Avatar";

type Formato = "pct" | "moeda" | "numero" | "anos";
const FMT: Record<Formato, (n: number) => string> = {
  pct: (n) => pct(n),
  moeda: (n) => moedaCurta(n),
  numero: (n) => numero(n),
  anos: (n) => `${Math.round(n)} anos`,
};

export interface Ponto {
  id: string;
  x: number;
  y: number;
  rotulo: string;
  sub?: string;
  foto?: string;
  href?: string;
  /** Bubble size (e.g. seats); default constant */
  tamanho?: number;
  /** Always-visible label (for a handful of points such as parties) */
  fixo?: boolean;
}

const W = 1000;
const H = 540;
const M = { t: 24, r: 24, b: 64, l: 112 };

/** Round tick values (1, 2, 2.5 or 5 times a power of ten) covering [a, b]. */
function ticksRedondos(a: number, b: number, alvo = 5): number[] {
  const bruto = (b - a) / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((x) => x >= bruto) ?? 10 * pot;
  const out: number[] = [];
  for (let v = Math.ceil(a / passo) * passo; v <= b + passo * 1e-9; v += passo) out.push(Number(v.toPrecision(12)));
  return out;
}

/** Axis domain with a little padding; percentages never go past 0% or 100%. */
function dominio(vals: number[], formato: Formato): [number, number] {
  const [v0, v1] = [Math.min(...vals), Math.max(...vals)];
  const pad = (v1 - v0) * 0.06 || 1;
  let [a, b] = [v0 - pad, v1 + pad];
  if (formato === "pct") [a, b] = [Math.max(0, a), Math.min(1, b)];
  if (formato !== "pct" && v0 >= 0) a = Math.max(0, a);
  return [a, b];
}

/** Scatter/bubble chart with hover readout. One series, so no legend; axes carry the meaning. */
export function Dispersao({
  pontos,
  eixoX,
  eixoY,
  titulo,
}: {
  pontos: Ponto[];
  eixoX: { rotulo: string; formato: Formato };
  eixoY: { rotulo: string; formato: Formato };
  titulo: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const { sx, sy, ticksX, ticksY, raio, rotulos } = useMemo(() => {
    const [ax, bx] = dominio(
      pontos.map((p) => p.x),
      eixoX.formato,
    );
    const [ay, by] = dominio(
      pontos.map((p) => p.y),
      eixoY.formato,
    );
    const sx = (v: number) => M.l + ((v - ax) / (bx - ax)) * (W - M.l - M.r);
    const sy = (v: number) => H - M.b - ((v - ay) / (by - ay)) * (H - M.t - M.b);
    const maxT = Math.max(...pontos.map((p) => p.tamanho ?? 0), 1);
    const raio = (p: Ponto) => (p.tamanho ? 8 + Math.sqrt(p.tamanho / maxT) * 34 : 6);
    // Fixed labels: biggest bubbles first; each label takes the first free spot (inside, above, below)
    // and is dropped when all collide. The hover readout still names every point.
    const rotulos = new Map<string, { x: number; y: number }>();
    const ocupados: { x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const p of [...pontos].filter((p) => p.fixo).sort((a, b) => (b.tamanho ?? 0) - (a.tamanho ?? 0))) {
      const [cx, cy, r] = [sx(p.x), sy(p.y), raio(p)];
      const meia = p.rotulo.length * 4.6 + 2;
      const opcoes = [...(r >= 22 && meia <= r * 1.6 ? [cy] : []), cy - r - 10, cy + r + 12];
      const livre = opcoes.find((y) => !ocupados.some((o) => cx - meia < o.x1 && cx + meia > o.x0 && y - 9 < o.y1 && y + 9 > o.y0));
      if (livre === undefined) continue;
      ocupados.push({ x0: cx - meia, x1: cx + meia, y0: livre - 9, y1: livre + 9 });
      rotulos.set(p.id, { x: cx, y: livre });
    }
    return { sx, sy, ticksX: ticksRedondos(ax, bx), ticksY: ticksRedondos(ay, by), raio, rotulos };
  }, [pontos, eixoX.formato, eixoY.formato]);
  const sel = pontos.find((p) => p.id === ativo);

  return (
    <figure>
      <div className="mb-2 min-h-12" aria-live="polite">
        {sel ? (
          <div className="flex items-center gap-3">
            {sel.foto !== undefined && <Avatar src={sel.foto} nome={sel.rotulo} size={36} />}
            <p className="text-sm">
              <b>{sel.rotulo}</b>
              {sel.sub ? <span className="text-ink-3"> · {sel.sub}</span> : null}
              <span className="block text-ink-2">
                {eixoX.rotulo}: <b>{FMT[eixoX.formato](sel.x)}</b> · {eixoY.rotulo}: <b>{FMT[eixoY.formato](sel.y)}</b>
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Passe o dedo ou o mouse sobre um ponto para ver quem é.</p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={titulo}>
        {ticksY.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" />
            <text x={M.l - 10} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize="15" fill="var(--ink-3)">
              {FMT[eixoY.formato](t)}
            </text>
          </g>
        ))}
        {ticksX.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={H - M.b + 24} textAnchor="middle" fontSize="15" fill="var(--ink-3)">
            {FMT[eixoX.formato](t)}
          </text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 10} textAnchor="middle" fontSize="16" fill="var(--ink-2)" fontWeight="600">
          {eixoX.rotulo}
        </text>
        <text x={18} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize="16" fill="var(--ink-2)" fontWeight="600" transform={`rotate(-90 18 ${(M.t + H - M.b) / 2})`}>
          {eixoY.rotulo}
        </text>
        {pontos.map((p) => {
          const c = (
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={raio(p)}
              fill={p.id === ativo ? "var(--mark)" : "var(--ink-2)"}
              fillOpacity={p.tamanho ? 0.35 : 0.55}
              stroke={p.id === ativo ? "var(--ink)" : "var(--surface)"}
              strokeWidth={p.id === ativo ? 2 : 1}
              onMouseEnter={() => setAtivo(p.id)}
              onMouseLeave={() => setAtivo(null)}
              onFocus={() => setAtivo(p.id)}
            />
          );
          return (
            <g key={p.id}>
              {p.href ? (
                <a href={p.href} aria-label={`${p.rotulo}: ${FMT[eixoX.formato](p.x)}, ${FMT[eixoY.formato](p.y)}`}>
                  {c}
                </a>
              ) : (
                c
              )}
            </g>
          );
        })}
        {pontos.map((p) => {
          const r = rotulos.get(p.id);
          return r ? (
            <text key={`r${p.id}`} x={r.x} y={r.y} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="var(--ink)" pointerEvents="none">
              {p.rotulo}
            </text>
          ) : null;
        })}
      </svg>
    </figure>
  );
}
