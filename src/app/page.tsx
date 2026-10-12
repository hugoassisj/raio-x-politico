import Link from "next/link";
import { Busca } from "@/components/Busca";
import { CartaoVotacao, LinhaPolitico } from "@/components/Listas";
import { Avatar } from "@/components/Avatar";
import { Container, Fonte } from "@/components/ui";
import { getFalasRecentes, getMeta, getPoliticos, getVotacoes } from "@/lib/data";
import { data, moedaCurta, numero, pct, plural } from "@/lib/format";
import { ESTADOS } from "@/lib/ufs";
import type { PoliticoResumo } from "@/lib/types";

function MapaEstados() {
  return (
    <nav aria-label="Escolha seu estado">
      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" style={{ gridTemplateRows: "repeat(8, minmax(0, 1fr))" }}>
        {ESTADOS.map((e) => (
          <li key={e.uf} style={{ gridColumn: e.col, gridRow: e.row }}>
            <Link
              href={`/estado/${e.uf.toLowerCase()}`}
              title={e.nome}
              className="flex aspect-square items-center justify-center rounded-lg border border-line bg-surface font-display text-sm font-bold tracking-wide text-ink transition-colors hover:border-ink hover:bg-mark hover:text-mark-ink sm:text-base"
            >
              <span aria-hidden>{e.uf}</span>
              <span className="sr-only">{e.nome}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ordenar(pols: PoliticoResumo[], casa: PoliticoResumo["casa"], k: keyof PoliticoResumo["m"], dir: 1 | -1, n = 5) {
  return pols
    .filter((p) => p.casa === casa && p.emExercicio && typeof p.m[k] === "number")
    .sort((a, b) => dir * ((a.m[k] as number) - (b.m[k] as number)))
    .slice(0, n);
}

export default async function Home() {
  const [pols, votacoes, falas, meta] = await Promise.all([getPoliticos(), getVotacoes(), getFalasRecentes(), getMeta()]);
  const porId = new Map(pols.map((p) => [p.id, p]));
  const fed = pols.filter((p) => p.casa === "camara").length;
  const sen = pols.filter((p) => p.casa === "senado").length;
  const est = pols.filter((p) => p.casa === "assembleia").length;
  const gastoTotal = pols.reduce((s, p) => s + (p.m.gasto12m ?? 0), 0);
  const recentes = votacoes.slice(0, 6);

  return (
    <>
      <section className="border-b border-line">
        <Container className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <h1 className="display text-[2.6rem] font-extrabold sm:text-6xl">Quem te representa?</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-2 sm:text-xl">
              Veja se seus senadores e deputados aparecem para trabalhar, como votam, o que propõem e quanto gastam. Tudo com dados públicos oficiais e a fonte de cada número.
            </p>
            <div className="mt-7 max-w-xl">
              <Busca grande />
            </div>
            <p className="mt-3 text-sm text-ink-3">Ou toque no seu estado para ver todos os seus representantes.</p>
          </div>
          <div className="mx-auto w-full max-w-[360px] sm:max-w-[400px]">
            <MapaEstados />
          </div>
        </Container>
      </section>

      {pols.length > 0 && (
        <section className="border-b border-line bg-surface">
          <Container className="grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
            <div>
              <p className="figure text-3xl font-bold">{numero(sen)}</p>
              <p className="text-sm text-ink-2">senadores</p>
            </div>
            <div>
              <p className="figure text-3xl font-bold">{numero(fed)}</p>
              <p className="text-sm text-ink-2">deputados federais</p>
            </div>
            <div>
              <p className="figure text-3xl font-bold">{numero(est)}</p>
              <p className="text-sm text-ink-2">deputados estaduais e distritais</p>
            </div>
            <div>
              <p className="figure text-3xl font-bold">
                <span className="grifo">{moedaCurta(gastoTotal)}</span>
              </p>
              <p className="text-sm text-ink-2">gastos com a cota parlamentar em 12 meses</p>
            </div>
          </Container>
        </section>
      )}

      <Container className="space-y-16 pt-12">
        {recentes.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="display text-2xl font-bold sm:text-3xl">Votações mais recentes</h2>
                <p className="mt-1 text-ink-2">Votações nominais no Plenário, em que cada voto fica registrado.</p>
              </div>
              <Link href="/votacoes" className="link shrink-0 text-sm">
                Ver todas
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentes.map((v) => (
                <CartaoVotacao key={v.id} v={v} />
              ))}
            </div>
          </section>
        )}

        {pols.length > 0 && (
          <section>
            <h2 className="display text-2xl font-bold sm:text-3xl">Ordene todos por um critério</h2>
            <p className="mt-1 max-w-2xl text-ink-2">Os extremos de cada lista, sem nota nem juízo. Toque em um critério para ver a lista completa e entender como ele é calculado.</p>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["presenca", "Menor presença no Plenário", 1, pct],
                  ["gasto12m", "Maiores gastos com a cota", -1, moedaCurta],
                  ["participacao", "Menos votações nominais", 1, pct],
                ] as const
              ).map(([k, titulo, dir, fmt]) => {
                const lista = ordenar(pols, "camara", k, dir);
                if (!lista.length) return null;
                return (
                  <div key={k} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center justify-between px-2 pb-2 pt-1">
                      <h3 className="font-semibold">{titulo}</h3>
                      <span className="text-xs text-ink-3">deputados federais</span>
                    </div>
                    {lista.map((p) => (
                      <LinhaPolitico key={p.id} p={p} valor={fmt(p.m[k])} />
                    ))}
                    <Link href={`/politicos?casa=camara&ordem=${k}&dir=${dir === 1 ? "asc" : "desc"}`} className="link mt-1 block px-2 pb-1 text-sm">
                      Ver lista completa
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {falas.length > 0 && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="display text-2xl font-bold sm:text-3xl">O que estão dizendo</h2>
                <p className="mt-1 text-ink-2">Discursos oficiais e publicações recentes, com link para o registro original.</p>
              </div>
              <Link href="/falas" className="link shrink-0 text-sm">
                Buscar nas falas
              </Link>
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {falas.slice(0, 6).map((f) => {
                const p = porId.get(f.pid);
                return (
                  <li key={f.id} className="flex gap-3 p-4">
                    {p && <Avatar src={p.foto} nome={p.nome} size={40} />}
                    <div className="min-w-0">
                      <p className="text-sm text-ink-3">
                        {p ? (
                          <Link href={`/politico/${p.id}`} className="font-semibold text-ink hover:underline">
                            {p.nome}
                          </Link>
                        ) : null}
                        {p ? ` (${p.partido}-${p.uf})` : ""} · {data(f.data)} · {f.titulo ?? f.tipo}
                      </p>
                      <p className="mt-1 line-clamp-2">{f.texto}</p>
                      <Fonte href={f.url}>{f.fonte}</Fonte>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="grid gap-6 rounded-2xl bg-ink p-6 text-paper sm:p-10 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <h2 className="display text-2xl font-bold sm:text-3xl">Nenhum número sem fonte</h2>
            <p className="mt-3 max-w-xl text-paper/80">
              Cada dado vem de um site oficial: Câmara, Senado, TSE, Transferegov e assembleias. Ao lado de cada número há uma explicação de como foi calculado e um link para o registro original. Os
              dados completos podem ser baixados e o código é aberto.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/dados" className="rounded-lg bg-mark px-4 py-2.5 font-semibold text-mark-ink hover:opacity-90">
              Ver fontes e metodologia
            </Link>
            {meta && <p className="w-full text-sm text-paper/60 md:text-right">{plural(meta.fontes.filter((f) => f.status !== "ignorado").length, "fonte consultada", "fontes consultadas")} na última atualização</p>}
          </div>
        </section>
      </Container>
    </>
  );
}
