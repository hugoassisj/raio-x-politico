"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Main navigation with the current section marked, so people always know where they are. */
export function NavPrincipal({ itens }: { itens: { href: string; rotulo: string }[] }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 lg:flex">
      {itens.map((n) => {
        const ativo =
          atual === n.href ||
          atual.startsWith(`${n.href}/`) ||
          (n.href === "/votacoes" && atual.startsWith("/votacao/")) ||
          (n.href === "/partidos" && atual.startsWith("/partido/")) ||
          (n.href === "/empresas" && atual.startsWith("/empresa/"));
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={ativo ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-[0.95rem] transition-colors hover:bg-surface-2 hover:text-ink ${ativo ? "font-semibold text-ink after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-accent" : "text-ink-2"}`}
          >
            {n.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
