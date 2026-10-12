"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { filtrar, type ItemIndice } from "./Busca";

/** Adds a person to the comparison by updating ?ids= (max 4). */
export function SeletorComparar({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [indice, setIndice] = useState<ItemIndice[]>([]);
  useEffect(() => {
    if (q && !indice.length)
      fetch("/api/indice")
        .then((r) => r.json())
        .then(setIndice)
        .catch(() => setIndice([]));
  }, [q, indice.length]);
  const res = useMemo(() => filtrar(indice, q, 6).filter((i) => !ids.includes(i[0])), [indice, q, ids]);
  if (ids.length >= 4) return <p className="text-sm text-ink-3">Você pode comparar até 4 pessoas. Remova alguém para adicionar outra.</p>;
  return (
    <div className="relative max-w-md">
      <label className="block text-sm text-ink-3" htmlFor="comparar-busca">
        Adicionar pessoa à comparação
      </label>
      <input
        id="comparar-busca"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Digite um nome"
        autoComplete="off"
        className="mt-1 w-full rounded-lg border-2 border-ink/80 bg-surface px-3 py-2 outline-none"
      />
      {q && res.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full cartao rounded-xl p-1 shadow-lg">
          {res.map((it) => (
            <li key={it[0]}>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  router.push(`/comparar?ids=${[...ids, it[0]].join(",")}`);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
              >
                <Avatar src={it[6] || undefined} nome={it[1]} size={28} />
                <span>
                  <span className="block font-semibold">{it[1]}</span>
                  <span className="block text-sm text-ink-3">
                    {it[5]} · {it[3]}-{it[4]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
