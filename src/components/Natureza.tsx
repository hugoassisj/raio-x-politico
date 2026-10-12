import { Calculator, Landmark, Link2, Sparkles } from "lucide-react";
import { NATUREZAS, type Natureza } from "@/lib/linguagem";

const ICONE = { oficial: Landmark, calculo: Calculator, ligacao: Link2, ia: Sparkles } as const;

/** Small mark saying what kind of information follows: official record, calculation, link or AI. */
export function SeloNatureza({ tipo, className = "" }: { tipo: Natureza; className?: string }) {
  const I = ICONE[tipo];
  const n = NATUREZAS[tipo];
  return (
    <span
      title={n.explicacao}
      className={`inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-ink-2 ring-1 ring-inset ring-line ${className}`}
    >
      <I className="h-3.5 w-3.5" aria-hidden />
      {n.rotulo}
      <span className="sr-only">: {n.explicacao}</span>
    </span>
  );
}
