"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Avatar } from "./Avatar";

/** [id, nome, nomeCivil, partido, uf, cargo, foto] */
export type ItemIndice = [string, string, string, string, string, string, string];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let indiceCache: Promise<ItemIndice[]> | undefined;
function carregarIndice() {
  indiceCache ??= fetch("/api/indice")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return indiceCache;
}

export function filtrar(indice: ItemIndice[], q: string, limite = 8): ItemIndice[] {
  const termos = norm(q).trim().split(/\s+/).filter(Boolean);
  if (!termos.length) return [];
  const pontuados: [number, ItemIndice][] = [];
  for (const it of indice) {
    const nome = norm(it[1]);
    const civil = norm(it[2]);
    const tags = `${norm(it[3])} ${norm(it[4])}`;
    let score = 0;
    let ok = true;
    for (const t of termos) {
      if (nome.startsWith(t)) score += 4;
      else if (nome.includes(` ${t}`)) score += 3;
      else if (nome.includes(t) || civil.includes(t)) score += 1.5;
      else if (tags.split(" ").includes(t)) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (ok) pontuados.push([score, it]);
  }
  return pontuados
    .sort((a, b) => b[0] - a[0] || a[1][1].localeCompare(b[1][1]))
    .slice(0, limite)
    .map((x) => x[1]);
}

export function Busca({ grande = false, autoFocus = false }: { grande?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<ItemIndice[]>([]);
  const [ativo, setAtivo] = useState(0);
  const [aberto, setAberto] = useState(false);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q && !indice.length) carregarIndice().then(setIndice);
  }, [q, indice.length]);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const res = useMemo(() => filtrar(indice, q), [indice, q]);
  const ir = (id: string) => {
    setAberto(false);
    setQ("");
    router.push(`/politico/${id}`);
  };

  return (
    <div ref={ref} className="relative w-full">
      <label htmlFor={`${listId}-in`} className="sr-only">
        Buscar político por nome, partido ou estado
      </label>
      <div className={`flex items-center gap-2 rounded-xl border-2 border-ink/80 bg-surface ${grande ? "px-4 py-3" : "px-3 py-1.5"}`}>
        <svg aria-hidden viewBox="0 0 20 20" className={grande ? "h-6 w-6 text-ink-2" : "h-4 w-4 text-ink-3"} fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-in`}
          role="combobox"
          aria-expanded={aberto && res.length > 0}
          aria-controls={listId}
          aria-activedescendant={res[ativo] ? `${listId}-${res[ativo][0]}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={q}
          placeholder={grande ? "Digite um nome, partido ou estado" : "Buscar"}
          onChange={(e) => {
            setQ(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAtivo((a) => Math.min(a + 1, res.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAtivo((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && res[ativo]) {
              e.preventDefault();
              ir(res[ativo][0]);
            } else if (e.key === "Escape") setAberto(false);
          }}
          className={`w-full bg-transparent outline-none placeholder:text-ink-3 ${grande ? "text-lg sm:text-xl" : "text-base"}`}
        />
      </div>
      {aberto && q.trim() && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-2 max-h-[70vh] w-full overflow-auto cartao rounded-xl p-1 shadow-lg">
          {res.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">{indice.length ? "Ninguém encontrado com esse nome." : "Carregando…"}</li>}
          {res.map((it, i) => (
            <li
              key={it[0]}
              id={`${listId}-${it[0]}`}
              role="option"
              aria-selected={i === ativo}
              onMouseEnter={() => setAtivo(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                ir(it[0]);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${i === ativo ? "bg-surface-2" : ""}`}
            >
              <Avatar src={it[6] || undefined} nome={it[1]} size={32} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{it[1]}</span>
                <span className="block truncate text-sm text-ink-3">
                  {it[5]} · {it[3]}-{it[4]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
