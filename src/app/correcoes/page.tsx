import type { Metadata } from "next";
import { Container, Secao } from "@/components/ui";
import { CORRECOES } from "@/lib/correcoes";
import { data } from "@/lib/format";
import { REPO_URL, urlCorrecao } from "@/lib/site";

export const metadata: Metadata = {
  title: "Correções",
  description: "Tudo o que o Raio-X Político publicou errado e corrigiu, com a data e o que mudou.",
};

export default function Correcoes() {
  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Correções</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-2">
        Quando erramos, contamos aqui: o que estava errado, o que mudou e onde. Quem acompanha o site precisa saber que um número mudou e por quê.
      </p>
      <p className="mt-3">
        <a href={urlCorrecao("/correcoes")} target="_blank" rel="noopener noreferrer" className="botao">
          Avisar sobre um erro
        </a>
      </p>
      <Secao titulo="Registro" subtitulo="Mais recentes primeiro.">
        <ol className="space-y-4">
          {CORRECOES.map((c, i) => (
            <li key={i} className="cartao p-5">
              <p className="text-sm font-semibold text-ink-3">
                {data(c.data)} · {c.onde}
              </p>
              <p className="mt-2">
                <b>O que estava errado:</b> {c.erro}
              </p>
              <p className="mt-1">
                <b>O que mudou:</b> {c.correcao}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-ink-3">
          Todas as mudanças do código e dos dados também ficam no{" "}
          <a href={`${REPO_URL}/commits/main`} className="link">
            histórico público do projeto
          </a>
          .
        </p>
      </Secao>
    </Container>
  );
}
