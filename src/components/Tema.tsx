"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { CHAVE_TEMA as CHAVE } from "@/lib/tema";

type Tema = "sistema" | "claro" | "escuro";
const EVENTO = "tema-mudou";
const ORDEM: Tema[] = ["sistema", "claro", "escuro"];
const ROTULO: Record<Tema, string> = { sistema: "igual ao aparelho", claro: "claro", escuro: "escuro" };

function aplicar(t: Tema) {
  const html = document.documentElement;
  if (t === "sistema") delete html.dataset.theme;
  else html.dataset.theme = t === "claro" ? "light" : "dark";
  window.dispatchEvent(new Event(EVENTO));
  try {
    if (t === "sistema") localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, t);
  } catch {
    // Private windows may block storage; the choice still applies to this visit
  }
}

const lerTema = (): Tema => {
  const d = document.documentElement.dataset.theme;
  return d === "light" ? "claro" : d === "dark" ? "escuro" : "sistema";
};
const assinar = (aviso: () => void) => {
  window.addEventListener(EVENTO, aviso);
  return () => window.removeEventListener(EVENTO, aviso);
};

/** Light, dark or follow the device. One button that cycles, with its state spoken. */
export function BotaoTema() {
  // null on the server: the saved theme is only known in the browser
  const tema = useSyncExternalStore(assinar, lerTema, () => null);
  const proximo = ORDEM[(ORDEM.indexOf(tema ?? "sistema") + 1) % ORDEM.length];
  const Icone = tema === "claro" ? Sun : tema === "escuro" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => aplicar(proximo)}
      aria-label={`Tema ${ROTULO[tema ?? "sistema"]}. Trocar para ${ROTULO[proximo]}`}
      title={`Tema ${ROTULO[tema ?? "sistema"]}`}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      <Icone className="h-5 w-5" aria-hidden />
    </button>
  );
}
