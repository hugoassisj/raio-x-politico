import type { Metadata } from "next";
import { MapaRelacoes } from "@/components/MapaRelacoes";
import { Container, Origem } from "@/components/ui";
import { getEmpresa, getPolitico, getPoliticos } from "@/lib/data";
import { TIPOS_LIGACAO, grafoDaEmpresa, grafoDaPessoa, type Grafo } from "@/lib/grafo";

export const metadata: Metadata = {
  title: "Mapa de relações",
  description: "Quem paga quem, quem doou para quem e para onde vão as emendas: ligações entre políticos, empresas, partidos e cidades, cada uma com a prova oficial.",
};

const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Relacoes({ searchParams }: PageProps<"/relacoes">) {
  const no = t((await searchParams).no).slice(0, 40);
  let grafo: Grafo | undefined;
  if (no.startsWith("p:")) {
    const p = await getPolitico(no.slice(2));
    if (p) grafo = grafoDaPessoa(p);
  } else if (no.startsWith("e:")) {
    const e = await getEmpresa(no.slice(2));
    if (e) grafo = grafoDaEmpresa(e, new Map((await getPoliticos()).map((p) => [p.id, p])));
  }

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Mapa de relações</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-2">
        Veja com quem cada político tem ligação registrada: empresas pagas com a cota, quem doou para a campanha, quem a campanha pagou, o partido e as cidades que receberam
        emendas. Toque em alguém para ver as provas e em “Mostrar as ligações” para ir mais longe.
      </p>
      <p className="mt-2 max-w-3xl text-ink-3">Só aparecem ligações com registro oficial. Uma ligação mostra um fato, não uma acusação nem um favor.</p>

      <div className="mt-8">
        {grafo ? (
          <MapaRelacoes key={no} inicial={grafo} raiz={no} />
        ) : (
          <div className="space-y-4">
            {no && <p className="rounded-lg bg-alerta-bg px-3 py-2">Não encontramos esse item. Procure de novo abaixo.</p>}
            <MapaRelacoes key="vazio" inicial={{ nos: [], ligacoes: [] }} raiz="" />
          </div>
        )}
      </div>

      <Origem>
        <ul className="list-disc space-y-1 pl-5">
          {TIPOS_LIGACAO.map((x) => (
            <li key={x.id}>
              <b>{x.rotulo}:</b> {x.explicacao}
            </li>
          ))}
        </ul>
        <p>
          Empresas só se ligam a alguém quando o CNPJ é o mesmo nos registros oficiais; nomes parecidos não contam. Pessoas que doaram ou receberam como pessoa física não aparecem
          no mapa.
        </p>
      </Origem>
    </Container>
  );
}
