import Link from "next/link";
import { getMeta } from "@/lib/data";
import { dataCurtaHora, dataHora } from "@/lib/format";
import { Busca } from "./Busca";
import { NavPrincipal } from "./NavPrincipal";
import { Container } from "./ui";

const NAV = [
  { href: "/politicos", rotulo: "Políticos" },
  { href: "/partidos", rotulo: "Partidos" },
  { href: "/votacoes", rotulo: "Votações" },
  { href: "/gastos", rotulo: "Gastos" },
  { href: "/falas", rotulo: "Falas" },
  { href: "/como-funciona", rotulo: "Como funciona" },
];

const NAV_EXTRA = [
  { href: "/sobre", rotulo: "O que é o Raio-X Político" },
  { href: "/comparar", rotulo: "Comparar políticos" },
  { href: "/analises", rotulo: "Cruzamentos de dados" },
  { href: "/dados", rotulo: "Sobre os dados" },
];

export function Marca() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Raio-X Político, página inicial">
      <svg aria-hidden viewBox="0 0 28 28" className="h-7 w-7">
        <rect x="1" y="1" width="26" height="26" rx="6" fill="var(--ink)" />
        <rect x="6" y="15" width="4" height="7" rx="1" fill="var(--mark)" />
        <rect x="12" y="10" width="4" height="12" rx="1" fill="var(--paper)" />
        <rect x="18" y="6" width="4" height="16" rx="1" fill="var(--paper)" />
      </svg>
      <span className="display text-lg font-extrabold">Raio-X Político</span>
    </Link>
  );
}

export async function Cabecalho() {
  const meta = await getMeta();
  return (
    <header className="z-30 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80 lg:sticky lg:top-0">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-mark focus:px-3 focus:py-2 focus:text-mark-ink"
      >
        Pular para o conteúdo
      </a>
      <Container className="flex h-16 items-center gap-4">
        <Marca />
        <NavPrincipal itens={NAV} />
        {meta && (
          <Link
            href="/dados"
            className="ml-auto hidden items-center gap-2 whitespace-nowrap rounded-full px-2 py-1 text-xs text-ink-3 hover:text-ink 2xl:inline-flex"
            title="Situação de cada fonte na última coleta"
          >
            <span className="pulso" aria-hidden />
            Atualizado {dataCurtaHora(meta.geradoEm)}
          </Link>
        )}
        <div className="ml-auto w-full max-w-xs 2xl:ml-0">
          <Busca />
        </div>
      </Container>
    </header>
  );
}

export async function Rodape() {
  const meta = await getMeta();
  const repo = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/hugoassisj/raio-x-politico";
  return (
    <footer className="mt-20 border-t border-line bg-surface pb-20 lg:pb-0">
      <Container className="grid gap-8 py-10 text-sm text-ink-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Marca />
          <p className="max-w-md">
            Projeto independente e apartidário. Todos os números vêm de dados públicos oficiais e cada um leva à sua fonte. Nenhuma métrica é uma nota ou um juízo: são fatos para
            você tirar suas conclusões.
          </p>
          {meta && <p className="text-ink-3">Dados atualizados em {dataHora(meta.geradoEm)}.</p>}
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-ink">Explorar</h2>
          <ul className="space-y-1.5">
            {[...NAV, ...NAV_EXTRA].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="hover:text-ink hover:underline">
                  {n.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold text-ink">Transparência do projeto</h2>
          <ul className="space-y-1.5">
            <li>
              <Link href="/dados" className="hover:text-ink hover:underline">
                Fontes e metodologia
              </Link>
            </li>
            <li>
              <a href={repo} className="hover:text-ink hover:underline">
                Código aberto no GitHub
              </a>
            </li>
            <li>
              <a href={`${repo}/tree/main/data`} className="hover:text-ink hover:underline">
                Baixar todos os dados
              </a>
            </li>
            <li>
              <a href={`${repo}/issues/new`} className="hover:text-ink hover:underline">
                Encontrou um erro? Avise
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}

export async function AvisoDemo() {
  const meta = await getMeta();
  if (meta && !meta.demo) return null;
  return (
    <div role="status" className="border-b border-alerta/40 bg-alerta-bg text-sm">
      <Container className="py-2 text-ink">
        {meta?.demo
          ? "Você está vendo dados fictícios de demonstração. Nomes e números não correspondem a pessoas reais."
          : "Os dados ainda não foram coletados. Rode o pipeline para gerar o primeiro retrato."}
      </Container>
    </div>
  );
}
