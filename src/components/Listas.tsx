import Link from "next/link";
import type { PoliticoResumo, VotacaoResumo } from "@/lib/types";
import { data, partesDescricao } from "@/lib/format";
import { regraDaVotacao, votosNecessarios } from "@/lib/quorum";
import { Avatar } from "./Avatar";

/** Gendered job titles: [masculine, feminine, unknown] */
const CARGOS: Record<string, [string, string, string]> = {
  "Deputado(a) Federal": ["Deputado federal", "Deputada federal", "Deputado(a) federal"],
  "Senador(a)": ["Senador", "Senadora", "Senador(a)"],
  "Deputado(a) Estadual": ["Deputado estadual", "Deputada estadual", "Deputado(a) estadual"],
  "Deputado(a) Distrital": ["Deputado distrital", "Deputada distrital", "Deputado(a) distrital"],
};

export function cargoDe(p: Pick<PoliticoResumo, "cargo" | "sexo">) {
  const c = CARGOS[p.cargo];
  if (!c) return p.cargo;
  return p.sexo === "M" ? c[0] : p.sexo === "F" ? c[1] : c[2];
}

/** Compact person row used across lists and rankings. */
export function LinhaPolitico({ p, valor, detalhe }: { p: PoliticoResumo; valor?: string; detalhe?: string }) {
  return (
    <Link href={`/politico/${p.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
      <Avatar src={p.foto} nome={p.nome} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold group-hover:underline">{p.nome}</span>
        <span className="block truncate text-sm text-ink-3">
          {cargoDe(p)} · {p.partido}-{p.uf}
          {detalhe ? ` · ${detalhe}` : ""}
        </span>
      </span>
      {valor && <span className="figure shrink-0 text-lg font-semibold">{valor}</span>}
    </Link>
  );
}

/** Yes/No/Other bar with text totals: the result of a roll-call vote at a glance. */
export function BarraVotos({ sim, nao, outros, alto = false }: { sim: number; nao: number; outros: number; alto?: boolean }) {
  const t = Math.max(1, sim + nao + outros);
  const seg = (n: number, cor: string) => (n > 0 ? <div className={cor} style={{ width: `${(n / t) * 100}%` }} /> : null);
  return (
    <div>
      <div className={`flex gap-[2px] overflow-hidden rounded-full ${alto ? "h-3.5" : "h-2.5"}`} aria-hidden>
        {seg(sim, "bg-sim")}
        {seg(nao, "bg-nao")}
        {seg(outros, "bg-abst")}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm tnum">
        <span>
          <b className="text-sim">Sim</b> {sim}
        </span>
        <span>
          <b className="text-nao">Não</b> {nao}
        </span>
        {outros > 0 && (
          <span>
            <b className="text-abst">Outros</b> {outros}
          </span>
        )}
      </p>
    </div>
  );
}

/** The bill summary comes first in our descriptions; the procedural text after " | ". */
export function CartaoVotacao({ v }: { v: VotacaoResumo }) {
  const regra = regraDaVotacao(v.titulo, v.descricao);
  const casa = v.casa === "senado" ? "senado" : "camara";
  const { ementa } = partesDescricao(v.descricao);
  return (
    <Link href={`/votacao/${v.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink-3">
      <div className="flex items-center justify-between gap-3 text-sm text-ink-3">
        <span>
          {v.casa === "camara" ? "Câmara" : "Senado"} · {data(v.data)}
        </span>
        {v.resultado && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${v.resultado === "Aprovada" ? "bg-ok-bg text-sim" : "bg-alerta-bg text-nao"}`}>{v.resultado}</span>
        )}
      </div>
      {regra && <p className="mt-3 text-sm font-semibold text-ink-2">{regra.nome}</p>}
      <h3 className="mt-0.5 text-lg font-bold leading-snug group-hover:underline">{v.titulo}</h3>
      <p className="mt-1 line-clamp-3 text-ink-2">{ementa}</p>
      <div className="mt-auto pt-4">
        <BarraVotos sim={v.sim} nao={v.nao} outros={v.outros} />
        {regra && (
          <p className="mt-2 text-xs text-ink-3">Para aprovar: {regra.exigencia === "simples" ? "mais Sim do que Não" : `${votosNecessarios(regra.exigencia, casa)} votos Sim`}</p>
        )}
      </div>
    </Link>
  );
}
