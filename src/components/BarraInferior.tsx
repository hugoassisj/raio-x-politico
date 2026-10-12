"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, House, LayoutGrid, Vote, X } from "lucide-react";

const ITENS = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/votacoes", rotulo: "Votações", Icone: Vote },
  { href: "/presidencia", rotulo: "Presidência", Icone: Building2 },
];

/** Everything else, grouped by the question it answers. */
const MAIS: { titulo: string; links: { href: string; rotulo: string }[] }[] = [
  {
    titulo: "Quem são",
    links: [
      { href: "/politicos", rotulo: "Todos os políticos" },
      { href: "/partidos", rotulo: "Partidos" },
      { href: "/eleicoes", rotulo: "Eleições desde 1994" },
      { href: "/comparar", rotulo: "Comparar políticos" },
    ],
  },
  {
    titulo: "Dinheiro",
    links: [
      { href: "/gastos", rotulo: "Gastos da cota" },
      { href: "/emendas", rotulo: "Emendas por cidade" },
      { href: "/empresas", rotulo: "Empresas" },
      { href: "/relacoes", rotulo: "Mapa de relações" },
    ],
  },
  {
    titulo: "Entender",
    links: [
      { href: "/falas", rotulo: "O que andam dizendo" },
      { href: "/como-funciona", rotulo: "Como funciona" },
      { href: "/dados", rotulo: "Sobre os dados" },
      { href: "/correcoes", rotulo: "Correções" },
    ],
  },
];

/** Thumb-reachable navigation on phones, where most visitors are; "Mais" opens every section. */
export function BarraInferior() {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  const [rotaAberta, setRotaAberta] = useState(atual);
  // Navigating closes the panel
  if (rotaAberta !== atual) {
    setRotaAberta(atual);
    setAberto(false);
  }
  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberto]);
  const emMais = MAIS.some((g) => g.links.some((l) => atual.startsWith(l.href)));

  return (
    <>
      {aberto && (
        <>
          <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setAberto(false)} aria-hidden />
          <div id="menu-mais" className="fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 pb-24 shadow-3 lg:hidden">
            <nav aria-label="Todas as seções" className="grid gap-5 sm:grid-cols-3">
              {MAIS.map((g) => (
                <div key={g.titulo}>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-3">{g.titulo}</p>
                  <ul className="mt-1">
                    {g.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} aria-current={atual.startsWith(l.href) ? "page" : undefined} className="block rounded-lg px-2 py-2.5 font-semibold hover:bg-surface-2">
                          {l.rotulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4">
          {ITENS.map(({ href, rotulo, Icone }) => {
            const ativo = href === "/" ? atual === "/" : atual.startsWith(href) || (href === "/votacoes" && atual.startsWith("/votacao/"));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${ativo ? "text-ink" : "text-ink-3"}`}
                >
                  <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} aria-hidden />
                  {rotulo}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={aberto}
              aria-controls="menu-mais"
              onClick={() => setAberto((a) => !a)}
              className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${aberto || emMais ? "text-ink" : "text-ink-3"}`}
            >
              {aberto ? <X size={22} strokeWidth={2.4} aria-hidden /> : <LayoutGrid size={22} strokeWidth={emMais ? 2.4 : 1.8} aria-hidden />}
              {aberto ? "Fechar" : "Mais"}
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
