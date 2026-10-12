"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Native share sheet on phones (WhatsApp is how most people pass things on); copy link elsewhere. */
export function Compartilhar({ titulo, texto }: { titulo: string; texto?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: texto, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      /* the visitor closed the share sheet */
    }
  }
  return (
    <button type="button" onClick={compartilhar} className="botao-sec">
      {copiado ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {copiado ? "Link copiado" : "Compartilhar"}
    </button>
  );
}
