import type { Metadata } from "next";
import { GLOSSARIO } from "@/lib/linguagem";
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
            <li key={p.titulo} className="cartao p-5">
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

      <Secao titulo="Palavras que aparecem muito">
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
