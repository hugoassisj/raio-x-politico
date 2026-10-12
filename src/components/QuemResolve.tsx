"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buscarProblema, NIVEL, PROBLEMAS, type Problema } from "@/lib/cargos";
import { useUf } from "./MeuEstado";

const SUGESTOES = ["buraco na rua", "polícia", "aposentadoria", "creche", "IPVA", "juros"];

/** Type an everyday problem, see which level of government is responsible and who to look for. */
export function QuemResolve() {
  const [q, setQ] = useState("");
  const uf = useUf();
  const achados = q ? buscarProblema(q) : [];
  return (
    <div className="cartao p-5 sm:p-6">
      <label className="block">
        <span className="text-lg font-bold">Qual é o problema?</span>
        <span className="mt-2 flex items-center gap-2 rounded-xl border-2 border-line-strong bg-surface px-3 focus-within:border-accent">
          <Search className="h-5 w-5 text-ink-3" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ex.: buraco na rua, remédio, aposentadoria"
            className="w-full bg-transparent py-3 text-lg outline-none"
          />
        </span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGESTOES.map((s) => (
          <button key={s} type="button" onClick={() => setQ(s)} className="chip">
            {s}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-5 space-y-3">
        {q && !achados.length && <p className="text-ink-2">Não achamos esse assunto. Tente outra palavra, como &ldquo;escola&rdquo; ou &ldquo;ônibus&rdquo;.</p>}
        {achados.slice(0, 3).map((p) => (
          <Resposta key={p.problema} p={p} uf={uf} />
        ))}
      </div>
      {!q && <p className="mt-4 text-sm text-ink-3">{PROBLEMAS.length} assuntos do dia a dia, da coleta de lixo à taxa de juros.</p>}
    </div>
  );
}

function Resposta({ p, uf }: { p: Problema; uf: string }) {
  const nivel = NIVEL[p.nivel];
  return (
    <div className="surgir rounded-xl border border-accent bg-accent-soft p-4">
      <p className="text-sm font-bold text-accent-ink">{p.problema}</p>
      <p className="mt-1 text-lg">
        É responsabilidade {p.nivel === "municipio" ? "da sua cidade" : p.nivel === "estado" ? "do seu estado" : "do governo federal"}: <b>{nivel.quem}</b>.
      </p>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-3">Quem executa</dt>
          <dd className="font-semibold">{p.executa}</dd>
        </div>
        <div>
          <dt className="text-ink-3">Quem faz as leis e fiscaliza</dt>
          <dd className="font-semibold">{p.legisla}</dd>
        </div>
      </dl>
      {p.nota && <p className="mt-2 text-sm text-ink-2">{p.nota}</p>}
      <p className="mt-3 text-sm">
        {p.nivel === "municipio" ? (
          <span className="text-ink-2">O Raio-X ainda não acompanha prefeitos e vereadores. Procure a Câmara de Vereadores da sua cidade.</span>
        ) : (
          <Link href={uf ? `/estado/${uf.toLowerCase()}` : "/#mapa"} className="link font-semibold">
            {uf ? "Ver quem representa o seu estado" : "Escolher o seu estado e ver quem te representa"}
          </Link>
        )}
      </p>
    </div>
  );
}
