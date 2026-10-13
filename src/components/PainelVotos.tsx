"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, type ReactNode } from "react";
import { ChevronDown, Eye, EyeOff, LayoutGrid, List, MapPin, Search, Users, X } from "lucide-react";
import { cadeirasDasLinhas } from "@/lib/cadeiras";
import { CATEGORIAS_VOTO, type CategoriaVoto } from "@/lib/linguagem";
import { orientacaoDoPartido } from "@/lib/orientacao";
import { paginar } from "@/lib/paginacao";
import { nomePartido } from "@/lib/partidos";
import { nomeUf } from "@/lib/ufs";
import {
  COR_CATEGORIA,
  FILTRO_INICIAL,
  agrupar,
  alternar,
  alternarPartido,
  compararComPartido,
  contar,
  escreverFiltro,
  filtrar,
  filtrarSemVoto,
  lerFiltro,
  limpar,
  mostra,
  ordenar,
  soEsta,
  temFiltro,
  type Contagem,
  type FiltroVotos,
  type LinhaVoto,
  type Ordem,
  type Visao,
} from "@/lib/votos";
import { data as dataPt } from "@/lib/format";
import { Avatar } from "./Avatar";
import { BandeiraUf, Uf } from "./Bandeira";
import { SiglaPartido } from "./Partido";
import { Paginacao } from "./Paginacao";
import { SeletorIdentidade } from "./SeletorIdentidade";
import { Plenario } from "./Plenario";
import { VotoChip } from "./base";

const POR_PAGINA = 60;

const ROTULO: Record<CategoriaVoto, string> = Object.fromEntries(CATEGORIAS_VOTO.map((c) => [c.id, c.rotulo])) as Record<CategoriaVoto, string>;
const EXPLICA: Record<CategoriaVoto, string> = Object.fromEntries(CATEGORIAS_VOTO.map((c) => [c.id, c.explicacao])) as Record<CategoriaVoto, string>;

export interface PainelVotosProps {
  linhas: LinhaVoto[];
  secreta?: boolean;
  titulo: string;
  orientacoes: { sigla: string; orientacao: string }[];
  /** Official record of this roll call */
  url?: string;
  /** Parties with a page on the site (members in office today) */
  partidosComPagina: string[];
  /** Where each vote comes from, shown under the list */
  origem?: {
    /** Identifier the house uses for this roll call */
    idOficial: string;
    casa: string;
    data: string;
    /** Open-data record listing every vote */
    listaOficial?: string;
    /** When the site last collected the data (ISO) */
    coletadoEm?: string;
  };
}

/**
 * Who voted how, in one place: the totals filter the list and the plenary, groups can be hidden,
 * and every choice lives in the address so a filtered view can be shared or revisited. Filters
 * only change what is shown; the official totals never change.
 */
export function PainelVotos(props: PainelVotosProps) {
  return (
    <Suspense fallback={<Painel {...props} filtro={FILTRO_INICIAL} />}>
      <PainelComEndereco {...props} />
    </Suspense>
  );
}

function PainelComEndereco(props: PainelVotosProps) {
  const sp = useSearchParams();
  const filtro = useMemo(() => lerFiltro(new URLSearchParams(sp.toString())), [sp]);
  const ir = useCallback((novo: FiltroVotos, modo: "push" | "replace" = "push") => {
    const qs = escreverFiltro(novo, new URLSearchParams(window.location.search)).toString().replace(/%2C/g, ",");
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (modo === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);
  return <Painel {...props} filtro={filtro} ir={ir} />;
}

function Painel({
  linhas,
  secreta,
  titulo,
  orientacoes,
  url,
  partidosComPagina,
  origem,
  filtro: f,
  ir,
}: PainelVotosProps & { filtro: FiltroVotos; ir?: (f: FiltroVotos, modo?: "push" | "replace") => void }) {
  const lista = useRef<HTMLDivElement>(null);
  const mudar = (novo: FiltroVotos, modo?: "push" | "replace") => ir?.(novo, modo);

  const total = useMemo(() => contar(linhas), [linhas]);
  const presentes = useMemo(() => CATEGORIAS_VOTO.map((c) => c.id).filter((c) => total[c] > 0), [total]);
  const semVoto = useMemo(() => filtrarSemVoto(linhas, f), [linhas, f]);
  const noFiltro = useMemo(() => contar(semVoto), [semVoto]);
  const visiveis = useMemo(() => ordenar(filtrar(linhas, f), f.ordem), [linhas, f]);
  const acesos = useMemo(() => new Set(visiveis.map((l) => l.pid)), [visiveis]);
  const plenario = useMemo(() => cadeirasDasLinhas(linhas, secreta, temFiltro(f) ? (l) => acesos.has(l.pid) : undefined), [linhas, secreta, f, acesos]);
  const partidos = useMemo(() => [...new Set(linhas.map((l) => l.partido))].sort((a, b) => a.localeCompare(b, "pt-BR")), [linhas]);
  const ufs = useMemo(() => [...new Set(linhas.map((l) => l.uf))].sort(), [linhas]);
  const pagina = paginar(visiveis, f.pagina, POR_PAGINA);
  const outrosFiltros = f.partidos.length > 0 || !!f.uf || !!f.q.trim() || f.diferente;
  const comparado = useMemo(() => compararComPartido(linhas), [linhas]);

  const irPagina = (p: number) => {
    mudar({ ...f, pagina: p });
    lista.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {/* 1. Totals: tap one to see only those people */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]" role="group" aria-label="Totais por tipo de voto">
        {presentes.map((c) => (
          <Total
            key={c}
            categoria={c}
            rotulo={secreta && c === "outro" ? "Participou" : ROTULO[c]}
            n={total[c]}
            noFiltro={outrosFiltros ? noFiltro[c] : undefined}
            selecionado={f.votos.length > 0 && f.votos.includes(c)}
            apagado={!mostra(f, c)}
            aoEscolher={() => mudar(soEsta(f, c))}
            aoAlternar={presentes.length > 1 ? () => mudar(alternar(f, c, presentes)) : undefined}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-3">
        Toque em um número para ver só essas pessoas. O olho esconde ou mostra um grupo. Os totais acima são os da votação inteira e não mudam com os filtros.{" "}
        <Link href="/como-funciona#tipos-de-voto" className="link">
          O que quer dizer cada voto
        </Link>
      </p>
      {total["sem-registro"] > 0 && (
        <p className="mt-1 text-sm text-ink-3">
          <b className="text-ink-2">Sem voto registrado</b> não quer dizer falta: {EXPLICA["sem-registro"].charAt(0).toLowerCase() + EXPLICA["sem-registro"].slice(1)}
        </p>
      )}

      {/* 1b. Compared with what each party asked: a fact, not a grade */}
      {!secreta && comparado.diferente + comparado.igual > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" role="group" aria-label="Comparação com a orientação do partido">
          <span className="font-semibold text-ink-2">Comparado com o que o partido pediu:</span>
          <button
            type="button"
            aria-pressed={f.diferente}
            onClick={() => mudar({ ...f, diferente: !f.diferente, pagina: 1 })}
            title="Votou Sim ou Não quando a liderança do partido pediu o contrário. Isso é um fato, não uma nota: pode haver bons motivos."
            className={`chip ${f.diferente ? "chip-ativo" : ""}`}
          >
            Votaram diferente <b className="tnum">{comparado.diferente}</b>
          </button>
          <span className="tnum">
            Votaram como o partido pediu <b>{comparado.igual}</b>
          </span>
          {comparado.semOrientacao > 0 && (
            <span className="text-ink-3 tnum" title="O partido não publicou orientação, ou pediu liberação de bancada.">
              Sem orientação do partido {comparado.semOrientacao}
            </span>
          )}
        </div>
      )}

      {/* 2. The room, lit by the same filter */}
      <div className="cartao mt-5 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl">
          <Plenario
            cadeiras={plenario.cadeiras}
            legenda={plenario.legenda}
            titulo={`Votos no plenário: ${titulo}`}
            filtro={ir ? { ativo: (id) => mostra(f, id as CategoriaVoto), aoTocar: (id) => mudar(alternar(f, id as CategoriaVoto, presentes)) } : undefined}
          />
        </div>
      </div>

      {/* 3. Controls */}
      <div ref={lista} className="mt-6 scroll-mt-24">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative min-w-56 flex-[2]">
            <span className="mb-1 block text-sm font-semibold text-ink-2">Procurar alguém</span>
            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-ink-3" aria-hidden />
            <input
              type="search"
              value={f.q}
              onChange={(e) => mudar({ ...f, q: e.target.value, pagina: 1 }, "replace")}
              placeholder="Nome, partido ou estado"
              className="h-11 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 outline-none focus:border-accent"
            />
          </label>
          <SeletorIdentidade
            tipo="partido"
            nome="partido"
            rotulo="Partido"
            rotuloClasse="mb-1 block text-sm font-semibold text-ink-2"
            className="min-w-40 flex-1 sm:flex-1"
            multiplo
            selecionados={f.partidos}
            opcoes={partidos}
            textoTodos={f.partidos.length ? "Somar outro partido" : "Todos os partidos"}
            aoMudar={(p) => p && mudar(alternarPartido(f, p))}
          />
          {ufs.length > 1 && (
            <SeletorIdentidade
              tipo="uf"
              nome="uf"
              rotulo="Estado"
              rotuloClasse="mb-1 block text-sm font-semibold text-ink-2"
              className="min-w-40 flex-1 sm:flex-1"
              valor={f.uf}
              opcoes={ufs}
              textoTodos="Todos os estados"
              aoMudar={(uf) => mudar({ ...f, uf, pagina: 1 })}
            />
          )}
          <Escolha
            rotulo="Ordem"
            valor={f.ordem}
            aoMudar={(o) => mudar({ ...f, ordem: o as Ordem, pagina: 1 })}
            opcoes={[
              { valor: "nome", rotulo: "Nome (A a Z)" },
              { valor: "voto", rotulo: "Tipo de voto" },
              { valor: "partido", rotulo: "Partido (A a Z)" },
              { valor: "uf", rotulo: "Estado (A a Z)" },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Como mostrar" className="inline-flex flex-wrap rounded-xl border border-line bg-surface p-1">
            {(
              [
                ["lista", "Lista", <LayoutGrid key="l" className="h-4 w-4" aria-hidden />],
                ["detalhe", "Detalhes", <List key="d" className="h-4 w-4" aria-hidden />],
                ["partido", "Por partido", <Users key="p" className="h-4 w-4" aria-hidden />],
                ["estado", "Por estado", <MapPin key="e" className="h-4 w-4" aria-hidden />],
              ] as [Visao, string, ReactNode][]
            ).map(([v, rotulo, icone]) => (
              <button
                key={v}
                type="button"
                aria-pressed={f.visao === v}
                onClick={() => mudar({ ...f, visao: v, pagina: 1 })}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${f.visao === v ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"}`}
              >
                {icone}
                {rotulo}
              </button>
            ))}
          </div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="link text-sm">
              Lista oficial de votos<span className="sr-only"> (abre em nova aba)</span>
            </a>
          )}
        </div>

        {/* 4. What is active, removable one by one */}
        {temFiltro(f) && (
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
            {f.votos.length > 0 && (
              <Ativo aoRemover={() => mudar({ ...f, votos: [], pagina: 1 })} rotuloRemover="Mostrar todos os votos">
                Voto: {f.votos.map((c) => ROTULO[c]).join(", ")}
              </Ativo>
            )}
            {f.partidos.map((p) => (
              <Ativo key={p} aoRemover={() => mudar(alternarPartido(f, p))} rotuloRemover={`Tirar o filtro do partido ${p}`}>
                Partido: {p}
              </Ativo>
            ))}
            {f.uf && (
              <Ativo aoRemover={() => mudar({ ...f, uf: "", pagina: 1 })} rotuloRemover="Tirar o filtro de estado">
                Estado: <Uf uf={f.uf} altura={11} nome />
              </Ativo>
            )}
            {f.q.trim() && (
              <Ativo aoRemover={() => mudar({ ...f, q: "", pagina: 1 })} rotuloRemover="Apagar a busca">
                Busca: “{f.q.trim()}”
              </Ativo>
            )}
            {f.diferente && (
              <Ativo aoRemover={() => mudar({ ...f, diferente: false, pagina: 1 })} rotuloRemover="Tirar o filtro de quem votou diferente do partido">
                Votaram diferente do partido
              </Ativo>
            )}
            <button type="button" onClick={() => mudar(limpar(f))} className="ml-1 text-sm font-semibold text-accent-ink hover:underline">
              Mostrar todos de novo
            </button>
          </div>
        )}

        <p className="mt-4 text-sm text-ink-2" aria-live="polite">
          {visiveis.length === linhas.length ? (
            <>
              <b className="tnum">{linhas.length}</b> pessoas nesta votação.
            </>
          ) : (
            <>
              Mostrando <b className="tnum">{visiveis.length}</b> de <b className="tnum">{linhas.length}</b> pessoas.
            </>
          )}
          {f.visao !== "partido" && f.visao !== "estado" && pagina.paginas > 1 && (
            <span className="text-ink-3">
              {" "}
              Página {pagina.pagina} de {pagina.paginas} ({pagina.inicio} a {pagina.fim}).
            </span>
          )}
        </p>

        {/* 5. The people */}
        <div className="mt-3">
          {visiveis.length === 0 ? (
            <div className="cartao p-6 text-center">
              <p className="font-semibold">Ninguém com esses filtros.</p>
              <button type="button" onClick={() => mudar(limpar(f))} className="botao-sec mt-3">
                Mostrar todos de novo
              </button>
            </div>
          ) : f.visao === "partido" || f.visao === "estado" ? (
            <Grupos
              por={f.visao === "partido" ? "partido" : "uf"}
              linhas={visiveis}
              base={semVoto}
              orientacoes={orientacoes}
              filtro={f}
              comPagina={new Set(partidosComPagina)}
              aoFiltrar={(chave) => mudar(f.visao === "partido" ? alternarPartido(f, chave) : { ...f, uf: f.uf === chave ? "" : chave, pagina: 1 })}
            />
          ) : f.visao === "detalhe" ? (
            <Detalhes linhas={pagina.itens} />
          ) : (
            <Grade linhas={pagina.itens} />
          )}
        </div>
        {f.visao !== "partido" && f.visao !== "estado" && (
          <div className="mt-5">
            <Paginacao pagina={pagina.pagina} paginas={pagina.paginas} aoIr={irPagina} rotulo="Páginas da lista de votos" />
          </div>
        )}

        {/* 6. Where every vote comes from */}
        {origem && (
          <div className="mt-6 rounded-lg bg-surface-2 p-4 text-sm">
            <p className="font-semibold">De onde vem cada voto</p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
              <dt className="text-ink-3">Registro</dt>
              <dd>
                Votação nº <span className="font-mono">{origem.idOficial}</span> da {origem.casa}, em {dataPt(origem.data)}
              </dd>
              <dt className="text-ink-3">Fonte oficial</dt>
              <dd className="flex flex-wrap gap-x-4">
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-6 items-center">
                    Página da votação<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                )}
                {origem.listaOficial && (
                  <a href={origem.listaOficial} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-6 items-center">
                    Lista oficial com o voto de cada pessoa (dados abertos)<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                )}
              </dd>
              {origem.coletadoEm && (
                <>
                  <dt className="text-ink-3">Coletado</dt>
                  <dd>
                    {dataPt(origem.coletadoEm.slice(0, 10))}. O site copia a lista oficial inteira; cada voto aparece como a Casa publicou (o código original fica no modo
                    Detalhes).
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Total({
  categoria,
  rotulo,
  n,
  noFiltro,
  selecionado,
  apagado,
  aoEscolher,
  aoAlternar,
}: {
  categoria: CategoriaVoto;
  rotulo: string;
  n: number;
  noFiltro?: number;
  selecionado: boolean;
  apagado: boolean;
  aoEscolher: () => void;
  aoAlternar?: () => void;
}) {
  return (
    <div
      className={`relative flex rounded-xl border transition-[border-color,background-color] ${selecionado ? "border-accent ring-2 ring-accent" : "border-line"} ${apagado ? "border-dashed bg-surface-2" : "bg-surface"}`}
    >
      <button
        type="button"
        aria-pressed={selecionado}
        onClick={aoEscolher}
        title={EXPLICA[categoria]}
        className="flex min-h-20 flex-1 flex-col items-start gap-1 rounded-xl p-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COR_CATEGORIA[categoria] }} aria-hidden />
          {rotulo}
        </span>
        <span className="display text-3xl font-extrabold tnum">{n}</span>
        {noFiltro != null && <span className="text-xs text-ink-3 tnum">{noFiltro} com os filtros</span>}
        <span className="sr-only">
          {apagado ? ". Escondido na lista." : ""}
          {selecionado ? ". Mostrando só este grupo. Toque de novo para mostrar todos." : ". Toque para mostrar só este grupo."}
        </span>
      </button>
      {aoAlternar && (
        <button
          type="button"
          onClick={aoAlternar}
          aria-label={apagado ? `Mostrar quem teve ${rotulo}` : `Esconder quem teve ${rotulo}`}
          title={apagado ? "Mostrar" : "Esconder"}
          className="m-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
        >
          {apagado ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  );
}

function Escolha({ rotulo, valor, aoMudar, opcoes }: { rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: { valor: string; rotulo: string }[] }) {
  return (
    <label className="min-w-40 flex-1">
      <span className="mb-1 block text-sm font-semibold text-ink-2">{rotulo}</span>
      <span className="relative block">
        <select
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-9 outline-none focus:border-accent"
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-ink-3" aria-hidden />
      </span>
    </label>
  );
}

function Ativo({ children, aoRemover, rotuloRemover }: { children: ReactNode; aoRemover: () => void; rotuloRemover: string }) {
  return (
    <span className="chip chip-ativo">
      {children}
      <button type="button" onClick={aoRemover} aria-label={rotuloRemover} className="-mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent-soft-2">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

function Voto({ l, grande = false }: { l: LinhaVoto; grande?: boolean }) {
  return <VotoChip voto={l.original} compacto={!grande} />;
}

function Nome({ l }: { l: LinhaVoto }) {
  return l.perfil ? (
    <Link href={`/politico/${l.pid}`} title={l.nome} className="block truncate font-semibold hover:underline">
      {l.nome}
    </Link>
  ) : (
    <span className="block truncate font-semibold">{l.nome}</span>
  );
}

function Partido({ l }: { l: LinhaVoto }) {
  return (
    <>
      <SiglaPartido sigla={l.partido} />
      {l.partidoAtual && (
        <span className="text-ink-3" title="Sem registro nesta votação, então mostramos o partido de hoje.">
          {" "}
          (partido atual)
        </span>
      )}
    </>
  );
}

function Grade({ linhas }: { linhas: LinhaVoto[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {linhas.map((l) => (
        <li key={l.pid} className="flex items-center gap-3 border-b border-line py-2">
          <Avatar src={l.foto} nome={l.nome} size={32} />
          <span className="min-w-0 flex-1">
            <Nome l={l} />
            <span className="block text-sm text-ink-3">
              <Partido l={l} /> · <BandeiraUf uf={l.uf} altura={11} /> {l.uf}
            </span>
          </span>
          <Voto l={l} />
        </li>
      ))}
    </ul>
  );
}

function Detalhes({ linhas }: { linhas: LinhaVoto[] }) {
  return (
    <>
      <ul className="divide-y divide-line sm:hidden">
        {linhas.map((l) => (
          <li key={l.pid} className="flex gap-3 py-3">
            <Avatar src={l.foto} nome={l.nome} size={40} />
            <div className="min-w-0 flex-1">
              <Nome l={l} />
              <p className="text-sm text-ink-3">
                <Partido l={l} /> · <Uf uf={l.uf} altura={11} nome />
              </p>
              <p className="mt-1">
                <Voto l={l} grande />
              </p>
              <p className="mt-1 text-sm text-ink-2">{l.explicacao}</p>
              <p className="mt-0.5 text-xs text-ink-3">
                <Pediu l={l} />
              </p>
              {l.original !== l.rotulo && <p className="mt-0.5 text-xs text-ink-3">Código na fonte: {l.original || "nenhum"}</p>}
            </div>
          </li>
        ))}
      </ul>
      <div className="tabela-caixa hidden sm:block" tabIndex={0} role="region" aria-label="Tabela; use as setas para rolar">
        <table className="tabela">
          <caption className="sr-only">Voto de cada pessoa</caption>
          <thead>
            <tr>
              <th scope="col">Pessoa</th>
              <th scope="col">Partido na votação</th>
              <th scope="col">Estado</th>
              <th scope="col">Voto</th>
              <th scope="col">Partido pediu</th>
              <th scope="col">Código na fonte</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.pid}>
                <td>
                  <span className="flex items-center gap-3">
                    <Avatar src={l.foto} nome={l.nome} size={32} />
                    <span className="min-w-0">
                      <Nome l={l} />
                    </span>
                  </span>
                </td>
                <td>
                  <Partido l={l} />
                </td>
                <td>
                  <BandeiraUf uf={l.uf} altura={12} /> {l.uf}
                </td>
                <td>
                  <Voto l={l} grande />
                  <span className="mt-1 block max-w-72 text-xs text-ink-3">{l.explicacao}</span>
                </td>
                <td className="text-xs">
                  <Pediu l={l} />
                </td>
                <td className="font-mono text-xs text-ink-2">{l.original === l.rotulo ? <span className="font-sans text-ink-3">igual ao voto</span> : l.original || "nenhum"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** What the party asked of this person, next to the vote, so a difference is visible and neutral. */
function Pediu({ l }: { l: LinhaVoto }) {
  if (l.categoria === "sem-registro") return null;
  if (!l.orientacao) return <span className="text-ink-3">Sem orientação do partido</span>;
  return (
    <span className="text-ink-2">
      Partido pediu <b>{l.orientacao}</b>
      {l.diferente && <span className="ml-1 rounded-md bg-surface px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-line">votou diferente</span>}
    </span>
  );
}

/** One stacked bar per party or state, every group visible, with the members underneath. */
function Grupos({
  por,
  linhas,
  base,
  orientacoes,
  filtro,
  comPagina,
  aoFiltrar,
}: {
  por: "partido" | "uf";
  linhas: LinhaVoto[];
  base: LinhaVoto[];
  orientacoes: { sigla: string; orientacao: string }[];
  filtro: FiltroVotos;
  comPagina: Set<string>;
  aoFiltrar: (chave: string) => void;
}) {
  const grupos = agrupar(base, por);
  const visiveis = new Map(agrupar(linhas, por).map((g) => [g.chave, g.linhas]));
  const ativo = (chave: string) => (por === "partido" ? filtro.partidos.includes(chave) : filtro.uf === chave);
  return (
    <div>
      <p className="mb-3 text-sm text-ink-3">
        {por === "partido"
          ? "Partidos em ordem alfabética. O partido é o registrado pela Casa no momento do voto. A orientação é o voto que a liderança pediu; ao lado, como cada membro votou de fato."
          : "Estados em ordem alfabética, com o voto de cada representante. O total de cada estado depende de quantas cadeiras ele tem."}
      </p>
      <ul className="space-y-3">
        {grupos
          .filter((g) => visiveis.has(g.chave))
          .map((g) => {
            const pediu = por === "partido" ? orientacaoDoPartido(orientacoes, g.chave) : undefined;
            const membros = ordenar(visiveis.get(g.chave)!, filtro.ordem);
            return (
              <li key={g.chave} className="cartao p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-lg font-bold">
                      {por === "partido" ? (
                        <SiglaPartido sigla={g.chave} link={comPagina.has(g.chave)} />
                      ) : (
                        <>
                          <BandeiraUf uf={g.chave} altura={16} />
                          {g.chave}
                        </>
                      )}
                    </p>
                    <p className="text-sm text-ink-3">{por === "partido" ? nomePartido(g.chave) : nomeUf(g.chave)}</p>
                  </div>
                  <div className="text-right text-sm">
                    {por === "partido" &&
                      (pediu ? (
                        <p>
                          Partido pediu: <b>{pediu}</b>
                        </p>
                      ) : (
                        <p className="text-ink-3">Sem orientação publicada</p>
                      ))}
                    <button type="button" onClick={() => aoFiltrar(g.chave)} aria-pressed={ativo(g.chave)} className="mt-1 font-semibold text-accent-ink hover:underline">
                      {ativo(g.chave) ? "Tirar este filtro" : por === "partido" ? "Ver só este partido" : "Ver só este estado"}
                    </button>
                  </div>
                </div>
                <Distribuicao contagem={g.contagem} />
                <p className="mt-1 text-xs text-ink-3">
                  {g.comRegistro} com voto registrado
                  {g.contagem["sem-registro"] > 0 ? ` · ${g.contagem["sem-registro"]} sem voto registrado` : ""}
                </p>
                <details className="group mt-3">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-accent-ink">
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                    Ver os {membros.length} {membros.length === 1 ? "membro" : "membros"}
                  </summary>
                  <div className="mt-2">
                    <Grade linhas={membros} />
                  </div>
                </details>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function Distribuicao({ contagem }: { contagem: Contagem }) {
  const itens = CATEGORIAS_VOTO.filter((c) => contagem[c.id] > 0);
  const t = Math.max(
    1,
    itens.reduce((s, c) => s + contagem[c.id], 0),
  );
  return (
    <div className="mt-3">
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
        {itens.map((c) => (
          <div key={c.id} style={{ width: `${(contagem[c.id] / t) * 100}%`, background: COR_CATEGORIA[c.id] }} />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 text-sm tnum">
        {itens.map((c) => (
          <span key={c.id}>
            <b style={{ color: c.id === "sem-registro" || c.id === "ausencia" ? undefined : COR_CATEGORIA[c.id] }}>{c.rotulo}</b> {contagem[c.id]}
          </span>
        ))}
      </p>
    </div>
  );
}
