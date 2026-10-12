"use client";

import type { ReactNode } from "react";

/** GET form that submits as soon as a filter changes (still works without JavaScript via the button). */
export function FormFiltros({ children, acao }: { children: ReactNode; acao: string }) {
  return (
    <form
      action={acao}
      method="get"
      onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4"
    >
      {children}
      <noscript>
        <button type="submit" className="rounded-lg bg-ink px-4 py-2 font-semibold text-paper">
          Aplicar
        </button>
      </noscript>
    </form>
  );
}

export function Seletor({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor?: string; opcoes: [string, string][] }) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm sm:flex-none">
      <span className="text-ink-3">{rotulo}</span>
      <select name={nome} defaultValue={valor ?? ""} className="rounded-lg border border-line bg-surface px-2.5 py-2 text-ink outline-none focus:border-ink">
        {opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}
