"use client";

import Link from "next/link";
import { useState } from "react";
import type { Citacao, ResumoIA as Resumo } from "@/lib/types";
import { data } from "@/lib/format";

const ROTULO: Record<Resumo["periodo"], string> = { dia: "Hoje", semana: "Última semana", mes: "Último mês", trimestre: "Últimos 3 meses" };

/** Citations render as numbered links to the exact public record each claim relies on. */
function Citacoes({ cs, refs }: { cs: Citacao[]; refs: Record<string, { url: string; rotulo: string }> }) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-baseline">
      {cs.map((c, i) => {
        const r = refs[c.ref];
        const titulo = r?.rotulo ?? c.ref;
        const cls = "rounded bg-surface-2 px-1.5 text-xs font-semibold text-link hover:underline";
        if (c.tipo === "voto")
          return (
            <Link key={i} href={`/votacao/${c.ref}`} className={cls} title={titulo}>
              voto
            </Link>
          );
        return r ? (
          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className={cls} title={c.trecho ? `“${c.trecho}”` : titulo}>
            fonte
          </a>
        ) : null;
      })}
    </span>
  );
}

export function ResumoIA({ resumos, refs }: { resumos: Resumo[]; refs: Record<string, { url: string; rotulo: string }> }) {
  const atuais = (["semana", "mes", "trimestre"] as const).map((p) => resumos.find((r) => r.periodo === p)).filter((r): r is Resumo => !!r);
  const [sel, setSel] = useState(0);
  const r = atuais[sel];
  const historico = resumos.filter((x) => x.periodo === "trimestre").slice(1, 6);
  if (!r) return null;
  return (
    <div className="cartao rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div role="tablist" aria-label="Período do resumo" className="flex flex-wrap gap-1.5">
          {atuais.map((a, i) => (
            <button key={a.periodo} role="tab" aria-selected={sel === i} onClick={() => setSel(i)} className={`chip ${sel === i ? "chip-ativo" : ""}`}>
              {ROTULO[a.periodo]}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          Gerado por IA ({r.modelo}) em {data(r.geradoEm.slice(0, 10))} a partir de {r.nFontes} registros públicos
        </p>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <p className="text-lg leading-relaxed">{r.resumo}</p>
        {r.temas.length > 0 && (
          <div>
            <h4 className="font-semibold">Posições por tema</h4>
            <ul className="mt-2 space-y-2">
              {r.temas.map((t, i) => (
                <li key={i} className="text-ink-2">
                  <b className="text-ink">{t.tema}:</b> {t.posicao}
                  <Citacoes cs={t.citacoes} refs={refs} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.contradicoes.length > 0 && (
          <div className="rounded-lg bg-alerta-bg p-3">
            <h4 className="font-semibold">Diz e faz: pontos que não batem</h4>
            <ul className="mt-2 space-y-2 text-ink-2">
              {r.contradicoes.map((c, i) => (
                <li key={i}>
                  {c.descricao}
                  <Citacoes cs={c.citacoes} refs={refs} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {r.mudancas.length > 0 && (
          <div>
            <h4 className="font-semibold">Mudanças de discurso</h4>
            <ul className="mt-2 space-y-2 text-ink-2">
              {r.mudancas.map((m, i) => (
                <li key={i}>
                  {m.descricao} <span className="text-xs text-ink-3">antes</span>
                  <Citacoes cs={m.antes} refs={refs} /> <span className="text-xs text-ink-3">depois</span>
                  <Citacoes cs={m.depois} refs={refs} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {historico.length > 0 && (
          <details>
            <summary className="text-sm font-semibold text-ink-2 underline decoration-dotted underline-offset-4">Resumos de períodos anteriores</summary>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-4">
              {historico.map((h) => (
                <li key={h.hash}>
                  <p className="text-sm text-ink-3">
                    {data(h.inicio)} a {data(h.fim)}
                  </p>
                  <p className="text-ink-2">{h.resumo}</p>
                </li>
              ))}
            </ol>
          </details>
        )}
        <p className="text-xs text-ink-3">
          Resumos de IA podem conter erros. Toda afirmação acima aponta para o registro original: confira antes de compartilhar. Afirmações sem fonte verificável são descartadas
          automaticamente.
        </p>
      </div>
    </div>
  );
}
