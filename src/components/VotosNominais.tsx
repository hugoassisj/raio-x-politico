"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VotacaoDetalhe } from "@/lib/types";
import { VotoChip } from "./ui";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const INICIAL = 30;

/** Every individual vote, searchable by name, party or state. */
export function VotosNominais({ votos, conhecidos }: { votos: VotacaoDetalhe["votos"]; conhecidos: string[] }) {
  const [q, setQ] = useState("");
  const [voto, setVoto] = useState("");
  const [todos, setTodos] = useState(false);
  const ids = useMemo(() => new Set(conhecidos), [conhecidos]);
  const tipos = useMemo(() => [...new Set(votos.map((v) => v.voto))].sort(), [votos]);
  const lista = useMemo(() => {
    const t = norm(q.trim());
    return votos.filter((v) => (!voto || v.voto === voto) && (!t || norm(`${v.nome} ${v.partido} ${v.uf}`).includes(t))).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [votos, q, voto]);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">Buscar por nome, partido ou estado</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, partido ou estado"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-ink"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por voto</span>
          <select value={voto} onChange={(e) => setVoto(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-ink">
            <option value="">Todos os votos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-sm text-ink-3">{lista.length} votos</p>
      <ul className="mt-2 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {(todos || q ? lista : lista.slice(0, INICIAL)).map((v) => (
          <li key={v.pid} className="flex items-center justify-between gap-3 border-b border-line py-2">
            <span className="min-w-0">
              {ids.has(v.pid) ? (
                <Link href={`/politico/${v.pid}`} className="block truncate font-semibold hover:underline">
                  {v.nome}
                </Link>
              ) : (
                <span className="block truncate font-semibold">{v.nome}</span>
              )}
              <span className="block text-sm text-ink-3">
                {v.partido}-{v.uf}
              </span>
            </span>
            <VotoChip voto={v.voto} compacto />
          </li>
        ))}
      </ul>
      {!todos && !q && lista.length > INICIAL && (
        <button type="button" onClick={() => setTodos(true)} className="mt-5 rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
          Mostrar todos os {lista.length} votos
        </button>
      )}
    </div>
  );
}
