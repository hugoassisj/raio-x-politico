"use client";

import type { ReactNode } from "react";

/** GET form: menus apply as soon as they change; text applies on Enter or the button (works without JavaScript). */
export function FormFiltros({ children, acao }: { children: ReactNode; acao: string }) {
  return (
    <form
      action={acao}
      method="get"
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") (e.currentTarget as HTMLFormElement).requestSubmit();
      }}
      className="cartao flex flex-wrap items-end gap-3 p-3 sm:p-4"
    >
      {children}
      <button type="submit" className="botao">
        Aplicar
      </button>
    </form>
  );
}

export function Seletor({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor?: string; opcoes: [string, string][] }) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm sm:flex-none">
      <span className="text-ink-3">{rotulo}</span>
      <select name={nome} defaultValue={valor ?? ""} className="rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-ink outline-none focus:border-accent">
        {opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}
