"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { data } from "@/lib/format";
import { paginar } from "@/lib/paginacao";
import type { Proposicao } from "@/lib/types";
import { Paginacao } from "./Paginacao";

const POR_PAGINA = 10;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A bill already explained on the server: plain summary, plain status and the vote that decided it. */
export type ProjetoLinha = Proposicao & {
  resumo?: string;
  /** True when the summary was written by AI from the official text */
  ia?: boolean;
  situacaoSimples?: { titulo: string; texto: string };
  votacao?: string;
};

type Grupo = "todos" | "autor" | "coautor" | "lei";

/** The bills a person presented, filterable by role, kind and text. */
export function ListaProjetos({ projetos, tipos }: { projetos: ProjetoLinha[]; tipos: Record<string, string> }) {
  const [grupo, setGrupo] = useState<Grupo>("todos");
  const [tipo, setTipo] = useState("");
  const [q, setQ] = useState("");
  const [pagina, setPagina] = useState(1);
  const temPapel = projetos.some((p) => p.papel);

  const passa = useMemo(() => {
    const t = norm(q.trim());
    return (p: ProjetoLinha, g: Grupo) =>
      (g === "todos" || (g === "lei" ? p.virouLei : p.papel === g)) &&
      (!tipo || p.tipo === tipo) &&
      (!t || norm(`${p.tipo} ${p.numero}/${p.ano} ${p.ementa} ${p.resumo ?? ""}`).includes(t));
  }, [q, tipo]);
  const lista = projetos.filter((p) => passa(p, grupo));
  const n = (g: Grupo) => projetos.filter((p) => passa(p, g)).length;
  const pg = paginar(lista, pagina, POR_PAGINA);
  const presentes = [...new Set(projetos.map((p) => p.tipo))].sort();

  const grupos: [Grupo, string][] = [
    ["todos", "Todos"],
    ...(temPapel
      ? ([
          ["autor", "Como primeiro autor"],
          ["coautor", "Como coautor"],
        ] as [Grupo, string][])
      : []),
    ["lei", "Viraram lei"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Mostrar projetos" className="flex flex-wrap gap-1.5">
          {grupos.map(([g, rotulo]) => (
            <button
              key={g}
              type="button"
              aria-pressed={grupo === g}
              onClick={() => {
                setGrupo(grupo === g ? "todos" : g);
                setPagina(1);
              }}
              className="chip min-h-10"
            >
              {rotulo} <span className="tnum font-normal">{n(g)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="relative min-w-52 flex-[2]">
          <span className="sr-only">Buscar projeto</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-3" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por assunto ou número"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        {presentes.length > 1 && (
          <label className="min-w-40 flex-1">
            <span className="sr-only">Tipo de projeto</span>
            <span className="relative block">
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setPagina(1);
                }}
                className="h-10 w-full appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 text-sm outline-none focus:border-accent"
              >
                <option value="">Todos os tipos</option>
                {presentes.map((t) => (
                  <option key={t} value={t}>
                    {tipos[t] ?? t}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-3" aria-hidden />
            </span>
          </label>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-2" aria-live="polite">
        {lista.length === projetos.length ? `${projetos.length} projetos mais recentes` : `Mostrando ${lista.length} de ${projetos.length} projetos mais recentes`}
        {pg.paginas > 1 ? ` · página ${pg.pagina} de ${pg.paginas}` : ""}
      </p>

      {lista.length === 0 ? (
        <p className="mt-3 rounded-lg bg-surface-2 px-4 py-5 text-ink-2">Nenhum projeto com esses filtros.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line cartao rounded-xl">
          {pg.itens.map((x) => (
            <li key={x.id} className="p-4">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
                <span>
                  {x.tipo} {x.numero}/{x.ano}
                  {x.data ? ` · apresentado em ${data(x.data)}` : ""}
                </span>
                {x.papel && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-xs font-semibold text-ink-2">{x.papel === "autor" ? "Primeiro autor" : "Coautor"}</span>}
                {x.virouLei && <span className="rounded bg-ok-bg px-1.5 py-0.5 text-xs font-semibold text-sim">Virou lei</span>}
              </p>
              <p className="mt-1">{x.resumo ?? x.ementa}</p>
              {x.ia && <p className="mt-0.5 text-xs text-ink-3">Em linguagem simples, feito por IA a partir do texto oficial. Ementa: {x.ementa}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
                {x.situacaoSimples && (
                  <span title={x.situacao}>
                    <b className="font-semibold">{x.situacaoSimples.titulo}.</b> {x.situacaoSimples.texto}
                  </span>
                )}
                {x.votacao && (
                  <Link href={`/votacao/${x.votacao}`} className="link">
                    Foi votado no Plenário: ver como cada um votou
                  </Link>
                )}
                {x.url && (
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="link">
                    Tramitação completa<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Paginacao pagina={pg.pagina} paginas={pg.paginas} aoIr={setPagina} rotulo="Páginas de projetos" />
      </div>
    </div>
  );
}
