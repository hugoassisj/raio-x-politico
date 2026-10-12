import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarraVotos } from "@/components/Listas";
import { Plenario } from "@/components/Plenario";
import { QuorumExplicado } from "@/components/Quorum";
import { VotosNominais } from "@/components/VotosNominais";
import { Container, Fonte, Origem, Secao } from "@/components/ui";
import { cadeirasPorVoto } from "@/lib/cadeiras";
import { getPoliticos, getVotacao, getVotacoes, urlDadoBruto } from "@/lib/data";
import { data, partesDescricao, VAZIO } from "@/lib/format";
import { orientacaoDoPartido } from "@/lib/orientacao";
import { nomePartido } from "@/lib/partidos";
import { regraDaVotacao } from "@/lib/quorum";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getVotacoes()).map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/votacao/[id]">): Promise<Metadata> {
  const v = await getVotacao((await params).id);
  if (!v) return {};
  return { title: `${v.titulo}: como cada um votou`, description: partesDescricao(v.descricao).ementa.slice(0, 160) };
}

export default async function Votacao({ params }: PageProps<"/votacao/[id]">) {
  const { id } = await params;
  const [v, pols] = await Promise.all([getVotacao(id), getPoliticos()]);
  if (!v) notFound();
  const casa = v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  const regra = regraDaVotacao(v.titulo, v.descricao);
  const { ementa, procedimento } = partesDescricao(v.descricao);
  const membros = pols.filter((p) => p.casa === v.casa);
  const plenario = v.votos.length ? cadeirasPorVoto(v, membros) : undefined;

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
            {regra ? ` · ${regra.nome}` : ""}
            {v.secreta ? " · Votação secreta" : ""}
          </p>
          <h1 className="display mt-1 text-4xl font-extrabold sm:text-5xl">{v.titulo}</h1>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-sm font-semibold text-ink-3">O que estava em jogo</h2>
              <p className="mt-1 text-xl leading-relaxed">{ementa || VAZIO}</p>
              {procedimento && (
                <>
                  <h2 className="mt-5 text-sm font-semibold text-ink-3">O que foi votado nesta etapa</h2>
                  <p className="mt-1 text-ink-2">{procedimento}</p>
                </>
              )}
            </div>
            <div>
              {v.resultado && (
                <p className="text-3xl font-bold">
                  <span className="grifo">{v.resultado}</span>
                </p>
              )}
              <div className="mt-4">
                <BarraVotos sim={v.sim} nao={v.nao} outros={v.outros} alto />
              </div>
              {v.orientacaoGoverno && (
                <p className="mt-4 text-ink-2">
                  O governo pediu voto <b className="text-ink">{v.orientacaoGoverno}</b>.
                </p>
              )}
            </div>
          </div>
        </Container>
      </header>

      <Container>
        {regra && (
          <section className="pt-8">
            <QuorumExplicado regra={regra} casa={v.casa} sim={v.sim} nao={v.nao} outros={v.outros} resultado={v.resultado} />
          </section>
        )}

        {plenario && (
          <Secao
            titulo={v.secreta ? "Quem participou" : "Como o plenário votou"}
            subtitulo={
              v.secreta
                ? "Esta votação foi secreta: a Câmara publica quem participou e o total de votos, mas não o voto de cada pessoa."
                : "Cada bolinha é uma cadeira. Passe o dedo ou o mouse para ver quem é e como votou; toque para abrir o perfil."
            }
          >
            <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
              <Plenario cadeiras={plenario.cadeiras} legenda={plenario.legenda} titulo={`Votos no plenário: ${v.titulo}`} />
            </div>
          </Secao>
        )}

        {v.porPartido.length > 0 && (
          <Secao
            titulo="Como cada partido votou"
            subtitulo={
              v.orientacoes.length
                ? "A orientação é o voto que a liderança do partido pediu. Ao lado, como os membros votaram de fato."
                : "Como os membros de cada partido votaram."
            }
          >
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-3">
                    <th className="px-4 py-3 font-normal">Partido</th>
                    {v.orientacoes.length > 0 && <th className="px-4 py-3 font-normal">Pediu</th>}
                    <th className="w-[45%] px-4 py-3 font-normal">Votos dos membros</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {v.porPartido.map((g) => (
                    <tr key={g.partido}>
                      <td className="px-4 py-3">
                        <Link href={`/partido/${encodeURIComponent(g.partido)}`} className="font-semibold hover:underline">
                          {g.partido}
                        </Link>
                        <span className="block text-xs text-ink-3">{nomePartido(g.partido)}</span>
                      </td>
                      {v.orientacoes.length > 0 && <td className="px-4 py-3">{orientacaoDoPartido(v.orientacoes, g.partido) || VAZIO}</td>}
                      <td className="px-4 py-3">
                        <BarraVotos sim={g.sim} nao={g.nao} outros={g.outros} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}

        {v.votos.length > 0 && !v.secreta ? (
          <Secao titulo="Procure alguém" subtitulo="Lista com o voto de cada parlamentar que votou.">
            <VotosNominais votos={v.votos} conhecidos={pols.map((p) => p.id)} />
          </Secao>
        ) : (
          <Secao titulo="Votos individuais">
            <p className="text-ink-2">Esta foi uma votação secreta: a {casa} divulga apenas o total de votos, não o voto de cada pessoa.</p>
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
