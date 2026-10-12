import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TabelaPoliticos } from "@/components/TabelaPoliticos";
import { Container } from "@/components/ui";
import { getAgregados, getPoliticos } from "@/lib/data";
import { metrica, NOME_CASA, type ChaveMetrica } from "@/lib/metricas";
import type { Casa } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [...new Set((await getPoliticos()).map((p) => p.partido))].map((sigla) => ({ sigla: encodeURIComponent(sigla) }));
}

export async function generateMetadata({ params }: PageProps<"/partido/[sigla]">): Promise<Metadata> {
  const sigla = decodeURIComponent((await params).sigla);
  return { title: `Partido ${sigla}`, description: `Senadores e deputados do ${sigla}: presença, alinhamento, gastos e projetos.` };
}

const COMPARAR: ChaveMetrica[] = ["presenca", "participacao", "fidelidade", "governismo", "gasto12m", "proposicoes"];

export default async function Partido({ params }: PageProps<"/partido/[sigla]">) {
  const sigla = decodeURIComponent((await params).sigla);
  const [pols, ag] = await Promise.all([getPoliticos(), getAgregados()]);
  const membros = pols.filter((p) => p.partido === sigla && p.emExercicio);
  if (!membros.length) notFound();
  const casas = (["senado", "camara", "assembleia"] as Casa[]).filter((c) => membros.some((m) => m.casa === c));

  return (
    <Container className="py-10">
      <nav aria-label="Trilha" className="mb-4 text-sm text-ink-3">
        <Link href="/" className="hover:underline">
          Início
        </Link>{" "}
        / <Link href="/politicos" className="hover:underline">Políticos</Link> / <span className="text-ink-2">{sigla}</span>
      </nav>
      <h1 className="display text-4xl font-extrabold sm:text-6xl">{sigla}</h1>
      <p className="mt-3 text-lg text-ink-2">
        {membros.length} {membros.length === 1 ? "parlamentar em exercício" : "parlamentares em exercício"} nas fontes consultadas.
      </p>

      {casas.map((casa) => {
        const doPartido = ag.porPartido.find((a) => a.chave === `${casa}|${sigla}`);
        const geral = ag.porCasa.find((a) => a.chave === casa);
        const lista = membros.filter((m) => m.casa === casa).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        const linhas = COMPARAR.filter((k) => doPartido?.medianas[k] != null && geral?.medianas[k] != null);
        return (
          <section key={casa} className="mt-12">
            <h2 className="display text-2xl font-bold sm:text-3xl">
              {NOME_CASA[casa]} <span className="text-ink-3">({lista.length})</span>
            </h2>
            {linhas.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full text-sm">
                  <caption className="px-4 pt-3 text-left text-ink-2">Mediana do partido comparada com a mediana de toda a casa</caption>
                  <thead>
                    <tr className="text-left text-ink-3">
                      <th className="px-4 py-2 font-normal">Critério</th>
                      <th className="px-4 py-2 text-right font-normal">{sigla}</th>
                      <th className="px-4 py-2 text-right font-normal">Toda a casa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {linhas.map((k) => (
                      <tr key={k}>
                        <td className="px-4 py-2">{metrica(k).titulo}</td>
                        <td className="tnum px-4 py-2 text-right font-semibold">{metrica(k).formato(doPartido!.medianas[k])}</td>
                        <td className="tnum px-4 py-2 text-right text-ink-2">{metrica(k).formato(geral!.medianas[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-5">
              <TabelaPoliticos itens={lista} />
            </div>
          </section>
        );
      })}
    </Container>
  );
}
