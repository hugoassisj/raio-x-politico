"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { BandeiraUf } from "./Bandeira";
import { SiglaPartido } from "./Partido";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { nomePartido } from "@/lib/partidos";
import { ESTADOS, nomeUf } from "@/lib/ufs";

/**
 * One picker for every state or party filter, so the flag or the party logo shows next to the
 * text the same way as in the rest of the site (a native select cannot show images).
 * Inside a GET form (no `aoMudar`) it carries a hidden input with the value and submits the form
 * on change, so the URL keeps working without JavaScript (changing it does need JavaScript).
 */
type Props = {
  tipo: "uf" | "partido";
  /** Form field name (also the URL parameter) */
  nome: string;
  rotulo: string;
  /** Current value; "" means all */
  valor?: string;
  /** Codes offered; states default to every state, parties must be given */
  opcoes?: string[];
  /** Label of the empty choice */
  textoTodos?: string;
  /** Client usage: called with the chosen code instead of submitting a form */
  aoMudar?: (valor: string) => void;
  /** Several choices at once: `selecionados` are marked and each pick calls `aoMudar` */
  multiplo?: boolean;
  selecionados?: string[];
  className?: string;
  rotuloClasse?: string;
  /** Label and control side by side, for a line of text */
  embutido?: boolean;
};

const LIMITE_BUSCA = 12;
const UFS_POR_NOME = [...ESTADOS].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((e) => e.uf);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function SeletorIdentidade({
  tipo,
  nome,
  rotulo,
  valor = "",
  opcoes,
  textoTodos = "Todos",
  aoMudar,
  multiplo = false,
  selecionados = [],
  className = "",
  rotuloClasse = "text-ink-3",
  embutido = false,
}: Props) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState(valor);
  const oculto = useRef<HTMLInputElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const digitado = useRef({ texto: "", em: 0 });

  const atual = aoMudar ? valor : escolhido;
  const codigos = opcoes ?? (tipo === "uf" ? UFS_POR_NOME : []);
  const nomeDe = tipo === "uf" ? nomeUf : nomePartido;
  const comBusca = codigos.length > LIMITE_BUSCA;
  const todos = multiplo ? codigos : ["", ...codigos];
  const lista = busca ? todos.filter((c) => c && semAcento(`${c} ${nomeDe(c)}`).includes(semAcento(busca))) : todos;

  const marcado = (c: string) => (multiplo ? selecionados.includes(c) : c === atual);

  const escolher = (c: string) => {
    setAberto(false);
    if (aoMudar) return aoMudar(c);
    setEscolhido(c);
    if (oculto.current) {
      oculto.current.value = c;
      oculto.current.form?.requestSubmit();
    }
  };

  const opcoesNoDom = () => Array.from(painel.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
  const focar = (i: number) => {
    const els = opcoesNoDom();
    els[Math.max(0, Math.min(i, els.length - 1))]?.focus();
  };

  const teclaNaLista = (e: KeyboardEvent<HTMLDivElement>) => {
    const els = opcoesNoDom();
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focar(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i <= 0 && comBusca) painel.current?.querySelector("input")?.focus();
      else focar(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focar(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focar(els.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      if (i < 0) return;
      e.preventDefault();
      escolher(els[i].dataset.valor ?? "");
    } else if (e.key === "Tab") {
      setAberto(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (comBusca) {
        // The letter lands in the search box, which takes focus now
        painel.current?.querySelector("input")?.focus();
        return;
      }
      // Type-ahead: letters typed within half a second form a prefix
      const agora = Date.now();
      const texto = (agora - digitado.current.em < 500 ? digitado.current.texto : "") + e.key;
      digitado.current = { texto, em: agora };
      const alvo = els.findIndex((el, k) => k > i && semAcento(el.textContent ?? "").startsWith(semAcento(texto)));
      const primeiro = alvo >= 0 ? alvo : els.findIndex((el) => semAcento(el.textContent ?? "").startsWith(semAcento(texto)));
      if (primeiro >= 0) focar(primeiro);
    }
  };

  const teclaNaBusca = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focar(0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (lista.length === 1) escolher(lista[0]);
      else focar(0);
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  };

  const mostrar = (c: string, nome = true) =>
    !c ? (
      <span className="truncate">{textoTodos}</span>
    ) : tipo === "uf" ? (
      <>
        <BandeiraUf uf={c} altura={14} />
        <b>{c}</b>
        {nome && (
          <>
            {" "}
            <span className="truncate text-ink-2">{nomeUf(c)}</span>
          </>
        )}
      </>
    ) : (
      <>
        <SiglaPartido sigla={c} className="font-semibold" />
        {nome && nomePartido(c) !== c && (
          <>
            {" "}
            <span className="truncate text-ink-2">{nomePartido(c)}</span>
          </>
        )}
      </>
    );

  return (
    <div className={`${embutido ? "inline-flex items-center gap-2" : "flex min-w-[10rem] flex-1 flex-col gap-1 sm:flex-none"} text-sm ${className}`}>
      <span id={`${id}-rotulo`} className={rotuloClasse}>
        {rotulo}
      </span>
      {!aoMudar && <input type="hidden" name={nome} defaultValue={valor} ref={oculto} />}
      <Popover
        open={aberto}
        onOpenChange={(o) => {
          setAberto(o);
          if (!o) setBusca("");
        }}
      >
        <PopoverTrigger
          type="button"
          aria-labelledby={`${id}-rotulo ${id}-atual`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAberto(true);
            }
          }}
          className={`inline-flex h-11 min-w-0 items-center gap-2 rounded-lg border border-line-strong bg-surface pl-3 pr-2 text-left text-ink outline-none hover:border-accent focus-visible:border-accent sm:h-10 ${embutido ? "" : "w-full"}`}
        >
          <span id={`${id}-atual`} className="flex min-w-0 flex-1 items-center gap-1.5">
            {mostrar(atual, tipo === "uf")}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          ref={painel}
          align="start"
          collisionPadding={16}
          aria-label={rotulo}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const alvo = painel.current?.querySelector<HTMLElement>(comBusca ? "input" : '[role="option"][aria-selected="true"], [role="option"]');
            alvo?.focus();
          }}
          className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] max-w-[calc(100vw-2rem)] gap-1.5 border border-line bg-surface p-1.5 text-ink shadow-md"
        >
          {comBusca && (
            <label className="relative block">
              <span className="sr-only">Procurar na lista</span>
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-3" aria-hidden />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={teclaNaBusca}
                placeholder="Procurar"
                autoComplete="off"
                className="h-9 w-full rounded-md border border-line-strong bg-surface pl-8 pr-2 text-sm outline-none focus:border-accent"
              />
            </label>
          )}
          <div
            role="listbox"
            tabIndex={0}
            aria-labelledby={`${id}-rotulo`}
            aria-multiselectable={multiplo || undefined}
            onKeyDown={teclaNaLista}
            className="max-h-[min(18rem,var(--radix-popover-content-available-height)-4rem)] overflow-y-auto overscroll-contain"
          >
            {lista.length === 0 && <p className="px-2 py-3 text-ink-3">Nada encontrado</p>}
            {lista.map((c) => (
              <div
                key={c || "_"}
                role="option"
                tabIndex={-1}
                aria-selected={marcado(c)}
                data-valor={c}
                onClick={() => escolher(c)}
                className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 outline-none hover:bg-surface-2 focus-visible:bg-accent-soft aria-selected:font-semibold sm:min-h-10"
              >
                {mostrar(c)}
                {marcado(c) && <Check className="ml-auto h-4 w-4 shrink-0 text-accent" aria-hidden />}
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
