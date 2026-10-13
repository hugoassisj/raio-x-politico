import type { ReactNode } from "react";
import { BandeiraUf } from "./Bandeira";
import { SiglaPartido } from "./Partido";
import Link from "next/link";
import type { PoliticoResumo } from "@/lib/types";
import { Avatar } from "./Avatar";

/** Grid of portraits: people recognize faces before names. */
export function GradeRostos({ membros, detalhe, grande = false }: { membros: PoliticoResumo[]; detalhe?: (p: PoliticoResumo) => ReactNode; grande?: boolean }) {
  return (
    <ul className={`grid gap-3 ${grande ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"}`}>
      {membros.map((m) => (
        <li key={m.id}>
          <Link href={`/politico/${m.id}`} className="group flex h-full flex-col items-center rounded-xl p-2 text-center transition-colors hover:bg-surface-2">
            <Avatar src={m.foto} nome={m.nome} size={grande ? 112 : 76} className="shadow-sm" />
            <span className="mt-2 line-clamp-2 text-sm font-semibold leading-tight group-hover:underline">{m.nome}</span>
            <span className="text-xs text-ink-3">
              {detalhe ? (
                detalhe(m)
              ) : (
                <>
                  <SiglaPartido sigla={m.partido} /> · <BandeiraUf uf={m.uf} altura={10} /> {m.uf}
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
