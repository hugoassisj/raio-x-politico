"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, House, Users, Vote, Wallet } from "lucide-react";

const ITENS = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/partidos", rotulo: "Partidos", Icone: Users },
  { href: "/votacoes", rotulo: "Votações", Icone: Vote },
  { href: "/gastos", rotulo: "Gastos", Icone: Wallet },
  { href: "/como-funciona", rotulo: "Entenda", Icone: BookOpen },
];

/** Thumb-reachable navigation on phones, where most visitors are. */
export function BarraInferior() {
  const atual = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = href === "/" ? atual === "/" : atual.startsWith(href);
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
      </ul>
    </nav>
  );
}
