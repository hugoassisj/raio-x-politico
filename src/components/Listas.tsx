import { BandeiraUf } from "./Bandeira";
import { SiglaPartido } from "./Partido";
import Link from "next/link";
import type { PoliticoResumo, VotacaoResumo } from "@/lib/types";
import { data, partesDescricao } from "@/lib/format";
import { regraDaVotacao } from "@/lib/quorum";
import { explicarEtapa } from "@/lib/linguagem";
import { assunto } from "@/lib/assuntos";
import type { ProjetoVotado } from "@/lib/projetos";
import type { CSSProperties } from "react";
import { IconeAssunto } from "./Icone";
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
          {cargoDe(p)} · <SiglaPartido sigla={p.partido} /> · <BandeiraUf uf={p.uf} altura={11} /> {p.uf}
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
      <div className={`crescer-x flex gap-[2px] overflow-hidden rounded-full ${alto ? "h-3.5" : "h-2.5"}`} aria-hidden>
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

/** One roll call: what was decided at this step, the bill it belongs to and the count. */
export function CartaoVotacao({ v, resumo, i = 0 }: { v: VotacaoResumo; resumo?: string; i?: number }) {
  // Kind of bill from its acronym; the step's own rule (e.g. a request) is explained inside the page
  const regra = regraDaVotacao(v.titulo);
  const { ementa, procedimento } = partesDescricao(v.descricao);
  const etapa = explicarEtapa(procedimento, v.objeto);
  return (
    <Link href={`/votacao/${v.id}`} className="cartao surgir group flex flex-col p-5" style={{ "--i": i } as CSSProperties}>
      <div className="flex items-center justify-between gap-3 text-sm text-ink-3">
        <span>
          {v.casa === "camara" ? "Câmara" : "Senado"} · {data(v.data)}
        </span>
        <Resultado r={v.resultado} />
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug">
        <span className="group-hover:underline">{v.titulo}</span>
        {regra && <span className="ml-2 text-sm font-semibold text-ink-3">{regra.nome}</span>}
      </h3>
      {etapa && (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent-ink">
          {etapa.titulo}
          {etapa.tipo === "procedimento" && <span className="font-normal text-ink-3">(sobre o andamento)</span>}
        </p>
      )}
      <p className="mt-1.5 line-clamp-3 text-ink-2">{resumo ?? ementa}</p>
      <div className="mt-auto pt-4">
        <BarraVotos sim={v.sim} nao={v.nao} outros={v.outros} />
      </div>
    </Link>
  );
}

export function Resultado({ r }: { r?: string }) {
  if (!r) return null;
  return <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${r === "Aprovada" ? "bg-sim-soft text-sim" : "bg-nao-soft text-nao"}`}>{r}</span>;
}

/**
 * A bill and everything voted on it, summarized: what it is about in plain words and what
 * happened to its main text. The most useful unit for people who think in bills, not roll calls.
 */
export function CartaoProjeto({ p, i = 0 }: { p: ProjetoVotado; i?: number }) {
  const v = p.principal;
  const regra = regraDaVotacao(p.sigla);
  const etapa = explicarEtapa(partesDescricao(v.descricao).procedimento, v.objeto);
  const outras = p.votacoes.length - 1;
  return (
    <Link href={`/votacao/${v.id}`} className="cartao surgir group flex flex-col p-5" style={{ "--i": i } as CSSProperties}>
      <div className="flex items-center justify-between gap-3 text-sm text-ink-3">
        <span className="flex items-center gap-2">
          {p.casa === "camara" ? "Câmara" : "Senado"} · {data(p.ultimaData)}
          {p.assuntos.map((a) => {
            const s = assunto(a);
            return s ? <IconeAssunto key={a} nome={s.icone} className="h-4 w-4 text-accent" /> : null;
          })}
        </span>
        <Resultado r={v.resultado} />
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug">
        <span className="group-hover:underline">{p.sigla}</span>
        {regra && <span className="ml-2 text-sm font-semibold text-ink-3">{regra.nome}</span>}
      </h3>
      <p className="mt-1.5 line-clamp-4 text-ink">{p.explicacao?.resumo ?? p.materia?.explicacao ?? p.ementa}</p>
      {p.explicacao && <p className="mt-1 text-xs text-ink-3">Em linguagem simples, feito por IA a partir do texto oficial</p>}
      <div className="mt-auto pt-4">
        {etapa && <p className="mb-1.5 text-sm font-semibold text-ink-2">{etapa.titulo}</p>}
        <BarraVotos sim={v.sim} nao={v.nao} outros={v.outros} />
        {outras > 0 && (
          <p className="mt-2 text-xs text-ink-3">
            + {outras} {outras === 1 ? "outra votação" : "outras votações"} deste projeto
          </p>
        )}
      </div>
    </Link>
  );
}
