"use client";

import { Uf } from "./Bandeira";
import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { definirUf, useUf } from "./MeuEstado";

/** Returning visitors: one tap back to their own representatives. */
export function AtalhoEstado({ resumoUf }: { resumoUf: Record<string, { senadores: number; federais: number; estaduais: number }> }) {
  const uf = useUf();
  if (!uf) return null;
  const r = resumoUf[uf];
  return (
    <div className="surgir mt-6 flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border border-accent bg-accent-soft p-4">
      <MapPin className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1">
        <b>
          Seu estado: <Uf uf={uf} altura={13} nome />
        </b>
        {r && (
          <span className="block text-sm text-ink-2">
            {r.senadores} senadores, {r.federais} deputados federais e {r.estaduais} estaduais
          </span>
        )}
      </p>
      <Link href={`/estado/${uf.toLowerCase()}`} className="botao">
        Ver quem são <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      <button type="button" onClick={() => definirUf("")} className="text-sm text-ink-3 underline underline-offset-2 hover:text-ink">
        Trocar
      </button>
    </div>
  );
}
