import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GradeRostos } from "@/components/Rostos";
import { BarraVotos } from "@/components/Listas";
import { Plenario } from "@/components/Plenario";
import { Container, Origem, Secao } from "@/components/ui";
import { cadeirasPorPartido } from "@/lib/cadeiras";
import { getAgregados, getPoliticos, getVotacoes } from "@/lib/data";
import { data, moedaCurta, pct } from "@/lib/format";
import { metrica, NOME_CASA, type ChaveMetrica } from "@/lib/metricas";
import { faixaGoverno, nomePartido, resumirPartidos } from "@/lib/partidos";
import type { Casa } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [...new Set((await getPoliticos()).map((p) => p.partido))].map((sigla) => ({ sigla: encodeURIComponent(sigla) }));
}

export async function generateMetadata({ params }: PageProps<"/partido/[sigla]">): Promise<Metadata> {
  const sigla = decodeURIComponent((await params).sigla);
  return { title: `${sigla}: ${nomePartido(sigla)}`, description: `Senadores e deputados do ${sigla}: tamanho, votos, alinhamento com o governo, unidade e gastos.` };
}

const COMPARAR: ChaveMetrica[] = ["presenca", "participacao", "fidelidade", "governismo", "gasto12m", "proposicoes"];

export default async function Partido({ params }: PageProps<"/partido/[sigla]">) {
  const sigla = decodeURIComponent((await params).sigla);
  const [pols, ag, votacoes] = await Promise.all([getPoliticos(), getAgregados(), getVotacoes()]);
  const partidos = resumirPartidos(pols, votacoes);
  const p = partidos.find((x) => x.sigla === sigla);
  if (!p) notFound();
  const ativos = pols.filter((x) => x.emExercicio);
  const plenario = cadeirasPorPartido(
    ativos.filter((x) => x.casa === "camara"),
    partidos,
    sigla,
  );
  const plenarioSenado = cadeirasPorPartido(
    ativos.filter((x) => x.casa === "senado"),
    partidos,
    sigla,
  );
  const f = faixaGoverno(p.governismo);
  const recentes = votacoes.filter((v) => v.porPartido.some((g) => g.partido === sigla && g.sim + g.nao >= 1)).slice(0, 8);
  const ordenar = (casa: Casa) => p.membros.filter((m) => m.casa === casa).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-10">
          <nav aria-label="Trilha" className="mb-4 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>{" "}
            /{" "}
            <Link href="/partidos" className="hover:underline">
              Partidos
            </Link>{" "}
            / <span className="text-ink-2">{sigla}</span>
          </nav>
          <h1 className="display text-5xl font-extrabold sm:text-6xl">{sigla}</h1>
          <p className="mt-1 text-xl text-ink-2">{p.nome}</p>
          <dl className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
            {(
              [
                ["Deputados federais", p.cadeiras.camara],
                ["Senadores", p.cadeiras.senado],
                ["Deputados estaduais", p.cadeiras.assembleia],
              ] as const
            ).map(([r, n]) => (
              <div key={r} className="rounded-xl bg-surface-2 p-3">
                <dt className="text-sm text-ink-3">{r}</dt>
                <dd className="figure mt-1 text-3xl font-bold">{n}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
            {p.governismo != null && (
              <p className="flex items-start gap-3 rounded-xl border border-line p-4">
                <span className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full" style={{ background: f?.cor }} aria-hidden />
                <span>
                  <b className="block">{f?.rotulo}</b>
                  <span className="text-ink-2">Seus deputados votaram como o governo pediu em {pct(p.governismo)} das vezes (valor típico).</span>
                </span>
              </p>
            )}
            {p.unidade != null && (
              <p className="rounded-xl border border-line p-4">
                <b className="block">{p.unidade >= 0.95 ? "Vota muito unido" : p.unidade >= 0.85 ? "Vota unido na maioria das vezes" : "Costuma se dividir nas votações"}</b>
                <span className="text-ink-2">Em média, {pct(p.unidade)} dos membros votam do mesmo lado.</span>
              </p>
            )}
          </div>
        </Container>
      </header>

      <Container>
        {(p.cadeiras.camara > 0 || p.cadeiras.senado > 0) && (
          <Secao titulo="Onde o partido está no plenário" subtitulo="As cadeiras do partido aparecem em destaque. Passe o dedo ou o mouse para ver quem é.">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
              {p.cadeiras.camara > 0 && (
                <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
                  <h3 className="text-center font-semibold">Câmara · {p.cadeiras.camara} de 513</h3>
                  <Plenario cadeiras={plenario.cadeiras} legenda={[]} titulo={`Cadeiras do ${sigla} na Câmara`} />
                </div>
              )}
              {p.cadeiras.senado > 0 && (
                <div className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
                  <h3 className="text-center font-semibold">Senado · {p.cadeiras.senado} de 81</h3>
                  <Plenario cadeiras={plenarioSenado.cadeiras} legenda={[]} titulo={`Cadeiras do ${sigla} no Senado`} />
                </div>
              )}
            </div>
          </Secao>
        )}

        {(["camara", "senado"] as Casa[]).map((casa) => {
          const doPartido = ag.porPartido.find((a) => a.chave === `${casa}|${sigla}`);
          const geral = ag.porCasa.find((a) => a.chave === casa);
          const linhas = COMPARAR.filter((k) => doPartido?.medianas[k] != null && geral?.medianas[k] != null);
          if (!linhas.length) return null;
          return (
            <Secao
              key={casa}
              titulo={`${sigla} comparado com toda a ${casa === "camara" ? "Câmara" : "o Senado"}`}
              subtitulo="Valores típicos (medianas): metade do grupo está acima, metade abaixo."
            >
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {linhas.map((k) => {
                  const d = metrica(k);
                  const a = doPartido!.medianas[k]!;
                  const b = geral!.medianas[k]!;
                  const max = Math.max(a, b) || 1;
                  return (
                    <li key={k} className="rounded-xl border border-line bg-surface p-4">
                      <p className="font-semibold">{d.pergunta}</p>
                      <div className="mt-3 space-y-2 text-sm">
                        {(
                          [
                            [sigla, a, "bg-ink"],
                            [casa === "camara" ? "Toda a Câmara" : "Todo o Senado", b, "bg-ink-3"],
                          ] as const
                        ).map(([r, v, c]) => (
                          <div key={r}>
                            <div className="flex justify-between">
                              <span>{r}</span>
                              <b className="tnum">{d.formato(v)}</b>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-surface-2">
                              <div className={`h-2 rounded-full ${c}`} style={{ width: `${(v / max) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Secao>
          );
        })}

        {recentes.length > 0 && (
          <Secao titulo="Como votou recentemente" subtitulo="Votos dos membros do partido nas votações mais recentes.">
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {recentes.map((v) => {
                const g = v.porPartido.find((x) => x.partido === sigla)!;
                return (
                  <li key={v.id} className="grid gap-3 p-4 sm:grid-cols-[1.3fr_1fr] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-ink-3">
                        {v.casa === "camara" ? "Câmara" : "Senado"} · {data(v.data)} · {v.resultado ?? ""}
                      </p>
                      <Link href={`/votacao/${v.id}`} className="font-semibold hover:underline">
                        {v.titulo}
                      </Link>
                      <p className="line-clamp-1 text-sm text-ink-2">{v.descricao.split(" | ")[0]}</p>
                    </div>
                    <BarraVotos sim={g.sim} nao={g.nao} outros={g.outros} />
                  </li>
                );
              })}
            </ul>
          </Secao>
        )}

        {(["senado", "camara", "assembleia"] as Casa[]).map((casa) => {
          const lista = ordenar(casa);
          if (!lista.length) return null;
          return (
            <Secao key={casa} titulo={`${NOME_CASA[casa]} (${lista.length})`}>
              <GradeRostos membros={lista} detalhe={(m) => m.uf} />
            </Secao>
          );
        })}

        <Origem titulo="Como calculamos">
          <p>{metrica("governismo").calculo}</p>
          <p>
            Unidade: em cada votação nominal com pelo menos 3 membros votando Sim ou Não, a parcela do lado da maioria do partido; média das votações. Gasto típico:{" "}
            {moedaCurta(p.gastoMediano)} (mediana dos membros no Congresso).
          </p>
          <p>
            Contagem de membros a partir das listas oficiais de quem está em exercício na Câmara, no Senado e nas assembleias (ou eleitos em 2022, quando a assembleia não publica a
            lista).
          </p>
        </Origem>
      </Container>
    </>
  );
}
