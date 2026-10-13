import { CorPartido, LogoPartido, SiglaPartido } from "@/components/Partido";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Plenario } from "@/components/Plenario";
import { Container, Origem, Secao } from "@/components/base";
import { cadeirasPorPartido } from "@/lib/cadeiras";
import { getPoliticos, getVotacoes } from "@/lib/data";
import { moedaCurta, pct } from "@/lib/format";
import { COR_SEM_DADO, faixaGoverno, resumirPartidos } from "@/lib/partidos";

export const metadata: Metadata = {
  title: "Partidos",
  description: "Quantas cadeiras cada partido tem na Câmara, no Senado e nas assembleias, o quanto vota com o governo, o quanto vota unido e quanto gasta.",
};

export default async function Partidos() {
  const [pols, votacoes] = await Promise.all([getPoliticos(), getVotacoes()]);
  const partidos = resumirPartidos(pols, votacoes);
  const ativos = pols.filter((p) => p.emExercicio);
  const camara = cadeirasPorPartido(
    ativos.filter((p) => p.casa === "camara"),
    partidos,
  );
  const senado = cadeirasPorPartido(
    ativos.filter((p) => p.casa === "senado"),
    partidos,
  );
  const federais = partidos.filter((p) => p.cadeiras.camara + p.cadeiras.senado > 0);
  const soEstaduais = partidos.filter((p) => p.cadeiras.camara + p.cadeiras.senado === 0);

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Partidos</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed text-ink-2">
        Partidos reúnem políticos que defendem ideias parecidas. Aqui você vê o tamanho de cada um no Congresso, se costuma votar junto com o governo federal e se seus membros
        votam unidos.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="cartao p-4 sm:p-6">
          <h2 className="text-center text-lg font-bold">Câmara dos Deputados</h2>
          <Plenario cadeiras={camara.cadeiras} legenda={camara.legenda} titulo="Câmara por posição do partido em relação ao governo" />
        </div>
        <div className="cartao p-4 sm:p-6">
          <h2 className="text-center text-lg font-bold">Senado Federal</h2>
          <Plenario cadeiras={senado.cadeiras} legenda={senado.legenda} titulo="Senado por posição do partido em relação ao governo" />
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-3">
        A cor vem da mediana de quanto os deputados federais do partido votaram igual à orientação do governo nas votações dos últimos 12 meses. Os partidos estão organizados do
        que mais vota com o governo (à esquerda do desenho) ao que mais vota contra (à direita). Isso não é uma classificação de esquerda ou direita.
      </p>

      <Secao titulo="Cada partido em números" subtitulo="Toque em um partido para ver todos os seus membros, com foto.">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {federais.map((p) => {
            const f = faixaGoverno(p.governismo);
            return (
              <li key={p.sigla}>
                <Link href={`/partido/${encodeURIComponent(p.sigla)}`} className="group block h-full cartao p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <LogoPartido sigla={p.sigla} altura={40} />
                      <div className="min-w-0">
                        <p className="display flex items-center gap-2 text-2xl font-extrabold group-hover:underline">
                          <CorPartido sigla={p.sigla} />
                          {p.sigla}
                        </p>
                        <p className="truncate text-sm text-ink-3">{p.nome}</p>
                      </div>
                    </div>
                    <span className="mt-1 inline-block h-4 w-4 shrink-0 rounded-full" style={{ background: f?.cor ?? COR_SEM_DADO }} aria-hidden />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface-2 py-2">
                      <dt className="text-xs text-ink-3">Deputados</dt>
                      <dd className="figure text-xl font-bold">{p.cadeiras.camara}</dd>
                    </div>
                    <div className="rounded-lg bg-surface-2 py-2">
                      <dt className="text-xs text-ink-3">Senadores</dt>
                      <dd className="figure text-xl font-bold">{p.cadeiras.senado}</dd>
                    </div>
                    <div className="rounded-lg bg-surface-2 py-2">
                      <dt className="text-xs text-ink-3">Estaduais</dt>
                      <dd className="figure text-xl font-bold">{p.cadeiras.assembleia}</dd>
                    </div>
                  </dl>
                  <dl className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Vota com o governo</dt>
                      <dd className="font-semibold tnum">{p.governismo != null ? `${pct(p.governismo)} das vezes` : "sem dados"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Membros votam unidos</dt>
                      <dd className="font-semibold tnum">{p.unidade != null ? `${pct(p.unidade)} em média` : "sem dados"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Gasto típico da cota</dt>
                      <dd className="font-semibold tnum">{moedaCurta(p.gastoMediano)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex -space-x-2">
                    {p.membros
                      .filter((m) => m.casa !== "assembleia")
                      .slice(0, 8)
                      .map((m) => (
                        <Avatar key={m.id} src={m.foto} nome={m.nome} size={30} className="ring-2 ring-surface" />
                      ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Secao>

      {soEstaduais.length > 0 && (
        <Secao titulo="Partidos só nas assembleias" subtitulo="Partidos com deputados estaduais, mas sem cadeiras no Congresso Nacional.">
          <ul className="flex flex-wrap gap-2">
            {soEstaduais.map((p) => (
              <li key={p.sigla}>
                <Link
                  href={`/partido/${encodeURIComponent(p.sigla)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 hover:border-ink-3"
                >
                  <SiglaPartido sigla={p.sigla} logo className="font-bold" /> <span className="text-sm text-ink-3">{p.cadeiras.assembleia} estaduais</span>
                </Link>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Origem titulo="Como calculamos">
        <p>
          <b>Vota com o governo:</b> mediana, entre os deputados federais do partido, da porcentagem de votações em que cada um votou igual à orientação da liderança do Governo na
          Câmara.
        </p>
        <p>
          <b>Membros votam unidos:</b> em cada votação nominal com pelo menos 3 membros do partido votando Sim ou Não, a parcela que votou do mesmo lado que a maioria do partido. O
          número é a média dessas votações. 100% significa que todos sempre votam igual.
        </p>
        <p>
          <b>Gasto típico da cota:</b> mediana do gasto em 12 meses dos deputados federais e senadores do partido.
        </p>
      </Origem>
    </Container>
  );
}
