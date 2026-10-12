import type { Metadata } from "next";
import { MiniPlenario } from "@/components/Plenario";
import { Container, Fonte, Secao } from "@/components/ui";
import { numero } from "@/lib/format";
import { descricaoExigencia, MEMBROS, REGRAS, votosNecessarios } from "@/lib/quorum";

export const metadata: Metadata = {
  title: "Como funciona: como uma lei é aprovada",
  description: "Como uma ideia vira lei no Brasil e quantos votos cada tipo de proposta precisa na Câmara e no Senado, explicado de forma simples.",
};

const PASSOS = [
  { titulo: "Alguém apresenta a ideia", texto: "Um deputado, um senador, o Presidente, o Judiciário ou até a população (com assinaturas) apresenta um projeto." },
  { titulo: "Comissões estudam", texto: "Grupos menores de parlamentares, chamados comissões, analisam o texto, ouvem especialistas e podem mudar a proposta." },
  { titulo: "O plenário vota", texto: "Todos os parlamentares da casa votam. Em votações nominais, o voto de cada um fica registrado com nome." },
  { titulo: "A outra casa revisa", texto: "O que a Câmara aprova vai para o Senado, e vice-versa. Se a outra casa mudar o texto, ele pode voltar." },
  { titulo: "O Presidente decide", texto: "O Presidente pode sancionar (aprovar) ou vetar (barrar) a lei, toda ou em parte. Mudanças na Constituição não passam por esta etapa." },
  { titulo: "O Congresso pode insistir", texto: "Se houver veto, Câmara e Senado votam juntos e podem derrubá-lo. Aí a lei vale mesmo sem a concordância do Presidente." },
];

const GLOSSARIO = [
  ["Plenário", "O salão onde todos os parlamentares de uma casa se reúnem para votar. Também é o nome da reunião de todos eles."],
  ["Votação nominal", "Votação em que cada parlamentar registra Sim, Não ou Abstenção no painel eletrônico, e o voto fica público com o nome."],
  ["Votação simbólica", "Votação rápida em que quem concorda permanece sentado. Não registra o voto de cada um."],
  ["Quórum", "Número mínimo de parlamentares presentes ou votando para que uma decisão valha."],
  ["Maioria absoluta", "Mais da metade de todos os membros da casa: 257 deputados ou 41 senadores, contando quem faltou."],
  ["Maioria simples", "Mais votos Sim do que Não entre os que votaram, desde que pelo menos metade dos membros esteja presente."],
  ["Turno", "Cada rodada de votação. Mudanças na Constituição precisam ser aprovadas duas vezes em cada casa."],
  ["Orientação", "O voto que a liderança de um partido, ou do governo, pede aos seus parlamentares antes de cada votação."],
  ["Obstrução", "Estratégia para atrasar ou impedir uma votação, por exemplo deixando de registrar presença."],
  ["Cota parlamentar", "Verba mensal para despesas do mandato, como passagens e escritório. É reembolsada mediante nota fiscal."],
  ["Emenda parlamentar", "Dinheiro do orçamento federal que cada parlamentar pode indicar para obras e serviços em cidades e estados."],
];

export default function ComoFunciona() {
  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Como funciona</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed text-ink-2">
        O Congresso Nacional tem duas casas: a Câmara dos Deputados, com 513 deputados, e o Senado Federal, com 81 senadores. Quase toda lei precisa passar pelas duas.
      </p>

      <Secao titulo="Como uma ideia vira lei">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PASSOS.map((p, i) => (
            <li key={p.titulo} className="rounded-2xl border border-line bg-surface p-5">
              <span className="figure inline-flex h-10 w-10 items-center justify-center rounded-full bg-mark text-lg font-bold text-mark-ink">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-1 text-ink-2">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Secao>

      <Secao
        titulo="Quantos votos cada proposta precisa"
        subtitulo="Quanto mais importante a mudança, mais votos são necessários. Nos desenhos, as cadeiras escuras mostram o mínimo de votos Sim (ou de presentes, na maioria simples)."
      >
        <ul className="space-y-5">
          {REGRAS.map((r) => (
            <li key={r.tipo} className="grid gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:grid-cols-[1.1fr_1fr_0.8fr] lg:items-center">
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

      <Secao titulo="Palavras que aparecem muito">
        <dl className="grid gap-4 sm:grid-cols-2">
          {GLOSSARIO.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-line bg-surface p-4">
              <dt className="font-bold">{t}</dt>
              <dd className="mt-1 text-ink-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Secao>
    </Container>
  );
}
