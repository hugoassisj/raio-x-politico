"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VotoItem } from "@/lib/types";
import { data, partesDescricao } from "@/lib/format";
import { explicarEtapa } from "@/lib/linguagem";
import { VotoChip } from "./ui";

const canon = (s?: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const posicional = (s?: string) => /^(sim|nao|abstencao|obstrucao)$/.test(canon(s));

type Filtro = "todos" | "contra" | "governo" | "ausente";

export function ListaVotos({ votos, mostrarGoverno }: { votos: VotoItem[]; mostrarGoverno: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(25);

  const contagem = useMemo(() => {
    const contra = votos.filter((v) => posicional(v.voto) && posicional(v.orientacaoPartido) && canon(v.voto) !== canon(v.orientacaoPartido)).length;
    const governo = votos.filter((v) => posicional(v.voto) && posicional(v.orientacaoGoverno) && canon(v.voto) !== canon(v.orientacaoGoverno)).length;
    const ausente = votos.filter((v) => canon(v.voto) === "ausente").length;
    return { todos: votos.length, contra, governo, ausente };
  }, [votos]);

  const lista = useMemo(() => {
    const t = canon(q.trim());
    return votos.filter((v) => {
      if (filtro === "contra" && !(posicional(v.voto) && posicional(v.orientacaoPartido) && canon(v.voto) !== canon(v.orientacaoPartido))) return false;
      if (filtro === "governo" && !(posicional(v.voto) && posicional(v.orientacaoGoverno) && canon(v.voto) !== canon(v.orientacaoGoverno))) return false;
      if (filtro === "ausente" && canon(v.voto) !== "ausente") return false;
      return !t || canon(`${v.titulo} ${v.descricao}`).includes(t);
    });
  }, [votos, filtro, q]);

  const abas: [Filtro, string][] = [
    ["todos", "Todos"],
    ["contra", "Contra o partido"],
    ...(mostrarGoverno ? ([["governo", "Contra o governo"]] as [Filtro, string][]) : []),
    ["ausente", "Ausências"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filtrar votos" className="flex flex-wrap gap-1.5">
          {abas.map(([k, rotulo]) => (
            <button
              key={k}
              role="tab"
              aria-selected={filtro === k}
              onClick={() => {
                setFiltro(k);
                setLimite(25);
              }}
              className={`chip ${filtro === k ? "chip-ativo" : ""}`}
            >
              {rotulo} <span className="tnum opacity-70">{contagem[k]}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto w-full sm:w-64">
          <span className="sr-only">Buscar votação por assunto</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por assunto"
            className="w-full rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-ink"
          />
        </label>
      </div>

      {lista.length === 0 ? (
        <p className="mt-4 rounded-lg bg-surface-2 px-4 py-5 text-ink-2">Nenhuma votação com esse filtro.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {lista.slice(0, limite).map((v) => {
            const contraPartido = posicional(v.voto) && posicional(v.orientacaoPartido) && canon(v.voto) !== canon(v.orientacaoPartido);
            return (
              <li key={v.votacaoId} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6">
                <div className="min-w-0">
                  <p className="text-sm text-ink-3">
                    {data(v.data)}
                    {v.resultado ? ` · ${v.resultado}` : ""}
                  </p>
                  <Link href={`/votacao/${v.votacaoId}`} className="font-semibold hover:underline">
                    {v.titulo}
                  </Link>
                  {v.descricao && <Descricao texto={v.descricao} objeto={v.objeto} />}
                </div>
                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:grid sm:grid-cols-[auto_auto] sm:justify-end sm:gap-x-3">
                  <div className="flex items-center gap-1.5 sm:contents">
                    <dt className="text-ink-3">Votou</dt>
                    <dd>
                      <VotoChip voto={v.voto} />
                    </dd>
                  </div>
                  {v.orientacaoPartido && (
                    <div className="flex items-center gap-1.5 sm:contents">
                      <dt className="text-ink-3">Partido</dt>
                      <dd className={contraPartido ? "font-semibold" : "text-ink-2"}>
                        {v.orientacaoPartido}
                        {contraPartido && <span className="ml-1 text-xs text-nao">(votou diferente)</span>}
                      </dd>
                    </div>
                  )}
                  {mostrarGoverno && v.orientacaoGoverno && (
                    <div className="flex items-center gap-1.5 sm:contents">
                      <dt className="text-ink-3">Governo</dt>
                      <dd className="text-ink-2">{v.orientacaoGoverno}</dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      {lista.length > limite && (
        <button onClick={() => setLimite((l) => l + 50)} className="mt-3 w-full rounded-lg border border-line bg-surface py-2.5 text-sm font-semibold hover:border-ink-3">
          Mostrar mais ({lista.length - limite} restantes)
        </button>
      )}
    </div>
  );
}

function Descricao({ texto, objeto }: { texto: string; objeto?: string }) {
  const { ementa, procedimento } = partesDescricao(texto);
  const etapa = explicarEtapa(procedimento, objeto);
  const oficial = procedimento.replace(/\s*Sim:.*$/s, "").trim();
  return (
    <>
      <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{ementa}</p>
      {etapa ? (
        <p className="mt-1 text-xs">
          <span className="font-semibold text-accent-ink">{etapa.titulo}</span>
          {etapa.tipo === "procedimento" && <span className="text-ink-3"> · sobre o andamento, não sobre o conteúdo</span>}
          {etapa.sim && <span className="block text-ink-3">{etapa.sim}</span>}
        </p>
      ) : (
        oficial && <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">Nesta etapa: {oficial}</p>
      )}
    </>
  );
}
