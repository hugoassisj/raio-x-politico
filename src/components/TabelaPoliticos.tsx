import Link from "next/link";
import type { PoliticoResumo } from "@/lib/types";
import { moedaCurta, numero, pct } from "@/lib/format";
import type { ChaveMetrica } from "@/lib/metricas";
import { metrica } from "@/lib/metricas";
import { Avatar } from "./Avatar";
import { cargoDe } from "./Listas";

const COLUNAS: { k: ChaveMetrica; r: string; f: (n?: number) => string }[] = [
  { k: "presenca", r: "Presença", f: pct },
  { k: "participacao", r: "Votações", f: pct },
  { k: "fidelidade", r: "Segue o partido", f: pct },
  { k: "gasto12m", r: "Gastos 12 meses", f: moedaCurta },
  { k: "proposicoes", r: "Projetos", f: numero },
];

/** Dense, scannable table on desktop; one card per person on phones, led by the sorted metric. */
export function TabelaPoliticos({ itens, destaque, linkOrdem }: { itens: PoliticoResumo[]; destaque?: ChaveMetrica; linkOrdem?: (k: ChaveMetrica) => string }) {
  const def = destaque ? metrica(destaque) : undefined;
  return (
    <>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface md:hidden">
        {itens.map((p) => (
          <li key={p.id}>
            <Link href={`/politico/${p.id}`} className="flex items-center gap-3 px-3 py-3">
              <Avatar src={p.foto} nome={p.nome} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.nome}</span>
                <span className="block truncate text-sm text-ink-3">
                  {cargoDe(p)} · {p.partido}-{p.uf}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="figure block text-lg font-semibold">{def ? def.formato(p.m[def.chave]) : pct(p.m.presenca)}</span>
                <span className="block text-xs text-ink-3">{def ? def.titulo : "Presença"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-3">
              <th className="px-4 py-3 font-normal">Nome</th>
              {COLUNAS.map((c) => (
                <th key={c.k} className={`px-3 py-3 text-right font-normal ${destaque === c.k ? "text-ink" : ""}`}>
                  {linkOrdem ? (
                    <Link href={linkOrdem(c.k)} className="hover:underline">
                      {c.r}
                    </Link>
                  ) : (
                    c.r
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2/60">
                <td className="px-4 py-2.5">
                  <Link href={`/politico/${p.id}`} className="flex items-center gap-3">
                    <Avatar src={p.foto} nome={p.nome} size={32} />
                    <span className="min-w-0">
                      <span className="block font-semibold hover:underline">{p.nome}</span>
                      <span className="block text-ink-3">
                        {cargoDe(p)} · {p.partido}-{p.uf}
                      </span>
                    </span>
                  </Link>
                </td>
                {COLUNAS.map((c) => (
                  <td key={c.k} className={`tnum px-3 py-2.5 text-right ${destaque === c.k ? "font-semibold" : "text-ink-2"}`}>
                    {c.f(p.m[c.k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
