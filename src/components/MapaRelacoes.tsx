"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { ExternalLink, List, Network, Plus, Search } from "lucide-react";
import { moedaCurta } from "@/lib/format";
import { TIPOS_LIGACAO, juntarGrafos, type Grafo, type Ligacao, type No, type TipoLigacao } from "@/lib/grafo";

/** How each kind of link is drawn: color plus a dash pattern, so color is never the only cue. */
const ESTILO: Record<TipoLigacao, { cor: string; traco?: string }> = {
  filiacao: { cor: "var(--ink-3)", traco: "2 4" },
  cota: { cor: "var(--accent)" },
  "doacao-campanha": { cor: "var(--abst)", traco: "10 4" },
  "fornecedor-campanha": { cor: "var(--alerta)", traco: "4 3" },
  emenda: { cor: "var(--obst)", traco: "12 3 2 3" },
};

/** On the map, at most this many links per expanded node (largest values first); the list shows all. */
const MAX_POR_NO = 40;

type Pos = { x: number; y: number };

/** Starting point of each node from its id, so the same item tends to land in the same place. */
function semente(id: string): Pos {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const a = ((h >>> 0) % 3600) / 10;
  const r = 120 + ((h >>> 12) % 200);
  return { x: Math.cos((a * Math.PI) / 180) * r, y: Math.sin((a * Math.PI) / 180) * r };
}

function layout(nos: No[], ligacoes: Ligacao[], raiz: string): Map<string, Pos> {
  type N = SimulationNodeDatum & { id: string };
  const ns: N[] = nos.map((n) => ({ id: n.id, ...semente(n.id), ...(n.id === raiz ? { fx: 0, fy: 0 } : {}) }));
  const ls: SimulationLinkDatum<N>[] = ligacoes.map((l) => ({ source: l.de, target: l.para }));
  const sim = forceSimulation(ns)
    .force(
      "link",
      forceLink<N, SimulationLinkDatum<N>>(ls)
        .id((d) => d.id)
        .distance(110),
    )
    .force("carga", forceManyBody().strength(-420))
    .force("centro", forceCenter(0, 0))
    .force("colisao", forceCollide(34))
    .stop();
  // Fixed number of steps: the same data always gives the same picture
  for (let i = 0; i < 260; i++) sim.tick();
  return new Map(ns.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

export function MapaRelacoes({ inicial, raiz }: { inicial: Grafo; raiz: string }) {
  const router = useRouter();
  const [grafo, setGrafo] = useState(inicial);
  const [expandidos, setExpandidos] = useState(() => new Set([raiz]));
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sel, setSel] = useState<string>(raiz);
  const [visao, setVisao] = useState<"mapa" | "lista">("mapa");
  const [tipos, setTipos] = useState<Set<TipoLigacao>>(() => new Set(TIPOS_LIGACAO.map((t) => t.id)));

  // Visible links: chosen kinds, and on the map the largest ones of each expanded node
  const visiveis = useMemo(() => grafo.ligacoes.filter((l) => tipos.has(l.tipo) && l.confirmada), [grafo, tipos]);
  const noMapa = useMemo(() => {
    const porNo = new Map<string, Ligacao[]>();
    for (const l of visiveis) for (const k of [l.de, l.para]) if (expandidos.has(k)) porNo.set(k, [...(porNo.get(k) ?? []), l]);
    const ficam = new Set<string>();
    for (const ls of porNo.values()) for (const l of [...ls].sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0)).slice(0, MAX_POR_NO)) ficam.add(l.id + l.rotulo);
    return visiveis.filter((l) => ficam.has(l.id + l.rotulo));
  }, [visiveis, expandidos]);
  const nosVisiveis = useMemo(() => {
    const ids = new Set([raiz, ...noMapa.flatMap((l) => [l.de, l.para])]);
    return grafo.nos.filter((n) => ids.has(n.id));
  }, [grafo, noMapa, raiz]);
  const pos = useMemo(() => layout(nosVisiveis, noMapa, raiz), [nosVisiveis, noMapa, raiz]);
  const porId = useMemo(() => new Map(grafo.nos.map((n) => [n.id, n])), [grafo]);
  const cortadas = visiveis.length - noMapa.length;

  const xs = [...pos.values()];
  const pad = 70;
  const minX = Math.min(...xs.map((p) => p.x), 0) - pad;
  const minY = Math.min(...xs.map((p) => p.y), 0) - pad;
  const w = Math.max(...xs.map((p) => p.x), 0) + pad - minX;
  const h = Math.max(...xs.map((p) => p.y), 0) + pad - minY;

  async function expandir(id: string) {
    if (expandidos.has(id)) return;
    setCarregando(id);
    setErro(null);
    try {
      const r = await fetch(`/api/relacoes?no=${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(String(r.status));
      const g = (await r.json()) as Grafo;
      setGrafo((a) => juntarGrafos(a, g));
      setExpandidos((e) => new Set([...e, id]));
    } catch {
      setErro("Não foi possível buscar as ligações agora. Tente de novo.");
    } finally {
      setCarregando(null);
    }
  }

  const selecionado = porId.get(sel);
  const doSelecionado = visiveis.filter((l) => l.de === sel || l.para === sel).sort((a, b) => (b.valor ?? 0) - (a.valor ?? 0));
  const contagem = (t: TipoLigacao) => grafo.ligacoes.filter((l) => l.tipo === t && l.confirmada).length;

  const busca = <BuscaNo aoEscolher={(id) => router.push(`/relacoes?no=${encodeURIComponent(id)}`)} />;
  if (!grafo.nos.length)
    return (
      <div>
        {busca}
        <p className="mt-4 text-ink-3">Digite pelo menos 3 letras do nome de um político ou de uma empresa, ou um CNPJ.</p>
      </div>
    );

  return (
    <div>
      {busca}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Tipos de ligação" className="flex flex-wrap gap-1.5">
          {TIPOS_LIGACAO.filter((t) => contagem(t.id) > 0).map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tipos.has(t.id)}
              title={t.explicacao}
              onClick={() =>
                setTipos((s) => {
                  const n = new Set(s);
                  if (n.has(t.id)) n.delete(t.id);
                  else n.add(t.id);
                  return n;
                })
              }
              className="chip min-h-10"
            >
              <svg width="22" height="8" aria-hidden>
                <line x1="1" y1="4" x2="21" y2="4" stroke={ESTILO[t.id].cor} strokeWidth="3" strokeDasharray={ESTILO[t.id].traco} />
              </svg>
              {t.rotulo} <span className="tnum font-normal">{contagem(t.id)}</span>
            </button>
          ))}
        </div>
        <div role="group" aria-label="Como mostrar" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {(
            [
              ["mapa", "Mapa", Network],
              ["lista", "Lista", List],
            ] as const
          ).map(([v, rotulo, I]) => (
            <button
              key={v}
              type="button"
              aria-pressed={visao === v}
              onClick={() => setVisao(v)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${visao === v ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"}`}
            >
              <I className="h-4 w-4" aria-hidden />
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-3 rounded-lg bg-alerta-bg px-3 py-2 text-sm">
          {erro}
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_22rem]">
        {visao === "mapa" ? (
          <div className="cartao overflow-hidden">
            <svg
              viewBox={`${minX} ${minY} ${w} ${h}`}
              className="h-[min(70vh,640px)] w-full"
              role="group"
              aria-label="Mapa de relações. Use Tab para passar pelas pessoas e empresas e Enter para escolher."
            >
              {noMapa.map((l) => {
                const a = pos.get(l.de);
                const b = pos.get(l.para);
                if (!a || !b) return null;
                const destaque = l.de === sel || l.para === sel;
                return (
                  <line
                    key={l.id + l.rotulo}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={ESTILO[l.tipo].cor}
                    strokeDasharray={ESTILO[l.tipo].traco}
                    strokeWidth={destaque ? 3 : 1.6}
                    strokeOpacity={destaque ? 1 : 0.55}
                  >
                    <title>{`${porId.get(l.de)?.rotulo}: ${l.rotulo}: ${porId.get(l.para)?.rotulo}`}</title>
                  </line>
                );
              })}
              {nosVisiveis.map((n) => {
                const p = pos.get(n.id)!;
                const ativo = n.id === sel;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y})`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={ativo}
                    aria-label={`${n.rotulo}${n.detalhe ? `, ${n.detalhe}` : ""}`}
                    onClick={() => setSel(n.id)}
                    onDoubleClick={() => n.expansivel && expandir(n.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSel(n.id);
                      }
                    }}
                    className="cursor-pointer outline-none [&:focus-visible>.forma]:stroke-[var(--focus)] [&:focus-visible>.forma]:stroke-[4]"
                  >
                    <Forma tipo={n.tipo} ativo={ativo} raiz={n.id === raiz} />
                    {expandidos.has(n.id) || !n.expansivel ? null : <circle cx="15" cy="-15" r="7" fill="var(--surface)" stroke="var(--line-strong)" />}
                    {expandidos.has(n.id) || !n.expansivel ? null : <path d="M11.5 -15h7M15 -18.5v7" stroke="var(--ink-2)" strokeWidth="1.6" aria-hidden />}
                    <title>{n.rotulo}</title>
                    {/* In crowded maps only the main items keep a label; the others show it on hover and in the side panel */}
                    {(nosVisiveis.length <= 16 || ativo || n.id === raiz || expandidos.has(n.id)) && (
                      <text y="34" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight={ativo ? 700 : 500} className="pointer-events-none select-none">
                        {n.rotulo.length > 26 ? `${n.rotulo.slice(0, 25)}…` : n.rotulo}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {cortadas > 0 && (
              <p className="border-t border-line px-4 py-2 text-sm text-ink-3">
                O mapa mostra as {MAX_POR_NO} maiores ligações de cada item aberto. As outras {cortadas} estão na lista.
              </p>
            )}
          </div>
        ) : (
          <ListaLigacoes ligacoes={visiveis} porId={porId} aoEscolher={setSel} />
        )}

        <aside className="cartao h-fit p-4" aria-live="polite" aria-label="Item escolhido">
          {selecionado ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-3">{ROTULO_TIPO[selecionado.tipo]}</p>
              <p className="mt-1 text-lg font-bold leading-tight">{selecionado.rotulo}</p>
              {selecionado.detalhe && <p className="text-sm text-ink-3">{selecionado.detalhe}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {selecionado.expansivel && !expandidos.has(selecionado.id) && (
                  <button type="button" onClick={() => expandir(selecionado.id)} disabled={carregando === selecionado.id} className="botao">
                    <Plus className="h-4 w-4" aria-hidden />
                    {carregando === selecionado.id ? "Buscando…" : "Mostrar as ligações"}
                  </button>
                )}
                {selecionado.href && (
                  <Link href={selecionado.href} className="botao-sec">
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Abrir página
                  </Link>
                )}
              </div>
              <h3 className="mt-4 text-sm font-bold text-ink-2">Ligações ({doSelecionado.length})</h3>
              <ul className="mt-1 max-h-96 space-y-2 overflow-y-auto pr-1 text-sm">
                {doSelecionado.map((l) => {
                  const outro = porId.get(l.de === sel ? l.para : l.de);
                  return (
                    <li key={l.id + l.rotulo} className="rounded-lg border border-line p-2">
                      <button type="button" onClick={() => outro && setSel(outro.id)} className="text-left font-semibold hover:underline">
                        {outro?.rotulo}
                      </button>
                      <p className="text-ink-2">
                        {l.rotulo}
                        {l.valor ? `: ${moedaCurta(l.valor)}` : ""}
                      </p>
                      {l.evidencias.map((e, i) => (
                        <p key={i} className="text-xs text-ink-3">
                          {e.texto}. Fonte:{" "}
                          {e.url ? (
                            <a href={e.url} className="underline" target={e.url.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
                              {e.fonte}
                            </a>
                          ) : (
                            e.fonte
                          )}
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-ink-3">Escolha alguém no mapa para ver as ligações e as provas.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

const ROTULO_TIPO: Record<No["tipo"], string> = { pessoa: "Pessoa", empresa: "Empresa ou entidade", partido: "Partido", municipio: "Destino de emendas" };

function Forma({ tipo, ativo, raiz }: { tipo: No["tipo"]; ativo: boolean; raiz: boolean }) {
  const comum = { className: "forma", stroke: ativo ? "var(--ink)" : "var(--surface)", strokeWidth: ativo ? 3 : 2 };
  const r = raiz ? 20 : 15;
  if (tipo === "pessoa") return <circle r={r} fill="var(--accent)" {...comum} />;
  if (tipo === "empresa") return <rect x={-r} y={-r} width={2 * r} height={2 * r} rx="5" fill="var(--ink-2)" {...comum} />;
  if (tipo === "partido") return <path d={`M0 ${-r - 2}L${r + 2} 0L0 ${r + 2}L${-r - 2} 0Z`} fill="var(--outro)" {...comum} />;
  return <path d={`M0 ${-r - 1}L${r + 2} ${r}L${-r - 2} ${r}Z`} fill="var(--obst)" {...comum} />;
}

function ListaLigacoes({ ligacoes, porId, aoEscolher }: { ligacoes: Ligacao[]; porId: Map<string, No>; aoEscolher: (id: string) => void }) {
  const ordenadas = [...ligacoes].sort((a, b) => a.tipo.localeCompare(b.tipo) || (b.valor ?? 0) - (a.valor ?? 0) || a.id.localeCompare(b.id));
  return (
    <div className="tabela-caixa" tabIndex={0} role="region" aria-label="Tabela; use as setas para rolar">
      <table className="tabela">
        <caption className="sr-only">Todas as ligações, com a prova de cada uma</caption>
        <thead>
          <tr>
            <th scope="col">De</th>
            <th scope="col">Ligação</th>
            <th scope="col">Para</th>
            <th data-num="" scope="col">
              Valor
            </th>
            <th scope="col">Prova</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((l) => (
            <tr key={l.id + l.rotulo}>
              <td>
                <button type="button" onClick={() => aoEscolher(l.de)} className="text-left font-semibold hover:underline">
                  {porId.get(l.de)?.rotulo}
                </button>
              </td>
              <td>{l.rotulo}</td>
              <td>
                <button type="button" onClick={() => aoEscolher(l.para)} className="text-left font-semibold hover:underline">
                  {porId.get(l.para)?.rotulo}
                </button>
              </td>
              <td data-num="">{l.valor ? moedaCurta(l.valor) : ""}</td>
              <td className="text-xs text-ink-3">{l.evidencias.map((e) => `${e.texto} (${e.fonte})`).join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuscaNo({ aoEscolher }: { aoEscolher: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ id: string; rotulo: string; detalhe: string }[]>([]);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 3) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/relacoes?busca=${encodeURIComponent(t)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setRes)
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);
  const lista = q.trim().length >= 3 ? res : [];
  return (
    <div className="relative max-w-xl">
      <label>
        <span className="mb-1 block text-sm font-semibold text-ink-2">Começar por outra pessoa ou empresa</span>
        <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-ink-3" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome ou CNPJ"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 outline-none focus:border-accent"
        />
      </label>
      {lista.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-2">
          {lista.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => aoEscolher(r.id)} className="block w-full px-3 py-2 text-left hover:bg-surface-2">
                <span className="font-semibold">{r.rotulo}</span>
                <span className="block text-xs text-ink-3">{r.detalhe}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
