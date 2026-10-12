import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PERGUNTAS } from "@/lib/perguntas";
import { IconePergunta } from "./Icone";

/** The questions the site answers, each one a door into the page that answers it. */
export function GradePerguntas({ limite, comResposta = false }: { limite?: number; comResposta?: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PERGUNTAS.slice(0, limite).map((q, i) => (
        <li key={q.pergunta} className="surgir" style={{ "--i": i } as CSSProperties}>
          <Link href={q.href} className="cartao group flex h-full items-start gap-3 p-4">
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <IconePergunta nome={q.icone} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-2 font-bold leading-snug">
                {q.pergunta}
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
              </span>
              {comResposta && <span className="mt-1 block text-sm text-ink-2">{q.resposta}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
