"use client";

import { SiglaPartido } from "./Partido";
import { Uf } from "./Bandeira";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Avatar } from "./Avatar";
import { plural } from "@/lib/format";
import { ESTADOS, nomeUf } from "@/lib/ufs";

/**
 * The visitor's state, remembered on this device only (localStorage, never sent anywhere). It lets
 * every page answer "and what did MY representatives do?" without asking again.
 */
const CHAVE = "raio-x:uf";
const EVENTO = "raio-x:uf";

function ler(): string {
  try {
    const uf = localStorage.getItem(CHAVE) ?? "";
    return ESTADOS.some((e) => e.uf === uf) ? uf : "";
  } catch {
    return "";
  }
}

export function definirUf(uf: string) {
  try {
    if (uf) localStorage.setItem(CHAVE, uf);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* private mode: the choice lasts only for this page */
  }
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(cb: () => void) {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

/** On a state page: remember it as the visitor's state, unless they already chose one. */
export function LembrarEstado({ uf }: { uf: string }) {
  useEffect(() => {
    if (!ler()) definirUf(uf);
  }, [uf]);
  return null;
}

export function useUf() {
  return useSyncExternalStore(assinar, ler, () => "");
}

export function SeletorUf({ rotulo = "Seu estado", compacto = false }: { rotulo?: string; compacto?: boolean }) {
  const uf = useUf();
  return (
    <label className={`inline-flex items-center gap-2 ${compacto ? "text-sm" : ""}`}>
      <MapPin className="h-4 w-4 text-accent" aria-hidden />
      <span className="text-ink-2">{rotulo}</span>
      <select
        value={uf}
        onChange={(e) => definirUf(e.target.value)}
        className="rounded-lg border border-line-strong bg-surface px-2 py-1 font-semibold text-ink outline-none focus:border-accent"
      >
        <option value="">Escolha</option>
        {ESTADOS.map((e) => (
          <option key={e.uf} value={e.uf}>
            {e.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface VotoPessoa {
  pid: string;
  nome: string;
  partido: string;
  uf: string;
  voto: string;
  foto?: string;
  conhecido: boolean;
}

const COR: Record<string, string> = { Sim: "bg-sim-soft text-sim", Não: "bg-nao-soft text-nao" };

/** On a vote page: how the visitor's own representatives voted, first thing after the result. */
export function VotosDoMeuEstado({ votos, membros, casa }: { votos: VotoPessoa[]; membros: VotoPessoa[]; casa: "camara" | "senado" }) {
  const uf = useUf();
  const cargo = casa === "camara" ? "deputados federais" : "senadores";
  if (!uf)
    return (
      <div className="cartao flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-lg">
          <b>Como votaram os {cargo} do seu estado?</b>
          <span className="block text-ink-2">Escolha o estado uma vez; o site lembra neste aparelho.</span>
        </p>
        <SeletorUf />
      </div>
    );
  const votaram = new Map(votos.filter((v) => v.uf === uf).map((v) => [v.pid, v]));
  const lista = [...votos.filter((v) => v.uf === uf), ...membros.filter((m) => m.uf === uf && !votaram.has(m.pid))].sort(
    (a, b) => ordem(a.voto) - ordem(b.voto) || a.nome.localeCompare(b.nome, "pt-BR"),
  );
  const contagem = (rot: string) => lista.filter((v) => (v.voto || "Não votou") === rot).length;
  return (
    <div className="cartao p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold">
          Os {cargo} de <Uf uf={uf} altura={14} nome />
        </h3>
        <SeletorUf rotulo="Trocar" compacto />
      </div>
      <p className="mt-1 text-ink-2">
        {["Sim", "Não"].map((r) => `${contagem(r)} ${r}`).join(" · ")}
        {lista.length - contagem("Sim") - contagem("Não") > 0 ? ` · ${lista.length - contagem("Sim") - contagem("Não")} outros ou não votaram` : ""}
      </p>
      <Grade lista={lista.filter((v) => v.voto)} />
      {lista.some((v) => !v.voto) && (
        <details className="mt-3">
          <summary className="chip">{plural(lista.filter((v) => !v.voto).length, "não votou", "não votaram")}: ver quem</summary>
          <Grade lista={lista.filter((v) => !v.voto)} />
        </details>
      )}
      <p className="mt-3 text-sm text-ink-3">
        <Link href={`/estado/${uf.toLowerCase()}`} className="link">
          Ver todos os representantes de {nomeUf(uf)}
        </Link>
      </p>
    </div>
  );
}

const ordem = (voto: string) => (voto === "Sim" ? 0 : voto === "Não" ? 1 : voto ? 2 : 3);

function Linha({ v }: { v: VotoPessoa }) {
  return (
    <>
      <Avatar src={v.foto} nome={v.nome} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{v.nome}</span>
        <span className="block text-sm text-ink-3">
          <SiglaPartido sigla={v.partido} />
        </span>
      </span>
      <span className={`shrink-0 rounded-md px-2 py-0.5 text-sm font-bold ${COR[v.voto] ?? "bg-surface-2 text-ink-2"}`}>{v.voto || "Não votou"}</span>
    </>
  );
}

function Grade({ lista }: { lista: VotoPessoa[] }) {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {lista.map((v, i) => (
        <li key={v.pid} className="surgir" style={{ "--i": i } as React.CSSProperties}>
          {v.conhecido ? (
            <Link href={`/politico/${v.pid}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
              <Linha v={v} />
            </Link>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Linha v={v} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
