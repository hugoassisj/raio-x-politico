import Link from "next/link";
import { ArrowRight, BookOpen, Landmark, MapPin, Users } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Busca } from "@/components/Busca";
import { AtalhoEstado } from "@/components/AtalhoEstado";
import { IconeAssunto } from "@/components/Icone";
import { GradePerguntas } from "@/components/Perguntas";
import { CartaoProjeto, LinhaPolitico } from "@/components/Listas";
import { MapaBrasil, type CamadaMapa } from "@/components/MapaBrasil";
import { Plenario } from "@/components/Plenario";
import { Container, Fonte } from "@/components/ui";
import { cadeirasPorPartido } from "@/lib/cadeiras";
import { ASSUNTOS } from "@/lib/assuntos";
import { getExplicacoes, getFalasRecentes, getMaterias, getMeta, getPoliticos, getVotacoes } from "@/lib/data";
import { agruparPorProjeto } from "@/lib/projetos";
import { data, moedaCurta, numero, pct, plural } from "@/lib/format";
import { resumirPartidos } from "@/lib/partidos";
import { median } from "@/lib/stats";
import type { PoliticoResumo } from "@/lib/types";
import { ESTADOS } from "@/lib/ufs";

function porUf(pols: PoliticoResumo[], f: (ps: PoliticoResumo[]) => number | undefined) {
  return Object.fromEntries(ESTADOS.map((e) => [e.uf, f(pols.filter((p) => p.uf === e.uf))]));
}

function ordenar(pols: PoliticoResumo[], k: keyof PoliticoResumo["m"], dir: 1 | -1, n = 5) {
  return pols
    .filter((p) => p.casa === "camara" && p.emExercicio && typeof p.m[k] === "number")
    .sort((a, b) => dir * ((a.m[k] as number) - (b.m[k] as number)))
    .slice(0, n);
}

/** Most recent speeches, one per person, so a single long session does not fill the section. */
function variedade<T extends { pid: string }>(falas: T[], n = 6): T[] {
  const vistos = new Set<string>();
  return falas.filter((f) => !vistos.has(f.pid) && vistos.add(f.pid)).slice(0, n);
}

export default async function Home() {
  const [pols, votacoes, falas, meta, materias, explicacoes] = await Promise.all([getPoliticos(), getVotacoes(), getFalasRecentes(), getMeta(), getMaterias(), getExplicacoes()]);
  const projetos = agruparPorProjeto(votacoes, materias, explicacoes);
  const ativos = pols.filter((p) => p.emExercicio);
  const fed = ativos.filter((p) => p.casa === "camara");
  const sen = ativos.filter((p) => p.casa === "senado");
  const est = ativos.filter((p) => p.casa === "assembleia");
  const porId = new Map(pols.map((p) => [p.id, p]));
  const partidos = resumirPartidos(pols, votacoes);
  const camara = cadeirasPorPartido(fed, partidos);
  const senado = cadeirasPorPartido(sen, partidos);

  const mediana = (k: keyof PoliticoResumo["m"]) => (ps: PoliticoResumo[]) =>
    median(
      ps
        .filter((p) => p.casa === "camara")
        .map((p) => p.m[k])
        .filter((x): x is number => typeof x === "number"),
    );
  const camadas: CamadaMapa[] = [
    { id: "estados", rotulo: "Estados", valores: {}, formato: "numero", legenda: "" },
    {
      id: "deputados",
      rotulo: "Deputados por estado",
      valores: porUf(fed, (ps) => ps.length || undefined),
      formato: "numero",
      legenda: "Deputados federais: quanto mais gente no estado, mais cadeiras.",
    },
    {
      id: "gasto",
      rotulo: "Gasto da cota",
      valores: porUf(fed, mediana("gasto12m")),
      formato: "moeda",
      legenda: "Gasto típico (mediana) de um deputado federal do estado em 12 meses.",
    },
    { id: "presenca", rotulo: "Presença", valores: porUf(fed, mediana("presenca")), formato: "pct", legenda: "Presença típica (mediana) dos deputados federais do estado." },
  ];
  const resumoUf = Object.fromEntries(
    ESTADOS.map((e) => [
      e.uf,
      { senadores: sen.filter((p) => p.uf === e.uf).length, federais: fed.filter((p) => p.uf === e.uf).length, estaduais: est.filter((p) => p.uf === e.uf).length },
    ]),
  );

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <h1 className="display text-[2.6rem] font-extrabold sm:text-6xl">Quem te representa?</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-2 sm:text-xl">
              Veja o que fazem seus senadores e deputados: se vão trabalhar, como votam, o que propõem e quanto gastam. Tudo explicado de um jeito simples, com a fonte oficial de
              cada número.
            </p>
            <div className="mt-7 max-w-xl">
              <Busca grande />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3">
              <MapPin size={16} aria-hidden /> Ou toque no seu estado no mapa.
            </p>
            <AtalhoEstado resumoUf={resumoUf} />
            <p className="mt-5 text-sm">
              <Link href="/sobre" className="link">
                Primeira vez aqui? Entenda o que é o Raio-X Político
              </Link>
            </p>
          </div>
          <div id="mapa" className="scroll-mt-20">
            <MapaBrasil camadas={camadas} resumoUf={resumoUf} />
          </div>
        </Container>
      </section>

      <Container className="space-y-20 pt-14">
        <section aria-labelledby="perguntas">
          <h2 id="perguntas" className="display text-3xl font-bold sm:text-4xl">
            O que dá para descobrir aqui
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-ink-2">Escolha uma pergunta. Cada uma leva direto à resposta, com a fonte oficial.</p>
          <div className="mt-6">
            <GradePerguntas limite={6} />
          </div>
          <p className="mt-4">
            <Link href="/sobre#perguntas" className="link">
              Ver todas as perguntas
            </Link>
          </p>
        </section>

        {projetos.length > 0 && (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-sm font-bold text-accent-ink">
                  <span className="pulso" aria-hidden /> Últimas decisões
                </p>
                <h2 className="display mt-1 text-3xl font-bold sm:text-4xl">O que foi votado</h2>
                <p className="mt-2 text-lg text-ink-2">Os projetos mais recentes, explicados em palavras simples. Toque para ver como votaram os representantes do seu estado.</p>
              </div>
              <Link href="/votacoes" className="botao-sec">
                Ver todos <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projetos.slice(0, 6).map((p, i) => (
                <CartaoProjeto key={p.chave} p={p} i={i} />
              ))}
            </div>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Ver por assunto">
              {ASSUNTOS.filter((a) => projetos.some((p) => p.assuntos.includes(a.id))).map((a) => (
                <li key={a.id}>
                  <Link href={`/votacoes?assunto=${a.id}`} className="chip">
                    <IconeAssunto nome={a.icone} className="h-4 w-4" />
                    {a.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {fed.length > 0 && (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="display text-3xl font-bold sm:text-4xl">O Congresso hoje</h2>
                <p className="mt-2 text-lg text-ink-2">
                  Cada bolinha é uma cadeira. As cores mostram o quanto o partido de cada pessoa costuma votar junto com o governo federal, calculado a partir das votações
                  registradas.
                </p>
              </div>
              <Link href="/partidos" className="botao-sec">
                Ver partidos <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
              <div className="cartao p-4 sm:p-6">
                <h3 className="text-center font-semibold">
                  Câmara dos Deputados <span className="text-ink-3">· {fed.length} deputados</span>
                </h3>
                <Plenario cadeiras={camara.cadeiras} legenda={camara.legenda} titulo="Plenário da Câmara dos Deputados por posição do partido" />
              </div>
              <div className="cartao p-4 sm:p-6">
                <h3 className="text-center font-semibold">
                  Senado Federal <span className="text-ink-3">· {sen.length} senadores</span>
                </h3>
                <Plenario cadeiras={senado.cadeiras} legenda={senado.legenda} titulo="Plenário do Senado por posição do partido" />
                <p className="mt-2 text-center text-xs text-ink-3">No Senado, a cor usa a posição do partido medida na Câmara.</p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="display text-3xl font-bold sm:text-4xl">Entenda em 1 minuto</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                Icone: Landmark,
                titulo: "Câmara dos Deputados",
                numero: "513 deputados federais",
                texto: "Representam a população. Estados com mais gente têm mais deputados. Mandato de 4 anos. Criam e votam leis para o país inteiro.",
              },
              {
                Icone: Users,
                titulo: "Senado Federal",
                numero: "81 senadores",
                texto: "Representam os estados: são 3 por estado, do Acre a São Paulo. Mandato de 8 anos. Revisam as leis que vêm da Câmara.",
              },
              {
                Icone: MapPin,
                titulo: "Assembleias Legislativas",
                numero: `${numero(est.length)} deputados estaduais`,
                texto: "Cuidam das leis do seu estado, como regras da polícia estadual, escolas estaduais e impostos estaduais. Mandato de 4 anos.",
              },
            ].map(({ Icone, titulo, numero: n, texto }) => (
              <div key={titulo} className="cartao p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mark text-mark-ink" aria-hidden>
                  <Icone size={22} />
                </span>
                <h3 className="mt-3 text-lg font-bold">{titulo}</h3>
                <p className="figure mt-1 text-2xl font-bold">{n}</p>
                <p className="mt-2 text-ink-2">{texto}</p>
              </div>
            ))}
          </div>
          <Link href="/como-funciona" className="mt-5 inline-flex items-center gap-2 text-lg font-semibold text-link hover:underline">
            <BookOpen size={20} aria-hidden /> Como uma lei é aprovada e quantos votos ela precisa
          </Link>
        </section>

        {fed.length > 0 && (
          <section>
            <h2 className="display text-3xl font-bold sm:text-4xl">Quem está nos extremos</h2>
            <p className="mt-2 max-w-2xl text-lg text-ink-2">Sem nota nem juízo: só os números. Toque em um nome para entender o contexto.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["presenca", "Menor presença no Plenário", 1, pct],
                  ["gasto12m", "Maiores gastos com a cota", -1, moedaCurta],
                  ["participacao", "Menos votações registradas", 1, pct],
                ] as const
              ).map(([k, titulo, dir, fmt]) => (
                <div key={k} className="cartao p-3">
                  <div className="px-2 pb-1 pt-2">
                    <h3 className="font-bold">{titulo}</h3>
                    <p className="text-xs text-ink-3">Deputados federais, últimos 12 meses</p>
                  </div>
                  {ordenar(pols, k, dir).map((p) => (
                    <LinhaPolitico key={p.id} p={p} valor={fmt(p.m[k])} />
                  ))}
                  <Link href={`/politicos?casa=camara&ordem=${k}&dir=${dir === 1 ? "asc" : "desc"}`} className="link mt-1 block px-2 pb-2 text-sm">
                    Ver a lista completa
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {falas.length > 0 && (
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="display text-3xl font-bold sm:text-4xl">O que estão dizendo</h2>
                <p className="mt-2 text-lg text-ink-2">Discursos oficiais mais recentes, com link para o registro original.</p>
              </div>
              <Link href="/falas" className="link shrink-0">
                Buscar por tema
              </Link>
            </div>
            <ul className="grid gap-4 md:grid-cols-2">
              {variedade(falas).map((f) => {
                const p = porId.get(f.pid);
                return (
                  <li key={f.id} className="flex gap-4 cartao p-4">
                    {p && <Avatar src={p.foto} nome={p.nome} size={52} />}
                    <div className="min-w-0">
                      <p className="text-sm text-ink-3">
                        {p ? (
                          <Link href={`/politico/${p.id}`} className="font-semibold text-ink hover:underline">
                            {p.nome}
                          </Link>
                        ) : null}
                        {p ? ` · ${p.partido}-${p.uf}` : ""} · {data(f.data)}
                      </p>
                      <p className="mt-1 line-clamp-3">{f.resumoOficial ?? f.texto}</p>
                      <p className="mt-2">
                        <Fonte href={f.url}>Ver registro oficial</Fonte>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="grid gap-6 rounded-3xl bg-banda p-6 text-banda-ink sm:p-10 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <h2 className="display text-3xl font-bold">Nenhum número sem fonte</h2>
            <p className="mt-3 max-w-xl text-banda-ink/80">
              Cada dado vem de um site oficial: Câmara, Senado, TSE, Transferegov e assembleias. Ao lado de cada número há a explicação de como foi calculado e o link para o
              registro original. Os dados completos podem ser baixados e o código é aberto.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/dados" className="rounded-lg bg-mark px-4 py-2.5 font-semibold text-mark-ink hover:opacity-90">
              Ver fontes e metodologia
            </Link>
            {meta && (
              <p className="w-full text-sm text-banda-ink/60 md:text-right">
                {plural(meta.fontes.filter((f) => f.status !== "ignorado").length, "fonte consultada", "fontes consultadas")} na última atualização
              </p>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}
