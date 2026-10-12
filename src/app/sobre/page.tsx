import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleSlash, Code2, Eye, HandHeart, Link2, MousePointerClick, Search, Sparkles } from "lucide-react";
import { Busca } from "@/components/Busca";
import { GradePerguntas } from "@/components/Perguntas";
import { Container } from "@/components/ui";
import { getMeta, getPoliticos } from "@/lib/data";
import { numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "O que é o Raio-X Político",
  description:
    "Um site gratuito e apartidário que mostra, em palavras simples, o que fazem senadores, deputados federais e deputados estaduais, com a fonte oficial de cada número.",
};

const REPO = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/hugoassisj/raio-x-politico";

export default async function Sobre() {
  const [pols, meta] = await Promise.all([getPoliticos(), getMeta()]);
  const ativos = pols.filter((p) => p.emExercicio);
  const n = (casa: string) => ativos.filter((p) => p.casa === casa).length;
  const fontes = meta?.fontes.filter((f) => f.status === "ok" || f.status === "parcial").length ?? 0;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <Container className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-sm font-bold text-accent-ink">O que é o Raio-X Político</p>
            <h1 className="display mt-2 max-w-4xl text-4xl font-extrabold sm:text-6xl">
              Um raio-x de quem você <span className="grifo">elegeu</span>.
            </h1>
            <p className="mt-5 max-w-3xl text-xl leading-relaxed text-ink-2 sm:text-2xl sm:leading-snug">
              Aqui você vê, em palavras simples, o que fazem os {numero(n("senado"))} senadores, os {numero(n("camara"))} deputados federais e os {numero(n("assembleia"))}{" "}
              deputados estaduais do Brasil: se vão trabalhar, como votam, o que propõem, quanto gastam e o que dizem.
            </p>
            <p className="mt-4 max-w-3xl text-lg text-ink-2">É gratuito, não tem partido e não pede cadastro. Cada número leva ao site oficial de onde ele veio.</p>
            <div className="mt-8 max-w-xl">
              <Busca grande />
            </div>
          </div>
          <aside className="cartao p-6" aria-label="O que acompanhamos">
            <p className="text-sm font-bold text-ink-3">O que acompanhamos hoje</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
              {[
                [numero(ativos.length), "políticos em exercício"],
                [numero(meta?.totais.votacoes ?? 0), "votações com o voto de cada um"],
                [numero(meta?.totais.votosIndividuais ?? 0), "votos individuais registrados"],
                [numero(meta?.totais.despesas ?? 0), "notas fiscais de gastos"],
              ].map(([v, r]) => (
                <div key={r}>
                  <dt className="sr-only">{r}</dt>
                  <dd className="figure text-3xl font-bold">{v}</dd>
                  <dd className="mt-1 text-sm text-ink-2">{r}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-3">
              <span className="pulso" aria-hidden /> Atualizado todos os dias, de madrugada
            </p>
          </aside>
        </Container>
      </section>

      <Container className="space-y-20 py-14">
        <section aria-labelledby="por-que">
          <h2 id="por-que" className="display text-3xl font-bold sm:text-4xl">
            Por que este site existe
          </h2>
          <div className="mt-5 grid gap-6 text-lg leading-relaxed text-ink-2 md:grid-cols-2">
            <p>
              Tudo o que um político faz no Congresso fica registrado: cada presença, cada voto, cada nota fiscal. Esses dados são públicos. O problema é que estão espalhados em
              dezenas de sites do governo, escritos em linguagem técnica, cheios de siglas.
            </p>
            <p>
              Quem quer saber algo simples, como <b className="text-ink">&ldquo;meu deputado vai trabalhar?&rdquo;</b>, desiste antes de achar a resposta. O Raio-X Político junta
              esses dados todos os dias, traduz para o português do dia a dia e mostra cada pessoa ao lado dos colegas, para você tirar suas próprias conclusões.
            </p>
          </div>
        </section>

        <section aria-labelledby="perguntas">
          <h2 id="perguntas" className="display text-3xl font-bold sm:text-4xl">
            Perguntas que você pode responder aqui
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-ink-2">Toque em uma pergunta para ir direto à resposta.</p>
          <div className="mt-6">
            <GradePerguntas comResposta />
          </div>
        </section>

        <section aria-labelledby="como-usar">
          <h2 id="como-usar" className="display text-3xl font-bold sm:text-4xl">
            Como usar, em 3 passos
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { Icone: Search, titulo: "Procure", texto: "Digite o nome de um político, de um partido ou do seu estado. Ou toque no seu estado no mapa da página inicial." },
              { Icone: Eye, titulo: "Leia o resumo", texto: "No topo de cada página há uma frase simples e poucos números grandes. Já dá para entender o principal." },
              {
                Icone: MousePointerClick,
                titulo: "Vá mais fundo, se quiser",
                texto: "Toque em qualquer número para ver como foi calculado e o link oficial. Palavras difíceis sublinhadas se explicam com um toque.",
              },
            ].map(({ Icone, titulo, texto }, i) => (
              <li key={titulo} className="cartao p-5">
                <span className="flex items-center gap-3">
                  <span className="figure inline-flex h-10 w-10 items-center justify-center rounded-full bg-mark text-lg font-bold text-mark-ink">{i + 1}</span>
                  <Icone className="h-5 w-5 text-accent" aria-hidden />
                </span>
                <h3 className="mt-3 text-lg font-bold">{titulo}</h3>
                <p className="mt-1 text-ink-2">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="nao-e" className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="nao-e" className="display text-3xl font-bold sm:text-4xl">
              O que o Raio-X não é
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                ["Não é de nenhum partido", "Não apoia nem ataca ninguém. Todos os políticos são mostrados do mesmo jeito, com as mesmas regras."],
                ["Não dá nota", "Não existe “melhor” ou “pior” aqui. Mostramos os fatos e a comparação com os colegas. Faltar ou gastar pode ter boas explicações."],
                ["Não diz em quem votar", "A decisão é sua. O site só ajuda você a ver o que cada um fez."],
                ["Não é site do governo", "É um projeto independente que usa os dados que o governo publica."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <CircleSlash className="mt-1 h-5 w-5 shrink-0 text-nao" aria-hidden />
                  <span>
                    <b className="block text-lg">{t}</b>
                    <span className="text-ink-2">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="display text-3xl font-bold sm:text-4xl">Por que você pode confiar</h2>
            <ul className="mt-6 space-y-4">
              {[
                {
                  Icone: Link2,
                  t: "Todo número tem endereço",
                  d: `Os dados vêm de ${fontes || "várias"} fontes oficiais, como Câmara, Senado e Tribunal Superior Eleitoral. Ao lado de cada número há o link para o registro original.`,
                },
                {
                  Icone: BadgeCheck,
                  t: "Atualizado todo dia",
                  d: "Os dados são coletados automaticamente toda madrugada. A data da última atualização aparece no fim de cada página.",
                },
                {
                  Icone: Sparkles,
                  t: "Inteligência artificial com regras duras",
                  d: "Quando usamos IA para explicar um projeto em palavras simples, ela só pode usar o texto oficial, precisa copiar os trechos em que se baseou e não pode inventar números. Se quebrar uma regra, a explicação é descartada. Tudo feito por IA vem marcado.",
                },
                {
                  Icone: Code2,
                  t: "Tudo aberto",
                  d: "O código e os dados ficam públicos no GitHub. Qualquer pessoa pode conferir como cada conta é feita e baixar tudo.",
                },
              ].map(({ Icone, t, d }) => (
                <li key={t} className="flex gap-3">
                  <Icone className="mt-1 h-5 w-5 shrink-0 text-sim" aria-hidden />
                  <span>
                    <b className="block text-lg">{t}</b>
                    <span className="text-ink-2">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl bg-banda p-6 text-banda-ink sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center" aria-labelledby="ajude">
          <div>
            <h2 id="ajude" className="display flex items-center gap-3 text-3xl font-bold">
              <HandHeart className="h-8 w-8 text-mark" aria-hidden /> Achou um erro? Quer ajudar?
            </h2>
            <p className="mt-3 max-w-xl text-banda-ink/80">
              Dados públicos também têm erros, e nós também. Se algo parecer errado, avise com o link da página: corrigimos e registramos a correção. Quem sabe programar pode
              contribuir com o código.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a href={`${REPO}/issues/new?template=erro-nos-dados.yml`} className="botao">
              Avisar um erro
            </a>
            <Link href="/dados" className="rounded-xl border border-banda-ink/30 px-4 py-2.5 font-bold hover:bg-banda-ink/10">
              Ver fontes e cálculos
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
