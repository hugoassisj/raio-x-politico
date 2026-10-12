import type { Metadata } from "next";
import { GLOSSARIO } from "@/lib/linguagem";
import { CARGOS, NIVEL } from "@/lib/cargos";
import { QuemResolve } from "@/components/QuemResolve";
import { MiniPlenario } from "@/components/Plenario";
import { Container, Fonte, Secao } from "@/components/ui";
import { numero } from "@/lib/format";
import { descricaoExigencia, MEMBROS, REGRAS, votosNecessarios } from "@/lib/quorum";

export const metadata: Metadata = {
  title: "Como funciona a política no Brasil",
  description: "Quem resolve cada problema do dia a dia, o que faz cada cargo, como uma ideia vira lei e quantos votos cada proposta precisa, explicado de forma simples.",
};

const PASSOS = [
  { titulo: "Alguém apresenta a ideia", texto: "Um deputado, um senador, o Presidente, o Judiciário ou até a população (com assinaturas) apresenta um projeto." },
  { titulo: "Comissões estudam", texto: "Grupos menores de parlamentares, chamados comissões, analisam o texto, ouvem especialistas e podem mudar a proposta." },
  { titulo: "O plenário vota", texto: "Todos os parlamentares da casa votam. Em votações nominais, o voto de cada um fica registrado com nome." },
  { titulo: "A outra casa revisa", texto: "O que a Câmara aprova vai para o Senado, e vice-versa. Se a outra casa mudar o texto, ele pode voltar." },
  { titulo: "O Presidente decide", texto: "O Presidente pode sancionar (aprovar) ou vetar (barrar) a lei, toda ou em parte. Mudanças na Constituição não passam por esta etapa." },
  { titulo: "O Congresso pode insistir", texto: "Se houver veto, Câmara e Senado votam juntos e podem derrubá-lo. Aí a lei vale mesmo sem a concordância do Presidente." },
];

export default function ComoFunciona() {
  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Como funciona</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed text-ink-2">
        A política no Brasil tem três níveis: a cidade, o estado e o país. Em cada um, uma pessoa governa (prefeito, governador, Presidente) e um grupo faz as leis e fiscaliza
        (vereadores, deputados estaduais, deputados federais e senadores). Aqui você descobre quem cuida de cada coisa e como as decisões são tomadas.
      </p>
      <nav aria-label="Nesta página" className="mt-6 flex flex-wrap gap-2">
        {[
          ["#quem-resolve", "Quem resolve isso?"],
          ["#cargos", "O que faz cada cargo"],
          ["#lei", "Como uma ideia vira lei"],
          ["#votos", "Quantos votos cada proposta precisa"],
          ["#palavras", "Palavras que aparecem muito"],
        ].map(([h, r]) => (
          <a key={h} href={h} className="chip">
            {r}
          </a>
        ))}
      </nav>

      <Secao
        id="quem-resolve"
        titulo="Quem resolve isso?"
        subtitulo="Cada problema do dia a dia é responsabilidade de um nível de governo: cidade, estado ou país. Saber quem cuida ajuda a cobrar a pessoa certa."
      >
        <QuemResolve />
      </Secao>

      <Secao id="cargos" titulo="O que faz cada cargo" subtitulo="Do vereador ao Presidente: o que cada um decide, quantos são e por quanto tempo ficam.">
        {(["municipio", "estado", "uniao"] as const).map((nivel) => (
          <div key={nivel} className="mb-8">
            <h3 className="mb-3 text-sm font-bold text-accent-ink">
              {NIVEL[nivel].nome}: {NIVEL[nivel].quem}
            </h3>
            <ul className="grid gap-4 md:grid-cols-2">
              {CARGOS.filter((c) => c.nivel === nivel).map((c) => (
                <li key={c.id} className="cartao p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-lg font-bold">{c.nome}</h4>
                    {c.acompanhado ? (
                      <span className="rounded-md bg-sim-soft px-2 py-0.5 text-xs font-bold text-sim">Acompanhado no site</span>
                    ) : (
                      <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold text-ink-3">Aparece na vida pública de quem acompanhamos</span>
                    )}
                  </div>
                  <p className="mt-1 text-lg">{c.faz}</p>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-2">
                    {c.exemplos.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <dt className="text-ink-3">Quantos</dt>
                    <dd>{c.quantos}</dd>
                    <dt className="text-ink-3">Mandato</dt>
                    <dd>{c.mandato}</dd>
                    <dt className="text-ink-3">Como é eleito</dt>
                    <dd>{c.comoEleito}</dd>
                  </dl>
                  <p className="mt-2 text-xs text-ink-3">{c.artigo}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="cartao p-4 text-ink-2">
          <b className="text-ink">Eleição proporcional, em poucas palavras:</b> para vereador e deputado, os votos de todos os candidatos de um partido são somados. Essa soma
          define quantas cadeiras o partido ganha, e elas vão para os seus candidatos mais votados. Por isso alguém com muitos votos pode ajudar a eleger colegas do mesmo partido,
          e alguém com menos votos pode ser eleito.
        </p>
      </Secao>

      <Secao id="lei" titulo="Como uma ideia vira lei">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="cartao p-5">
              <span className="figure inline-flex h-10 w-10 items-center justify-center rounded-full bg-mark text-lg font-bold text-mark-ink">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-1 text-ink-2">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao
        id="votos"
        titulo="Quantos votos cada proposta precisa"
        subtitulo="Quanto mais importante a mudança, mais votos são necessários. Nos desenhos, as cadeiras escuras mostram o mínimo de votos Sim (ou de presentes, na maioria simples)."
      >
        <ul className="space-y-5">
          {REGRAS.map((r) => (
            <li key={r.tipo} className="grid gap-6 cartao p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold text-ink-3">{r.tipo === "VET" ? "Veto" : r.tipo}</p>
                <h3 className="text-2xl font-bold">{r.nome}</h3>
                <p className="mt-1 text-ink-2">{r.oQueE}</p>
                <p className="mt-3">
                  Precisa de <b>{descricaoExigencia(r.exigencia)}</b>
                  {r.turnos > 1 ? `, em ${r.turnos} turnos em cada casa` : ""}.
                </p>
                <p className="mt-2 text-sm">
                  <Fonte href={r.url}>{r.artigo}</Fonte>
                </p>
              </div>
              {(["camara", "senado"] as const).map((casa) => {
                const n = votosNecessarios(r.exigencia, casa);
                return (
                  <figure key={casa}>
                    <MiniPlenario total={MEMBROS[casa]} destaque={n} rotulo={`${n} de ${MEMBROS[casa]}`} />
                    <figcaption className="mt-1 text-center">
                      <b className="figure text-2xl">{numero(n)}</b> <span className="text-ink-2">de {MEMBROS[casa]}</span>
                      <span className="block text-sm text-ink-3">
                        {casa === "camara" ? "deputados" : "senadores"} {r.exigencia === "simples" ? "presentes (e mais Sim que Não)" : "votando Sim"}
                      </span>
                    </figcaption>
                  </figure>
                );
              })}
            </li>
          ))}
        </ul>
      </Secao>

      <Secao id="palavras" titulo="Palavras que aparecem muito">
        <dl className="grid gap-4 sm:grid-cols-2">
          {[...GLOSSARIO]
            .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"))
            .map((g) => (
              <div key={g.termo} id={`termo-${g.termo.toLowerCase().replace(/\s+/g, "-")}`} className="cartao p-4">
                <dt className="font-bold">{g.termo}</dt>
                <dd className="mt-1 text-ink-2">{g.explicacao}</dd>
              </div>
            ))}
        </dl>
      </Secao>
    </Container>
  );
}
