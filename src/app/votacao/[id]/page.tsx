import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Compartilhar } from "@/components/Compartilhar";
import { EtapaExplicada, ExplicacaoProjeto } from "@/components/Explicacao";
import { IconeAssunto } from "@/components/Icone";
import { BarraVotos } from "@/components/Listas";
import { VotosDoMeuEstado, type VotoPessoa } from "@/components/MeuEstado";
import { PainelVotos } from "@/components/PainelVotos";
import { QuorumExplicado } from "@/components/Quorum";
import { Container, Fonte, Origem, Secao } from "@/components/ui";
import { assunto } from "@/lib/assuntos";
import { getExplicacoes, getMaterias, getMeta, getPoliticos, getVotacao, getVotacoes, urlDadoBruto } from "@/lib/data";
import { data, partesDescricao } from "@/lib/format";
import { explicarEtapa, explicarSituacao } from "@/lib/linguagem";
import { regraDaVotacao } from "@/lib/quorum";
import { linhasDaVotacao } from "@/lib/votos";

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
  const [v, pols, todas, materias, explicacoes, meta] = await Promise.all([getVotacao(id), getPoliticos(), getVotacoes(), getMaterias(), getExplicacoes(), getMeta()]);
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
  const situacao = explicarSituacao(materia?.situacao);
  const membros = pols.filter((p) => p.casa === v.casa);
  const linhas = linhasDaVotacao(v, membros);
  const irmas = v.materia ? todas.filter((x) => x.materia === v.materia).sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id)) : [];

  // "Seus representantes" uses the same list as the panel: recorded votes first, then people without a record
  const pessoa = (l: (typeof linhas)[number]): VotoPessoa => ({ pid: l.pid, nome: l.nome, partido: l.partido, uf: l.uf, voto: l.original, foto: l.foto, conhecido: l.perfil });
  const votosPessoas = v.secreta ? [] : linhas.filter((l) => l.categoria !== "sem-registro").map(pessoa);
  const ausentes = v.secreta ? [] : linhas.filter((l) => l.categoria === "sem-registro").map(pessoa);

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
              {!v.secreta && v.votos.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-2">
                  <Link href="?voto=sim#quem-votou" scroll={false} className="chip">
                    <span className="h-2.5 w-2.5 rounded-full bg-sim" aria-hidden />
                    Quem votou Sim
                  </Link>
                  <Link href="?voto=nao#quem-votou" scroll={false} className="chip">
                    <span className="h-2.5 w-2.5 rounded-full bg-nao" aria-hidden />
                    Quem votou Não
                  </Link>
                </p>
              )}
              <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm">
                <p className="font-semibold">E o projeto, como está?</p>
                {situacao ? (
                  <>
                    <p className="mt-1">
                      <b>{situacao.titulo}.</b> {situacao.texto}
                    </p>
                    <p className="mt-1 text-xs text-ink-3">
                      Segundo {materia?.casa === "senado" ? "o Senado" : "a Câmara"}: “{situacao.original}”{meta ? `, conferido em ${data(meta.geradoEm.slice(0, 10))}` : ""}.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-ink-2">A Casa não informou a situação atual. Veja a página oficial do projeto.</p>
                )}
                {v.resultado === "Aprovada" && !situacao?.final && <p className="mt-1 text-ink-2">Ser aprovado nesta votação não quer dizer que já virou lei.</p>}
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

        <Secao
          id="quem-votou"
          natureza="oficial"
          titulo="Quem votou como"
          subtitulo={
            v.secreta
              ? "Esta votação foi secreta: a Casa publica quem participou e o total de votos, mas não o voto de cada pessoa."
              : "Toque em Sim, Não ou outro grupo para ver só essas pessoas. Filtre por partido ou estado, ou veja tudo agrupado por partido."
          }
        >
          {linhas.length > 0 ? (
            <PainelVotos
              linhas={linhas}
              secreta={v.secreta}
              titulo={v.titulo}
              orientacoes={v.orientacoes}
              url={v.url}
              partidosComPagina={[...new Set(pols.map((p) => p.partido))]}
            />
          ) : (
            <p className="text-ink-2">
              {v.secreta
                ? `A ${casa} divulgou só o total de votos desta votação secreta, sem a lista de quem participou.`
                : `A ${casa} não publicou a lista de votos desta votação.`}
            </p>
          )}
        </Secao>

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
