import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BensDeclarados, Campanhas, LinhaDaVida, ResumoVida } from "@/components/VidaPublica";
import { Container, Fonte, Origem, Secao, Vazio } from "@/components/ui";
import { getPresidencia } from "@/lib/data";
import { data } from "@/lib/format";
import { urlCorrecao } from "@/lib/site";

export const dynamicParams = false;

/** People followed elsewhere keep their main profile; this page is for everyone else who ran. */
export async function generateStaticParams() {
  const p = await getPresidencia();
  const ids = (p?.pessoas ?? []).filter((x) => !x.perfil).map((x) => ({ id: x.id }));
  // A static route needs at least one path; an unknown id renders "not found"
  return ids.length ? ids : [{ id: "nenhum" }];
}

export async function generateMetadata({ params }: PageProps<"/presidencia/[id]">): Promise<Metadata> {
  const { id } = await params;
  const x = (await getPresidencia())?.pessoas.find((p) => p.id === id);
  return x
    ? { title: `${x.nomeUrna}: vida pública`, description: `Todas as eleições que ${x.nomeUrna} disputou, bens declarados e dinheiro das campanhas, pelos dados do TSE.` }
    : {};
}

export default async function CandidatoPresidencia({ params }: PageProps<"/presidencia/[id]">) {
  const { id } = await params;
  const p = await getPresidencia();
  const x = p?.pessoas.find((y) => y.id === id);
  if (!p || !x || x.perfil) notFound();
  const sexo = p.eleicoes.flatMap((e) => e.candidatos).find((c) => c.pessoa === x.id)?.sexo;
  const presidenciais = x.candidaturas.filter((e) => /presidente/i.test(e.cargo) && !/vice/i.test(e.cargo)).sort((a, b) => b.ano - a.ano);
  const ultima = [...x.candidaturas].sort((a, b) => b.ano - a.ano)[0];

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <nav aria-label="Trilha" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link href="/presidencia" className="hover:underline">
              Presidência
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-ink-2">{x.nomeUrna}</span>
          </nav>
          <div className="flex items-center gap-5">
            <Avatar nome={x.nomeUrna} size={72} />
            <div className="min-w-0">
              <h1 className="display text-4xl font-extrabold sm:text-5xl">{x.nomeUrna}</h1>
              <p className="mt-1 text-lg text-ink-2">
                {x.nome !== x.nomeUrna ? `${x.nome} · ` : ""}
                {sexo === "F" ? "Candidata" : sexo === "M" ? "Candidato" : "Candidatura"} a Presidente em {presidenciais.map((e) => e.ano).join(", ")}
                {ultima?.partido ? ` · último partido: ${ultima.partido}` : ""}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm text-ink-3">
            Esta pessoa não está hoje no Congresso nem numa assembleia acompanhada pelo site, então a página mostra só o que os arquivos do TSE registram.
          </p>
        </Container>
      </header>

      <Container>
        <Secao id="vida" titulo="Vida pública" subtitulo="Todas as eleições que encontramos nos arquivos do TSE desde 1994, para qualquer cargo.">
          {x.candidaturas.length ? (
            <div className="space-y-8">
              <ResumoVida eleicoes={x.candidaturas} sexo={sexo} />
              <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <LinhaDaVida eleicoes={x.candidaturas} sexo={sexo} />
                <BensDeclarados eleicoes={x.candidaturas} />
              </div>
            </div>
          ) : (
            <Vazio>Nenhuma candidatura encontrada.</Vazio>
          )}
        </Secao>

        {x.candidaturas.some((e) => e.campanha) && (
          <Secao
            id="campanhas"
            titulo="Dinheiro das campanhas"
            subtitulo="De onde veio o dinheiro de cada campanha e com quem foi gasto, segundo a prestação de contas entregue ao TSE."
          >
            <Campanhas eleicoes={x.candidaturas} sexo={sexo} />
          </Secao>
        )}

        <Origem>
          <p>
            As candidaturas foram juntadas pelo título de eleitor e, quando ele falta, pelo CPF ou pela data de nascimento com o nome exato. Se uma informação parece de outra
            pessoa, <a href={urlCorrecao(`/presidencia/${x.id}`)}>avise para corrigirmos</a>.
          </p>
          <p>Bens são declarados pela própria pessoa ao se candidatar, pelo valor de compra, sem correção pela inflação. Atualizado em {data(p.atualizadoEm.slice(0, 10))}.</p>
          <p className="flex flex-wrap gap-x-4">
            {presidenciais
              .filter((e) => e.url)
              .map((e) => (
                <Fonte key={e.url} href={e.url!}>
                  Candidatura de {e.ano} no TSE
                </Fonte>
              ))}
            {p.fontes.slice(0, 1).map((f) => (
              <Fonte key={f.url} href={f.url}>
                {f.nome}
              </Fonte>
            ))}
          </p>
        </Origem>
      </Container>
    </>
  );
}
