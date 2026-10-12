"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { assunto as assuntoPorId } from "@/lib/assuntos";
import { data } from "@/lib/format";
import { CATEGORIAS_VOTO, type EtapaSimples } from "@/lib/linguagem";
import { paginar } from "@/lib/paginacao";
import type { VotoItem } from "@/lib/types";
import {
  COR_CATEGORIA,
  FILTRO_PERFIL_INICIAL,
  contarGruposDoPerfil,
  escreverFiltroPerfil,
  filtrarVotosDoPerfil,
  lerFiltroPerfil,
  votouDiferente,
  type FiltroPerfil,
  type FiltroVotosPerfil,
} from "@/lib/votos";
import { Paginacao } from "./Paginacao";
import { VotoChip } from "./ui";

const POR_PAGINA = 25;

/** A vote line already explained on the server: plain summary of the bill and what this step meant. */
export type VotoLinha = VotoItem & { resumo?: string; etapa?: Pick<EtapaSimples, "titulo" | "tipo" | "sim">; assuntos?: string[] };

interface Props {
  votos: VotoLinha[];
  mostrarGoverno: boolean;
}

/**
 * Every vote of one person, filterable by how they voted, by subject, by year and by text. The
 * filter lives in the address, so a link like "?voto=nao#votos" opens exactly that list.
 */
export function ListaVotos(props: Props) {
  return (
    <Suspense fallback={<Lista {...props} f={FILTRO_PERFIL_INICIAL} />}>
      <ListaComEndereco {...props} />
    </Suspense>
  );
}

function ListaComEndereco(props: Props) {
  const sp = useSearchParams();
  const f = useMemo(() => lerFiltroPerfil(new URLSearchParams(sp.toString())), [sp]);
  const ir = useCallback((novo: FiltroVotosPerfil, modo: "push" | "replace" = "push") => {
    const qs = escreverFiltroPerfil(novo, new URLSearchParams(window.location.search)).toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (modo === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);
  return <Lista {...props} f={f} ir={ir} />;
}

function Lista({ votos, mostrarGoverno, f, ir }: Props & { f: FiltroVotosPerfil; ir?: (f: FiltroVotosPerfil, modo?: "push" | "replace") => void }) {
  const topo = useRef<HTMLDivElement>(null);
  const mudar = (novo: FiltroVotosPerfil, modo?: "push" | "replace") => ir?.(novo, modo);
  const comTexto = useMemo(() => votos.map((v) => ({ ...v, texto: `${v.titulo} ${v.resumo ?? ""} ${v.etapa?.titulo ?? ""}` })), [votos]);
  const lista = useMemo(() => filtrarVotosDoPerfil(comTexto, f), [comTexto, f]);
  const n = useMemo(() => contarGruposDoPerfil(comTexto, f), [comTexto, f]);
  const anos = useMemo(() => [...new Set(votos.map((v) => v.data.slice(0, 4)))].sort().reverse(), [votos]);
  const assuntos = useMemo(() => [...new Set(votos.flatMap((v) => v.assuntos ?? []))].map(assuntoPorId).filter((a) => !!a), [votos]);
  const pagina = paginar(lista, f.pagina, POR_PAGINA);

  const grupos: [FiltroPerfil | "", string, string?][] = [
    ["", "Todos"],
    ...CATEGORIAS_VOTO.filter((c) => n[c.id] > 0).map((c): [FiltroPerfil, string, string] => [c.id, c.rotulo, COR_CATEGORIA[c.id]]),
    ["contra-partido", "Diferente do partido"],
    ...(mostrarGoverno ? ([["contra-governo", "Diferente do governo"]] as [FiltroPerfil, string][]) : []),
  ];
  const outros = !!(f.assunto || f.ano || f.q.trim());

  return (
    <div ref={topo} className="scroll-mt-24">
      <div role="group" aria-label="Mostrar votos por tipo" className="flex flex-wrap gap-1.5">
        {grupos.map(([g, rotulo, cor]) => (
          <button
            key={g || "todos"}
            type="button"
            aria-pressed={f.grupo === g}
            onClick={() => mudar({ ...f, grupo: f.grupo === g ? "" : g, pagina: 1 })}
            className="chip min-h-10"
            title={g === "contra-partido" ? "Votou Sim quando o partido pediu Não, ou o contrário" : undefined}
          >
            {cor && <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} aria-hidden />}
            {rotulo} <span className="tnum font-normal">{n[g]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="relative min-w-52 flex-[2]">
          <span className="sr-only">Buscar votação</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-3" aria-hidden />
          <input
            type="search"
            value={f.q}
            onChange={(e) => mudar({ ...f, q: e.target.value, pagina: 1 }, "replace")}
            placeholder="Buscar por assunto ou projeto"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </label>
        {assuntos.length > 0 && (
          <Escolha
            rotulo="Assunto"
            valor={f.assunto}
            aoMudar={(a) => mudar({ ...f, assunto: a, pagina: 1 })}
            opcoes={[{ valor: "", rotulo: "Todos os assuntos" }, ...assuntos.map((a) => ({ valor: a.id, rotulo: a.nome }))]}
          />
        )}
        {anos.length > 1 && (
          <Escolha
            rotulo="Ano"
            valor={f.ano}
            aoMudar={(a) => mudar({ ...f, ano: a, pagina: 1 })}
            opcoes={[{ valor: "", rotulo: "Todos os anos" }, ...anos.map((a) => ({ valor: a, rotulo: a }))]}
          />
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2" aria-live="polite">
        <span>
          {lista.length === votos.length ? (
            <>
              <b className="tnum">{votos.length}</b> votações
            </>
          ) : (
            <>
              Mostrando <b className="tnum">{lista.length}</b> de <b className="tnum">{votos.length}</b> votações
            </>
          )}
          {pagina.paginas > 1 && (
            <span className="text-ink-3">
              {" "}
              · página {pagina.pagina} de {pagina.paginas}
            </span>
          )}
        </span>
        {(f.grupo || outros) && (
          <button type="button" onClick={() => mudar(FILTRO_PERFIL_INICIAL)} className="inline-flex items-center gap-1 font-semibold text-accent-ink hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden />
            Mostrar todos de novo
          </button>
        )}
      </p>

      {lista.length === 0 ? (
        <p className="mt-4 rounded-lg bg-surface-2 px-4 py-5 text-ink-2">Nenhuma votação com esses filtros.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line cartao rounded-xl">
          {pagina.itens.map((v) => {
            const contraPartido = votouDiferente(v.voto, v.orientacaoPartido);
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
                  <Descricao v={v} />
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
                      <dt className="text-ink-3">Partido pediu</dt>
                      <dd className={contraPartido ? "font-semibold" : "text-ink-2"}>
                        {v.orientacaoPartido}
                        {contraPartido && <span className="ml-1 text-xs text-ink-2">(votou diferente)</span>}
                      </dd>
                    </div>
                  )}
                  {mostrarGoverno && v.orientacaoGoverno && (
                    <div className="flex items-center gap-1.5 sm:contents">
                      <dt className="text-ink-3">Governo pediu</dt>
                      <dd className="text-ink-2">{v.orientacaoGoverno}</dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4">
        <Paginacao
          pagina={pagina.pagina}
          paginas={pagina.paginas}
          rotulo="Páginas de votos"
          aoIr={(p) => {
            mudar({ ...f, pagina: p });
            topo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      </div>
    </div>
  );
}

function Escolha({ rotulo, valor, aoMudar, opcoes }: { rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: { valor: string; rotulo: string }[] }) {
  return (
    <label className="min-w-36 flex-1">
      <span className="sr-only">{rotulo}</span>
      <span className="relative block">
        <select
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="h-10 w-full appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 text-sm outline-none focus:border-accent"
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-3" aria-hidden />
      </span>
    </label>
  );
}

function Descricao({ v }: { v: VotoLinha }) {
  return (
    <>
      {v.resumo && <p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{v.resumo}</p>}
      {v.etapa && (
        <p className="mt-1 text-xs">
          <span className="font-semibold text-accent-ink">{v.etapa.titulo}</span>
          {v.etapa.tipo === "procedimento" && <span className="text-ink-3"> · sobre o andamento, não sobre o conteúdo</span>}
          {v.etapa.sim && <span className="block text-ink-3">{v.etapa.sim}</span>}
        </p>
      )}
    </>
  );
}
