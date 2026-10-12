import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Compartilhar } from "@/components/Compartilhar";
import { EtapaExplicada, ExplicacaoProjeto } from "@/components/Explicacao";
import { IconeAssunto } from "@/components/Icone";
import { BarraVotos } from "@/components/Listas";
import { VotosDoMeuEstado, type VotoPessoa } from "@/components/MeuEstado";
import { Plenario } from "@/components/Plenario";
import { QuorumExplicado } from "@/components/Quorum";
import { VotosNominais } from "@/components/VotosNominais";
import { Container, Fonte, Origem, Secao } from "@/components/ui";
import { assunto } from "@/lib/assuntos";
import { cadeirasPorVoto } from "@/lib/cadeiras";
import { getExplicacoes, getMaterias, getPoliticos, getVotacao, getVotacoes, urlDadoBruto } from "@/lib/data";
import { data, partesDescricao, VAZIO } from "@/lib/format";
import { explicarEtapa } from "@/lib/linguagem";
import { orientacaoDoPartido } from "@/lib/orientacao";
import { nomePartido } from "@/lib/partidos";
import { regraDaVotacao } from "@/lib/quorum";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getVotacoes()).map((v) => ({ id: v.id }));
}

export async function generateMetadata({ params }: PageProps<"/votacao/[id]">): Promise<Metadata> {
  const { id } = await params;
  const [v, explicacoes] = await Promise.all([getVotacao(id), getExplicacoes()]);
  if (!v) return {};
  const resumo = (v.materia && explicacoes.get(v.materia)?.resumo) || partesDescricao(v.descricao).ementa;
  return { title: `${v.titulo}: o que foi votado e como cada um votou`, description: resumo.slice(0, 160) };
}

export default async function Votacao({ params }: PageProps<"/votacao/[id]">) {
  const { id } = await params;
  const [v, pols, todas, materias, explicacoes] = await Promise.all([getVotacao(id), getPoliticos(), getVotacoes(), getMaterias(), getExplicacoes()]);
  if (!v) notFound();
  const casa = v.casa === "camara" ? "Câmara dos Deputados" : "Senado Federal";
  const casaCurta = v.casa === "senado" ? "senado" : "camara";
  // Approval rule of this roll call (a request inside a PEC debate follows the request rule)
  const regra = regraDaVotacao(v.titulo, v.descricao);
  const tipo = regraDaVotacao(v.titulo);
  const { ementa, procedimento } = partesDescricao(v.descricao);
  const etapa = explicarEtapa(procedimento, v.objeto);
  const materia = v.materia ? materias.get(v.materia) : undefined;
  const explicacao = v.materia ? explicacoes.get(v.materia) : undefined;
  const membros = pols.filter((p) => p.casa === v.casa);
  const porId = new Map(pols.map((p) => [p.id, p]));
  const plenario = v.votos.length ? cadeirasPorVoto(v, membros) : undefined;
  const irmas = v.materia ? todas.filter((x) => x.materia === v.materia).sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id)) : [];

  const votaram = new Set(v.votos.map((x) => x.pid));
  const votosPessoas: VotoPessoa[] = v.secreta
    ? []
    : v.votos.map((x) => ({
        pid: x.pid,
        nome: porId.get(x.pid)?.nome ?? x.nome,
        partido: x.partido,
        uf: x.uf,
        voto: x.voto,
        foto: porId.get(x.pid)?.foto,
        conhecido: porId.has(x.pid),
      }));
  const ausentes: VotoPessoa[] = v.secreta
    ? []
    : membros.filter((m) => m.emExercicio && !votaram.has(m.id)).map((m) => ({ pid: m.id, nome: m.nome, partido: m.partido, uf: m.uf, voto: "", foto: m.foto, conhecido: true }));

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <nav aria-label="Trilha" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link href="/votacoes" className="hover:underline">
              Votações
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-ink-2">{v.titulo}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-2">
              {casa} · {data(v.data)}
              {v.secreta ? " · Votação secreta" : ""}
            </span>
            {(v.assuntos ?? []).map((a) => {
              const s = assunto(a);
              return s ? (
                <Link key={a} href={`/votacoes?assunto=${a}`} className="chip">
                  <IconeAssunto nome={s.icone} className="h-3.5 w-3.5" />
                  {s.nome}
                </Link>
              ) : null;
            })}
          </div>
          <h1 className="display mt-2 text-4xl font-extrabold sm:text-5xl">{v.titulo}</h1>
          {tipo && <p className="mt-1 text-lg text-ink-2">{tipo.nome}</p>}

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
            <section aria-labelledby="sobre">
              <h2 id="sobre" className="text-sm font-bold text-accent-ink">
                Do que se trata
              </h2>
              <div className="mt-2">
                <ExplicacaoProjeto explicacao={explicacao} materia={materia} ementa={ementa} />
              </div>
            </section>
            <aside className="cartao h-fit p-5 sm:p-6" aria-label="Resultado">
              <p className="text-sm font-bold text-ink-3">Resultado desta votação</p>
              {v.resultado && (
                <p className="display mt-1 text-4xl font-extrabold">
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
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Compartilhar titulo={`${v.titulo}: como cada um votou`} texto={explicacao?.resumo ?? ementa.slice(0, 140)} />
                {v.url && <Fonte href={v.url}>Registro oficial</Fonte>}
              </div>
            </aside>
          </div>
        </Container>
      </header>

      <Container>
        <section className="grid gap-5 pt-8 lg:grid-cols-2" aria-label="Como ler esta votação">
          <div className="cartao p-5 sm:p-6">
            <h2 className="text-sm font-bold text-accent-ink">O que foi decidido nesta votação</h2>
            <div className="mt-2">
              <EtapaExplicada etapa={etapa} procedimento={procedimento} />
            </div>
          </div>
          {regra && <QuorumExplicado regra={regra} casa={v.casa} sim={v.sim} nao={v.nao} outros={v.outros} resultado={v.resultado} />}
        </section>

        {!v.secreta && v.votos.length > 0 && (
          <section className="pt-5" aria-label="Seus representantes">
            <VotosDoMeuEstado votos={votosPessoas} membros={ausentes} casa={casaCurta} />
          </section>
        )}

        {irmas.length > 1 && (
          <Secao
            titulo="Todas as votações deste projeto"
            subtitulo="Um projeto costuma passar por várias votações: pedidos, o texto principal e trechos separados. Esta é a ordem em que aconteceram."
          >
            <ol className="relative space-y-3 border-l-2 border-line pl-6">
              {irmas.map((x) => {
                const e = explicarEtapa(partesDescricao(x.descricao).procedimento, x.objeto);
                const atual = x.id === v.id;
                return (
                  <li key={x.id} className="relative">
                    <span className={`absolute -left-[33px] top-5 h-4 w-4 rounded-full border-[3px] border-paper ${atual ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
                    <Link
                      href={`/votacao/${x.id}`}
                      aria-current={atual ? "page" : undefined}
                      className={`cartao flex flex-wrap items-center justify-between gap-3 p-4 ${atual ? "border-accent bg-accent-soft" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-ink-3">
                          {data(x.data)}
                          {e?.tipo === "procedimento" ? " · sobre o andamento" : ""}
                          {atual ? " · você está aqui" : ""}
                        </span>
                        <span className="block font-semibold">{e?.titulo ?? (partesDescricao(x.descricao).procedimento.replace(/\s*Sim:.*$/s, "") || "Votação")}</span>
                      </span>
                      <span className="flex items-center gap-3 text-sm tnum">
                        <span>
                          <b className="text-sim">Sim</b> {x.sim} · <b className="text-nao">Não</b> {x.nao}
                        </span>
                        {x.resultado && (
                          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${x.resultado === "Aprovada" ? "bg-sim-soft text-sim" : "bg-nao-soft text-nao"}`}>
                            {x.resultado}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Secao>
        )}

        {plenario && (
          <Secao
            titulo={v.secreta ? "Quem participou" : "Como o plenário votou"}
            subtitulo={
              v.secreta
                ? "Esta votação foi secreta: a casa publica quem participou e o total de votos, mas não o voto de cada pessoa."
                : "Cada bolinha é uma cadeira. Passe o dedo ou o mouse para ver quem é e como votou; toque para abrir o perfil."
            }
          >
            <div className="cartao p-4 sm:p-6">
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
            <div className="cartao overflow-x-auto">
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
          <p>Votos e orientações publicados pela {casa} para esta votação nominal. Os detalhes do projeto vêm da página oficial dele.</p>
          <p>
            “O que foi decidido nesta votação” traduz o texto oficial do resultado com regras fixas e públicas, no código aberto do projeto. O texto oficial aparece logo abaixo da
            explicação.
          </p>
          <p className="flex flex-wrap gap-x-4">
            {v.url && <Fonte href={v.url}>Registro oficial da votação</Fonte>}
            {materia && <Fonte href={materia.url}>Página oficial do projeto</Fonte>}
            <Fonte href={urlDadoBruto(`votacoes/${v.id}.json`)}>Dados brutos desta página (JSON)</Fonte>
          </p>
        </Origem>
      </Container>
    </>
  );
}
