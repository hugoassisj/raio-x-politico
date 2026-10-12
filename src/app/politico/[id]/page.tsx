import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { CartoesResumo, TileMetrica, metricasDaCasa } from "@/components/Boletim";
import { MapPin } from "lucide-react";
import { nomePartido } from "@/lib/partidos";
import { resumoRapido } from "@/lib/resumo";
import { GraficoMensal } from "@/components/GraficoMensal";
import { cargoDe } from "@/components/Listas";
import { ListaVotos } from "@/components/ListaVotos";
import { ResumoIA } from "@/components/ResumoIA";
import { Barras, Container, Fonte, Origem, Secao, Vazio } from "@/components/ui";
import { getExplicacoes, getFalas, getIA, getPolitico, getPoliticos, getVotacoes, urlDadoBruto } from "@/lib/data";
import { data, idade, moeda, moedaCurta, numero, pct, plural, VAZIO } from "@/lib/format";
import { distribuicao, metrica, NOME_CASA } from "@/lib/metricas";
import { fraseResumo } from "@/lib/resumo";
import { nomeUf } from "@/lib/ufs";
import { encurtar, explicarCategoria, explicarEtapa } from "@/lib/linguagem";
import { partesDescricao } from "@/lib/format";
import type { VotoLinha } from "@/components/ListaVotos";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPoliticos()).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/politico/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPolitico(id);
  if (!p) return {};
  return {
    title: `${p.nome} (${p.partido}-${p.uf})`,
    description: fraseResumo(p) || `${cargoDe(p)} ${p.partido}-${p.uf}: presença, votos, gastos e projetos com dados oficiais.`,
  };
}

const PLATAFORMA: Record<string, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
  kwai: "Kwai",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  site: "Site",
};

const REGRA: Record<string, string> = {
  documento_invalido: "Documento inválido",
  refeicao_atipica: "Refeição atípica",
  duplicidade: "Possível duplicidade",
  fornecedor_concentrado: "Fornecedor concentrado",
  valor_atipico: "Valor atípico",
};

export default async function PaginaPolitico({ params }: PageProps<"/politico/[id]">) {
  const { id } = await params;
  const [p, todos, falas, ia, explicacoes, votacoes] = await Promise.all([getPolitico(id), getPoliticos(), getFalas(id), getIA(id), getExplicacoes(), getVotacoes()]);
  if (!p) notFound();
  // Each vote line arrives explained: the bill in plain words when available, and what the step meant
  const porVotacao = new Map(votacoes.map((v) => [v.id, v]));
  const linhasVoto: VotoLinha[] = p.votos.map((v) => {
    const completa = porVotacao.get(v.votacaoId);
    const { ementa, procedimento } = partesDescricao(completa?.descricao ?? v.descricao ?? "");
    const ex = completa?.materia ? explicacoes.get(completa.materia) : undefined;
    const etapa = explicarEtapa(procedimento, completa?.objeto ?? v.objeto);
    return {
      ...v,
      descricao: undefined,
      resumo: encurtar(ex?.resumo ?? ementa, 220),
      etapa: etapa && { titulo: etapa.titulo, tipo: etapa.tipo, sim: etapa.sim },
    };
  });

  const anoAtual = new Date().getUTCFullYear();
  const anos = p.inicioPolitica ? anoAtual - p.inicioPolitica : undefined;
  const id_ = idade(p.perfil.nascimento);
  const defs = metricasDaCasa(p.casa);
  const contraPartido = p.votos.filter((v) => v.orientacaoPartido && /^(sim|não)$/i.test(v.voto) && v.voto.toLowerCase() !== v.orientacaoPartido.toLowerCase()).length;

  const refs: Record<string, { url: string; rotulo: string }> = {};
  for (const f of falas) refs[f.id] = { url: f.url, rotulo: `${f.titulo ?? f.tipo}, ${data(f.data)}` };

  const secoes = [
    ["resumo", "Resumo"],
    ...(p.votos.length ? [["votos", "Votos"]] : []),
    ...(p.gastos ? [["gastos", "Gastos"]] : []),
    ...(p.proposicoesLista.length || Object.keys(p.proposicoesPorTipo).length ? [["projetos", "Projetos"]] : []),
    ...(falas.length || ia.length ? [["falas", "Falas"]] : []),
    ...(p.emendas ? [["emendas", "Emendas"]] : []),
    ["carreira", "Carreira e bens"],
    ["fontes", "Fontes"],
  ] as [string, string][];

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-8">
          <nav aria-label="Trilha" className="mb-5 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>{" "}
            /{" "}
            <Link href={`/estado/${p.uf.toLowerCase()}`} className="hover:underline">
              {nomeUf(p.uf)}
            </Link>{" "}
            / <span className="text-ink-2">{p.nome}</span>
          </nav>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4 sm:block">
              <div className="hidden sm:block">
                <Avatar src={p.foto} nome={p.nome} size={148} className="shadow-sm ring-1 ring-line" />
              </div>
              <div className="sm:hidden">
                <Avatar src={p.foto} nome={p.nome} size={88} className="shadow-sm ring-1 ring-line" />
              </div>
              <div className="sm:hidden">
                <p className="text-ink-2">{cargoDe(p)}</p>
                <h1 className="display mt-1 text-3xl font-extrabold">{p.nome}</h1>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="hidden text-lg text-ink-2 sm:block">
                {cargoDe(p)} · {NOME_CASA[p.casa]}
              </p>
              <h1 className="display mt-1 hidden text-5xl font-extrabold sm:block">{p.nome}</h1>
              {p.nomeCivil && p.nomeCivil.toLowerCase() !== p.nome.toLowerCase() && <p className="mt-1 text-ink-3">Nome completo: {p.nomeCivil}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/partido/${encodeURIComponent(p.partido)}`} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-1.5 text-paper hover:opacity-90">
                  <b>{p.partido}</b> <span className="hidden text-sm opacity-80 sm:inline">{nomePartido(p.partido)}</span>
                </Link>
                <Link href={`/estado/${p.uf.toLowerCase()}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 hover:border-ink-3">
                  <MapPin size={16} aria-hidden /> {nomeUf(p.uf)}
                </Link>
                {anos != null && (
                  <span className="rounded-lg border border-line px-3 py-1.5">
                    Na política desde {p.inicioPolitica} ({anos} {anos === 1 ? "ano" : "anos"})
                  </span>
                )}
                {!p.emExercicio && <span className="rounded-lg bg-surface-2 px-3 py-1.5 text-ink-2">Fora do exercício</span>}
                {p.eleicao2026 && <span className="rounded-lg bg-mark px-3 py-1.5 font-semibold text-mark-ink">Eleições 2026: {p.eleicao2026}</span>}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                {id_ != null && (
                  <div>
                    <dt className="text-sm text-ink-3">Idade</dt>
                    <dd className="font-semibold">{id_} anos</dd>
                  </div>
                )}
                {p.perfil.naturalidade && (
                  <div>
                    <dt className="text-sm text-ink-3">Nasceu em</dt>
                    <dd className="font-semibold">{p.perfil.naturalidade}</dd>
                  </div>
                )}
                {p.perfil.escolaridade && (
                  <div>
                    <dt className="text-sm text-ink-3">Escolaridade</dt>
                    <dd className="font-semibold">{p.perfil.escolaridade}</dd>
                  </div>
                )}
                {!!p.perfil.profissoes?.length && (
                  <div>
                    <dt className="text-sm text-ink-3">Profissão</dt>
                    <dd className="font-semibold">{p.perfil.profissoes.slice(0, 2).join(", ")}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
              <Link href={`/comparar?ids=${p.id}`} className="botao-sec">
                Comparar com outro
              </Link>
              {p.perfil.paginaOficial && <Fonte href={p.perfil.paginaOficial}>Página oficial</Fonte>}
            </div>
          </div>
        </Container>
      </header>

      <nav aria-label="Seções do perfil" className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur lg:top-16">
        <Container className="flex gap-1 overflow-x-auto py-2">
          {secoes.map(([a, r]) => (
            <a key={a} href={`#${a}`} className="shrink-0 rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
              {r}
            </a>
          ))}
        </Container>
      </nav>

      <Container>
        <section id="resumo" className="scroll-mt-32 pt-8">
          <h2 className="display text-3xl font-bold">Em resumo</h2>
          {fraseResumo(p) && <p className="mt-3 max-w-3xl text-xl leading-relaxed">{fraseResumo(p)}</p>}
          <div className="mt-6">
            <CartoesResumo itens={resumoRapido(p, todos)} />
          </div>
          <h2 className="display mt-14 text-2xl font-bold">Todos os números</h2>
          <p className="mt-1 text-ink-2">Cada cartão mostra onde esta pessoa fica entre todos os colegas. Toque em &ldquo;O que é isso&rdquo; para entender cada número.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {defs.map((d, i) => (
              <TileMetrica
                key={d.chave}
                def={d}
                valor={p.m[d.chave]}
                casa={p.casa}
                dist={distribuicao(todos, p.casa, d.chave)}
                destaque={i === 0}
                nota={
                  d.chave === "presenca" && p.presenca
                    ? `${numero(p.presenca.presente)} de ${numero(p.presenca.sessoes)} sessões${p.presenca.justificadas ? `, ${p.presenca.justificadas} ausências justificadas` : ""}`
                    : d.chave === "participacao" && p.m.votacoesBase
                      ? `${numero(p.m.votacoesBase)} votações nominais no período`
                      : d.chave === "gasto12m" && p.gastos?.mediaPares12m
                        ? `Mediana de quem é do mesmo estado: ${moedaCurta(p.gastos.mediaPares12m)}`
                        : d.chave === "proposicoes" && p.m.proposicoes != null
                          ? `${numero(p.m.proposicoesLei ?? 0)} ${p.m.proposicoesLei === 1 ? "virou lei" : "viraram lei"}`
                          : d.chave === "fidelidade" && p.m.fidelidadeMetodo === "maioria"
                            ? "Comparado com a maioria da bancada"
                            : undefined
                }
              />
            ))}
          </div>
          <Origem titulo="Como ler estes números">
            <p>
              Cada cartão mostra o valor desta pessoa, uma linha com o menor e o maior valor entre todos os colegas da mesma casa, a faixa onde estão 80% deles (retângulo) e a
              mediana (traço vertical). O ponto escuro é esta pessoa.
            </p>
            <p>Nenhum número é uma nota. Faltar, gastar ou seguir o partido podem ter boas explicações: use os dados como ponto de partida e confira as fontes.</p>
          </Origem>
        </section>

        {p.votos.length > 0 && (
          <Secao
            id="votos"
            titulo="Como votou"
            subtitulo={
              <>
                {numero(p.votos.length)} votações nominais nos últimos 12 meses.{" "}
                {contraPartido > 0 && (
                  <>
                    Votou diferente do partido <b>{contraPartido}</b> {contraPartido === 1 ? "vez" : "vezes"}.
                  </>
                )}
              </>
            }
            origem={
              <>
                <p>{metrica("fidelidade").calculo}</p>
                <p>
                  Os votos individuais e as orientações de cada partido são publicados pela {p.casa === "camara" ? "Câmara" : "Senado"} para cada votação nominal. Toque em uma
                  votação para ver como todos votaram.
                </p>
              </>
            }
          >
            <ListaVotos votos={linhasVoto} mostrarGoverno={p.casa === "camara"} />
          </Secao>
        )}

        {p.gastos && (
          <Secao
            id="gastos"
            titulo="Quanto gastou da cota parlamentar"
            subtitulo={
              <>
                <span className="grifo font-semibold">{moeda(p.gastos.total12m)}</span> nos últimos 12 meses completos
                {p.gastos.mediaPares12m ? `, contra uma mediana de ${moedaCurta(p.gastos.mediaPares12m)} entre colegas do mesmo estado` : ""}.
              </>
            }
            origem={
              <>
                <p>{metrica("gasto12m").calculo}</p>
                <p>{metrica("gasto12m").limites}</p>
                <p>
                  A cota reembolsa despesas do mandato (passagens, combustível, escritório, divulgação). Não inclui salário ({moeda(46366.19)} para deputados federais e senadores)
                  nem verba de gabinete.
                </p>
              </>
            }
          >
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold">Gasto por mês</h3>
                <GraficoMensal
                  meses={p.gastos.porMes}
                  referencia={p.gastos.mediaPares12m ? p.gastos.mediaPares12m / 12 : undefined}
                  rotuloReferencia="média mensal dos colegas do estado"
                />
              </div>
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="mb-3 font-semibold">Em que gastou</h3>
                <Barras
                  itens={p.gastos.porCategoria.slice(0, 7).map((c) => ({ rotulo: c.categoria, valor: c.valor, detalhe: explicarCategoria(c.categoria) }))}
                  formato={moedaCurta}
                />
              </div>
            </div>

            {p.gastos.alertas.length > 0 && (
              <div className="mt-6 rounded-xl border border-alerta/40 bg-alerta-bg p-4 sm:p-5">
                <h3 className="font-semibold">
                  {p.gastos.alertas.length} {p.gastos.alertas.length === 1 ? "gasto para conferir" : "gastos para conferir"}
                </h3>
                <p className="mt-1 text-sm text-ink-2">{metrica("alertas").limites}</p>
                <ul className="mt-4 divide-y divide-alerta/20">
                  {p.gastos.alertas.slice(0, 8).map((a, i) => (
                    <li key={i} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-alerta">{REGRA[a.regra]}</p>
                        <p className="text-sm">{a.descricao}</p>
                        <p className="text-sm text-ink-3">
                          {a.fornecedor}
                          {a.data ? ` · ${data(a.data)}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="figure font-semibold">{moeda(a.valor)}</p>
                        {a.url && <Fonte href={a.url}>Ver nota fiscal</Fonte>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="mb-3 font-semibold">Fornecedores que mais receberam</h3>
                <Barras
                  itens={p.gastos.topFornecedores
                    .slice(0, 6)
                    .map((f) => ({ rotulo: f.nome || "Sem nome", valor: f.valor, detalhe: `${f.n} ${f.n === 1 ? "pagamento" : "pagamentos"}${f.doc ? ` · ${f.doc}` : ""}` }))}
                  formato={moedaCurta}
                />
              </div>
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="mb-2 font-semibold">Lançamentos mais recentes</h3>
                <ul className="divide-y divide-line text-sm">
                  {p.gastos.recentes.slice(0, 8).map((g, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 py-2">
                      <span className="min-w-0">
                        <span className="block truncate">{g.fornecedor || g.categoria}</span>
                        <span className="block truncate text-ink-3">
                          {g.categoria} · {data(g.data)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block font-semibold">{moeda(g.valor)}</span>
                        {g.url && <Fonte href={g.url}>nota</Fonte>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Secao>
        )}

        {(p.proposicoesLista.length > 0 || Object.keys(p.proposicoesPorTipo).length > 0) && (
          <Secao
            id="projetos"
            titulo="O que propôs"
            subtitulo={
              <>
                {numero(p.m.proposicoes)} projetos como autor ou coautor
                {p.m.proposicoesLei ? `, ${p.m.proposicoesLei} transformados em lei` : ""}.
              </>
            }
            origem={
              <>
                <p>{metrica("proposicoes").calculo}</p>
                <p>{metrica("proposicoes").limites}</p>
              </>
            }
          >
            <div className="mb-5 flex flex-wrap gap-3">
              {Object.entries(p.proposicoesPorTipo)
                .filter(([, n]) => n > 0)
                .map(([t, n]) => (
                  <div key={t} className="rounded-lg border border-line bg-surface px-4 py-2">
                    <p className="figure text-2xl font-bold">{numero(n)}</p>
                    <p className="text-sm text-ink-2">{TIPOS[t] ?? t}</p>
                  </div>
                ))}
            </div>
            <ul className="divide-y divide-line cartao rounded-xl">
              {p.proposicoesLista.slice(0, 15).map((x) => (
                <li key={x.id} className="p-4">
                  <p className="text-sm text-ink-3">
                    {x.tipo} {x.numero}/{x.ano} · apresentado em {data(x.data)}
                    {x.virouLei && <span className="ml-2 rounded bg-ok-bg px-1.5 py-0.5 text-xs font-semibold text-sim">Virou lei</span>}
                  </p>
                  {(() => {
                    const chave = p.casa === "camara" ? `cam-${x.id}` : `sen-${x.id}`;
                    const ex = explicacoes.get(chave);
                    const votada = votacoes.find((v) => v.materia === chave);
                    return (
                      <>
                        <p className="mt-1">{ex?.resumo ?? x.ementa}</p>
                        {ex && <p className="mt-0.5 text-xs text-ink-3">Em linguagem simples, feito por IA a partir do texto oficial. Ementa: {x.ementa}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink-2">
                          {x.situacao && <span>Situação: {x.situacao}</span>}
                          {votada && (
                            <Link href={`/votacao/${votada.id}`} className="link">
                              Foi votado no Plenário: ver como cada um votou
                            </Link>
                          )}
                          {x.url && <Fonte href={x.url}>Tramitação completa</Fonte>}
                        </p>
                      </>
                    );
                  })()}
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {(falas.length > 0 || ia.length > 0) && (
          <Secao
            id="falas"
            titulo="O que tem dito"
            subtitulo={`${plural(falas.length, "discurso ou publicação coletado", "discursos e publicações coletados")} de fontes públicas.`}
            acao={
              <Link href={`/falas?pid=${p.id}`} className="link text-sm">
                Buscar nas falas
              </Link>
            }
            origem={
              <>
                <p>
                  Discursos vêm das transcrições oficiais da Câmara e dos pronunciamentos do Senado. Publicações em redes sociais só entram quando coletadas pela API oficial da
                  plataforma (hoje, YouTube), sempre com o link original.
                </p>
                <p>
                  Os resumos de IA são gerados apenas a partir desses registros e dos votos nominais. Cada afirmação precisa apontar para um registro existente, ou é descartada
                  antes de ser publicada.
                </p>
              </>
            }
          >
            {ia.length > 0 && (
              <div className="mb-6">
                <ResumoIA resumos={ia} refs={refs} />
              </div>
            )}
            {falas.length > 0 && (
              <ol className="space-y-3">
                {falas.slice(0, 8).map((f) => (
                  <li key={f.id} className="cartao rounded-xl p-4">
                    <p className="text-sm text-ink-3">
                      {data(f.data)} · {f.titulo ?? f.tipo}
                    </p>
                    <p className="mt-1 line-clamp-4">{f.resumoOficial ?? f.texto}</p>
                    {!!f.palavrasChave?.length && <p className="mt-2 text-sm text-ink-3">Temas: {f.palavrasChave.slice(0, 6).join(", ")}</p>}
                    <p className="mt-2">
                      <Fonte href={f.url}>{f.fonte}</Fonte>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Secao>
        )}

        {p.emendas && (
          <Secao
            id="emendas"
            titulo="Dinheiro enviado para estados e cidades"
            subtitulo={
              <>
                <span className="grifo font-semibold">{moedaCurta(p.emendas.total)}</span> em emendas indicadas desde {p.emendas.porAno[0]?.ano ?? 2020}.
              </>
            }
            origem={
              <>
                <p>{metrica("emendas").calculo}</p>
                <p>{metrica("emendas").limites}</p>
                <Fonte href="https://api.transferegov.gestao.gov.br/transferenciasespeciais/">{p.emendas.fonte}</Fonte>
              </>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="mb-3 font-semibold">Por ano</h3>
                <Barras itens={p.emendas.porAno.map((a) => ({ rotulo: String(a.ano), valor: a.valor }))} formato={moedaCurta} />
              </div>
              <div className="cartao rounded-xl p-4 sm:p-5">
                <h3 className="mb-3 font-semibold">Principais destinos</h3>
                <Barras itens={p.emendas.destinos.slice(0, 8).map((d) => ({ rotulo: `${d.nome}${d.uf ? ` (${d.uf})` : ""}`, valor: d.valor }))} formato={moedaCurta} />
              </div>
            </div>
          </Secao>
        )}

        <Secao
          id="carreira"
          titulo="Carreira, eleições e bens"
          subtitulo={anos != null ? `Primeiro mandato encontrado em ${p.inicioPolitica}.` : "Sem mandatos anteriores nos registros consultados."}
          origem={
            <>
              <p>
                Mandatos vêm do histórico da {p.casa === "senado" ? "Senado" : "Câmara"} e das candidaturas eleitas registradas no TSE (2018, 2022 e 2026). A ligação com o TSE usa
                data de nascimento e nome{p.casa === "camara" ? ", conferidos com os dígitos visíveis do CPF publicados pela Câmara" : ""}.
              </p>
              <p>{metrica("patrimonio").limites}</p>
            </>
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="cartao rounded-xl p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Linha do tempo</h3>
              {p.carreira.length ? (
                <ol className="relative space-y-4 border-l-2 border-line pl-5">
                  {[...p.carreira].reverse().map((c, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-ink" aria-hidden />
                      <p className="tnum text-sm text-ink-3">
                        {c.inicio}
                        {c.fim ? `–${c.fim}` : "–atual"}
                      </p>
                      <p className="font-semibold">{c.cargo}</p>
                      <p className="text-sm text-ink-2">{[c.municipio, c.uf, c.partido].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <Vazio>Sem mandatos registrados nas fontes consultadas.</Vazio>
              )}
            </div>
            <div className="cartao rounded-xl p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Eleições e patrimônio declarado</h3>
              {p.eleicoes.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-ink-3">
                      <tr>
                        <th className="py-1.5 pr-3 font-normal">Ano</th>
                        <th className="py-1.5 pr-3 font-normal">Cargo e resultado</th>
                        <th className="py-1.5 pr-3 text-right font-normal">Votos</th>
                        <th className="py-1.5 text-right font-normal">Bens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...p.eleicoes].reverse().map((e) => (
                        <tr key={`${e.ano}-${e.cargo}`}>
                          <td className="tnum py-2 pr-3 font-semibold">{e.ano}</td>
                          <td className="py-2 pr-3">
                            <span className="block capitalize">{e.cargo.toLowerCase()}</span>
                            <span className="block text-ink-3 capitalize">{(e.situacao ?? "").toLowerCase()}</span>
                          </td>
                          <td className="tnum py-2 pr-3 text-right">{e.votos != null ? numero(e.votos) : VAZIO}</td>
                          <td className="tnum py-2 text-right">{moedaCurta(e.patrimonio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {p.m.patrimonioVariacao != null && (
                    <p className="mt-3 text-sm text-ink-2">
                      Variação do patrimônio declarado entre as duas últimas candidaturas: <b>{pct(p.m.patrimonioVariacao)}</b>.
                    </p>
                  )}
                  {!!p.eleicoes[p.eleicoes.length - 1]?.bens?.length && (
                    <details className="mt-3 text-sm">
                      <summary className="font-semibold text-ink-2 underline decoration-dotted underline-offset-4">Ver bens da última declaração</summary>
                      <ul className="mt-2 divide-y divide-line">
                        {p.eleicoes[p.eleicoes.length - 1].bens!.map((b, i) => (
                          <li key={i} className="flex justify-between gap-4 py-1.5">
                            <span className="min-w-0">
                              <span className="block">{b.tipo}</span>
                              <span className="block truncate text-ink-3">{b.descricao}</span>
                            </span>
                            <span className="tnum shrink-0">{moeda(b.valor)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : (
                <Vazio>Não encontramos candidaturas desta pessoa nas bases do TSE de 2018, 2022 e 2026.</Vazio>
              )}
            </div>
          </div>

          {(p.comissoes.length > 0 || p.frentes.length > 0) && (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {p.comissoes.length > 0 && (
                <div className="cartao rounded-xl p-4 sm:p-5">
                  <h3 className="mb-3 font-semibold">Comissões</h3>
                  <ul className="space-y-1.5 text-sm">
                    {p.comissoes
                      .filter((c) => c.atual)
                      .concat(p.comissoes.filter((c) => !c.atual))
                      .slice(0, 12)
                      .map((c, i) => (
                        <li key={i} className="flex justify-between gap-4">
                          <span className={c.atual ? "" : "text-ink-3"}>{c.nome}</span>
                          <span className="shrink-0 text-ink-3">
                            {c.papel}
                            {c.atual ? "" : " (anterior)"}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {p.frentes.length > 0 && (
                <div className="cartao rounded-xl p-4 sm:p-5">
                  <h3 className="mb-3 font-semibold">Frentes parlamentares ({p.frentes.length})</h3>
                  <p className="text-sm text-ink-2">{p.frentes.slice(0, 30).join(" · ")}</p>
                </div>
              )}
            </div>
          )}
        </Secao>

        <Secao id="fontes" titulo="Contato, redes e fontes" subtitulo="Tudo o que aparece nesta página pode ser conferido nos links abaixo.">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="cartao rounded-xl p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Contato oficial</h3>
              <dl className="space-y-2 text-sm">
                {p.perfil.email && (
                  <div>
                    <dt className="text-ink-3">E-mail</dt>
                    <dd>
                      <a href={`mailto:${p.perfil.email}`} className="link break-all">
                        {p.perfil.email}
                      </a>
                    </dd>
                  </div>
                )}
                {p.perfil.telefone && (
                  <div>
                    <dt className="text-ink-3">Telefone</dt>
                    <dd>{p.perfil.telefone}</dd>
                  </div>
                )}
                {p.perfil.gabinete && (
                  <div>
                    <dt className="text-ink-3">Gabinete</dt>
                    <dd>{p.perfil.gabinete}</dd>
                  </div>
                )}
                {!p.perfil.email && !p.perfil.telefone && <dd className="text-ink-3">Contato não publicado nas fontes consultadas.</dd>}
              </dl>
            </div>
            <div className="cartao rounded-xl p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Redes sociais</h3>
              {p.redes.length ? (
                <ul className="space-y-2 text-sm">
                  {p.redes.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="link font-semibold">
                        {PLATAFORMA[r.plataforma]}
                        {r.handle ? `: @${r.handle}` : ""}
                      </a>
                      <span className="block text-xs text-ink-3">Informado por: {r.fonte}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio>Nenhuma rede social declarada nas fontes oficiais.</Vazio>
              )}
            </div>
            <div className="cartao rounded-xl p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">Fontes desta página</h3>
              <ul className="space-y-2">
                {p.fontes.map((f) => (
                  <li key={f.url + f.nome}>
                    <Fonte href={f.url}>{f.nome}</Fonte>
                  </li>
                ))}
                <li>
                  <Fonte href={urlDadoBruto(`politicos/${p.id}.json`)}>Dados brutos desta página (JSON)</Fonte>
                </li>
              </ul>
              <p className="mt-3 text-xs text-ink-3">Atualizado em {data(p.atualizadoEm.slice(0, 10))}.</p>
            </div>
          </div>
        </Secao>
      </Container>
    </>
  );
}

const TIPOS: Record<string, string> = {
  PL: "Projetos de lei",
  PLP: "Projetos de lei complementar",
  PEC: "Propostas de emenda à Constituição",
  PDL: "Projetos de decreto legislativo",
  PRS: "Projetos de resolução",
  PLS: "Projetos de lei do Senado",
};
