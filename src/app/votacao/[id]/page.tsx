import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraVotos } from "@/components/Listas";
import { VotosNominais } from "@/components/VotosNominais";
import { Container, Fonte, Origem, Secao } from "@/components/ui";
import { getPoliticos, getVotacao, getVotacoes, urlDadoBruto } from "@/lib/data";
import { data, VAZIO } from "@/lib/format";
import { orientacaoDoPartido } from "@/lib/orientacao";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getVotacoes()).map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/votacao/[id]">): Promise<Metadata> {
  const v = await getVotacao((await params).id);
  if (!v) return {};
  return { title: `${v.titulo}: como cada um votou`, description: v.descricao.slice(0, 160) };
}

export default async function Votacao({ params }: PageProps<"/votacao/[id]">) {
  const { id } = await params;
  const [v, pols] = await Promise.all([getVotacao(id), getPoliticos()]);
  if (!v) notFound();
  const casa = v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  const total = v.sim + v.nao + v.outros;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-10">
          <nav aria-label="Trilha" className="mb-4 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>{" "}
            /{" "}
            <Link href="/votacoes" className="hover:underline">
              Votações
            </Link>{" "}
            / <span className="text-ink-2">{v.titulo}</span>
          </nav>
          <p className="text-ink-2">
            {casa} · {data(v.data)}
          </p>
          <h1 className="display mt-1 text-4xl font-extrabold sm:text-5xl">{v.titulo}</h1>
          <p className="mt-4 max-w-3xl text-lg">{v.descricao}</p>
          <div className="mt-6 max-w-2xl">
            {v.resultado && (
              <p className="mb-3 text-2xl font-bold">
                <span className="grifo">{v.resultado}</span>
                {total > 0 && <span className="ml-2 text-base font-normal text-ink-2">com {total} votos registrados</span>}
              </p>
            )}
            <BarraVotos sim={v.sim} nao={v.nao} outros={v.outros} alto />
          </div>
          {v.orientacaoGoverno && (
            <p className="mt-4 text-ink-2">
              Orientação do Governo: <b className="text-ink">{v.orientacaoGoverno}</b>
            </p>
          )}
        </Container>
      </header>

      <Container>
        {v.porPartido.length > 0 && (
          <Secao
            titulo="Como cada partido votou"
            subtitulo={v.orientacoes.length ? "Orientação oficial da liderança e votos de fato dos membros." : "Votos de fato dos membros de cada partido."}
          >
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-3">
                    <th className="px-4 py-2.5 font-normal">Partido</th>
                    {v.orientacoes.length > 0 && <th className="px-4 py-2.5 font-normal">Orientou</th>}
                    <th className="w-[45%] px-4 py-2.5 font-normal">Votos dos membros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {v.porPartido.map((g) => (
                    <tr key={g.partido}>
                      <td className="px-4 py-2.5 font-semibold">
                        <Link href={`/partido/${encodeURIComponent(g.partido)}`} className="hover:underline">
                          {g.partido}
                        </Link>
                      </td>
                      {v.orientacoes.length > 0 && <td className="px-4 py-2.5">{orientacaoDoPartido(v.orientacoes, g.partido) ?? VAZIO}</td>}
                      <td className="px-4 py-2.5">
                        <BarraVotos sim={g.sim} nao={g.nao} outros={g.outros} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}

        {v.votos.length > 0 ? (
          <Secao titulo="Como cada um votou" subtitulo="Quem não aparece na lista não registrou voto nesta votação.">
            <VotosNominais votos={v.votos} conhecidos={pols.map((p) => p.id)} />
          </Secao>
        ) : (
          <Secao titulo="Votos individuais">
            <p className="text-ink-2">Esta foi uma votação secreta: o Senado divulga apenas o total de votos.</p>
          </Secao>
        )}

        <Origem>
          <p>Votos e orientações publicados pela {casa} para esta votação nominal.</p>
          <p className="flex flex-wrap gap-x-4">
            {v.url && <Fonte href={v.url}>Registro oficial</Fonte>}
            <Fonte href={urlDadoBruto(`votacoes/${v.id}.json`)}>Dados brutos desta página (JSON)</Fonte>
          </p>
        </Origem>
      </Container>
    </>
  );
}
