import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { cargoDe } from "@/components/Listas";
import { TabelaPoliticos } from "@/components/TabelaPoliticos";
import { Container, Vazio } from "@/components/ui";
import { getPoliticos } from "@/lib/data";
import { moedaCurta, numero, pct } from "@/lib/format";
import { ESTADOS, nomeUf, ufValida } from "@/lib/ufs";

export const dynamicParams = false;

export function generateStaticParams() {
  return ESTADOS.map((e) => ({ uf: e.uf.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/estado/[uf]">): Promise<Metadata> {
  const { uf } = await params;
  const nome = nomeUf(uf.toUpperCase());
  return { title: `Representantes de ${nome}`, description: `Senadores, deputados federais e estaduais de ${nome}: presença, votos, gastos e projetos.` };
}

export default async function Estado({ params }: PageProps<"/estado/[uf]">) {
  const { uf: raw } = await params;
  if (!ufValida(raw)) notFound();
  const uf = raw.toUpperCase();
  const todos = (await getPoliticos()).filter((p) => p.uf === uf && p.emExercicio);
  const senadores = todos.filter((p) => p.casa === "senado");
  const federais = todos.filter((p) => p.casa === "camara").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const estaduais = todos.filter((p) => p.casa === "assembleia").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const gasto = todos.reduce((s, p) => s + (p.m.gasto12m ?? 0), 0);
  const partidos = [...new Set(federais.map((p) => p.partido))].length;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-10">
          <nav aria-label="Trilha" className="mb-4 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>{" "}
            / <span className="text-ink-2">{nomeUf(uf)}</span>
          </nav>
          <p className="text-ink-2">Quem representa</p>
          <h1 className="display text-4xl font-extrabold sm:text-6xl">{nomeUf(uf)}</h1>
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-sm text-ink-3">Senadores</dt>
              <dd className="figure text-3xl font-bold">{senadores.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">Deputados federais</dt>
              <dd className="figure text-3xl font-bold">{federais.length}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-3">Deputados {uf === "DF" ? "distritais" : "estaduais"}</dt>
              <dd className="figure text-3xl font-bold">{estaduais.length}</dd>
            </div>
            {gasto > 0 && (
              <div>
                <dt className="text-sm text-ink-3">Gastos com cota em 12 meses</dt>
                <dd className="figure text-3xl font-bold">
                  <span className="grifo">{moedaCurta(gasto)}</span>
                </dd>
              </div>
            )}
          </dl>
        </Container>
      </header>

      <Container className="space-y-14 py-10">
        <section>
          <h2 className="display text-2xl font-bold sm:text-3xl">Senado</h2>
          <p className="mt-1 text-ink-2">Cada estado elege três senadores, para mandatos de oito anos.</p>
          {senadores.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {senadores.map((p) => (
                <Link key={p.id} href={`/politico/${p.id}`} className="flex gap-4 rounded-xl border border-line bg-surface p-4 hover:border-ink-3">
                  <Avatar src={p.foto} nome={p.nome} size={64} />
                  <div className="min-w-0">
                    <p className="font-semibold">{p.nome}</p>
                    <p className="text-sm text-ink-3">
                      {cargoDe(p)} · {p.partido}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
                      <dt className="text-ink-3">Presença</dt>
                      <dd className="tnum text-right">{pct(p.m.presenca)}</dd>
                      <dt className="text-ink-3">Gastos 12m</dt>
                      <dd className="tnum text-right">{moedaCurta(p.m.gasto12m)}</dd>
                      <dt className="text-ink-3">Projetos</dt>
                      <dd className="tnum text-right">{numero(p.m.proposicoes)}</dd>
                    </dl>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Vazio>Sem dados do Senado para este estado na última coleta.</Vazio>
          )}
        </section>

        <section>
          <h2 className="display text-2xl font-bold sm:text-3xl">Câmara dos Deputados</h2>
          <p className="mt-1 text-ink-2">
            {federais.length} deputados federais de {partidos} partidos. Toque em um nome para ver o perfil completo.
          </p>
          <div className="mt-5">{federais.length ? <TabelaPoliticos itens={federais} /> : <Vazio>Sem dados da Câmara para este estado na última coleta.</Vazio>}</div>
        </section>

        <section>
          <h2 className="display text-2xl font-bold sm:text-3xl">{uf === "DF" ? "Câmara Legislativa do DF" : "Assembleia Legislativa"}</h2>
          <p className="mt-1 max-w-3xl text-ink-2">
            A lista vem das candidaturas eleitas em 2022 no TSE. Presença e votos de deputados estaduais dependem de cada assembleia publicar dados abertos, o que ainda é raro: por isso
            muitos campos aparecem vazios.
          </p>
          <div className="mt-5">{estaduais.length ? <TabelaPoliticos itens={estaduais} /> : <Vazio>Sem dados da assembleia deste estado na última coleta.</Vazio>}</div>
        </section>
      </Container>
    </>
  );
}
