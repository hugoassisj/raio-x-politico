import type { Metadata } from "next";
import Link from "next/link";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { TabelaPoliticos } from "@/components/TabelaPoliticos";
import { Container, Origem, Vazio } from "@/components/ui";
import { getPoliticos } from "@/lib/data";
import { aplicarFiltro, lerFiltro, urlFiltro } from "@/lib/filtros";
import { numero } from "@/lib/format";
import { METRICAS, metrica } from "@/lib/metricas";
import { ESTADOS } from "@/lib/ufs";

export const metadata: Metadata = {
  title: "Todos os políticos",
  description: "Lista de senadores, deputados federais e estaduais com presença, votações, alinhamento com o partido, gastos e projetos. Ordene por qualquer critério.",
};

export default async function Politicos({ searchParams }: PageProps<"/politicos">) {
  const f = lerFiltro(await searchParams);
  const pols = await getPoliticos();
  const { itens, total, paginas, pagina } = aplicarFiltro(pols, f);
  const partidos = [...new Set(pols.map((p) => p.partido))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const def = f.ordem !== "nome" ? metrica(f.ordem) : undefined;

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Todos os políticos</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">
        Filtre por casa, estado ou partido e ordene por qualquer critério. Quem não tem dado para o critério escolhido aparece no fim da lista.
      </p>

      <div className="mt-8">
        <FormFiltros acao="/politicos">
          <Seletor
            nome="casa"
            rotulo="Casa"
            valor={f.casa}
            opcoes={[
              ["", "Todas"],
              ["senado", "Senado"],
              ["camara", "Câmara dos Deputados"],
              ["assembleia", "Assembleias Legislativas"],
            ]}
          />
          <Seletor
            nome="uf"
            rotulo="Estado"
            valor={f.uf}
            opcoes={[["", "Todos"], ...ESTADOS.map((e) => [e.uf, e.nome] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))]}
          />
          <Seletor nome="partido" rotulo="Partido" valor={f.partido} opcoes={[["", "Todos"], ...partidos.map((p) => [p, p] as [string, string])]} />
          <Seletor nome="ordem" rotulo="Ordenar por" valor={f.ordem} opcoes={[["nome", "Nome"], ...METRICAS.map((m) => [m.chave, m.titulo] as [string, string])]} />
          <Seletor
            nome="dir"
            rotulo="Sentido"
            valor={f.dir}
            opcoes={[
              ["asc", f.ordem === "nome" ? "A a Z" : "Menor primeiro"],
              ["desc", f.ordem === "nome" ? "Z a A" : "Maior primeiro"],
            ]}
          />
        </FormFiltros>
      </div>

      <p className="mt-5 text-ink-2" aria-live="polite">
        {numero(total)} {total === 1 ? "pessoa" : "pessoas"}
        {def ? `, ordenadas por ${def.titulo.toLowerCase()}` : ""}.
      </p>

      <div className="mt-3">
        {itens.length ? (
          <TabelaPoliticos
            itens={itens}
            destaque={def?.chave}
            linkOrdem={(k) => urlFiltro("/politicos", { ...f, ordem: k, dir: f.ordem === k && f.dir === "desc" ? "asc" : "desc", pagina: 1 })}
          />
        ) : (
          <Vazio>Ninguém corresponde a esses filtros. Tente remover um deles.</Vazio>
        )}
      </div>

      {paginas > 1 && (
        <nav aria-label="Paginação" className="mt-5 flex items-center justify-between gap-4">
          {pagina > 1 ? (
            <Link href={urlFiltro("/politicos", { ...f, pagina: pagina - 1 })} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-3">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={urlFiltro("/politicos", { ...f, pagina: pagina + 1 })} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {def && (
        <Origem titulo={`Como calculamos "${def.titulo}"`}>
          <p>{def.calculo}</p>
          <p>{def.limites}</p>
        </Origem>
      )}
    </Container>
  );
}
