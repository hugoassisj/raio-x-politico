"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARIO } from "@/lib/linguagem";

/** A jargon word with a tap-to-open plain explanation. */
export function Termo({ children, explicacao }: { children: string; explicacao: string }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fechar);
    document.addEventListener("keydown", fechar);
    return () => {
      document.removeEventListener("pointerdown", fechar);
      document.removeEventListener("keydown", fechar);
    };
  }, [aberto]);
  return (
    <span ref={ref} className="relative inline">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
        className="cursor-help underline decoration-accent decoration-dotted decoration-2 underline-offset-4 hover:text-accent-ink"
      >
        {children}
      </button>
      {aberto && (
        <span
          id={id}
          role="note"
          className="surgir absolute left-0 top-full z-30 mt-2 block w-[min(20rem,80vw)] rounded-xl border border-line bg-surface p-3 text-left text-sm font-normal leading-snug text-ink shadow-3"
        >
          <b className="block text-accent-ink">{children}</b>
          {explicacao}
        </span>
      )}
    </span>
  );
}

const PADRAO = new RegExp(GLOSSARIO.map((g) => `(${g.padrao.source})`).join("|"), "gi");

/**
 * Official text with the first occurrence of each glossary term explained on tap. The text itself
 * is never changed.
 */
export function TextoComTermos({ texto }: { texto: string }) {
  const usados = new Set<string>();
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(PADRAO)) {
    const g = GLOSSARIO.find((x) => new RegExp(`^(?:${x.padrao.source})$`, x.padrao.flags.replace("g", "")).test(m[0]));
    if (!g || usados.has(g.termo)) continue;
    usados.add(g.termo);
    partes.push(texto.slice(ultimo, m.index));
    partes.push(
      <Termo key={m.index} explicacao={g.explicacao}>
        {m[0]}
      </Termo>,
    );
    ultimo = m.index! + m[0].length;
  }
  partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}
