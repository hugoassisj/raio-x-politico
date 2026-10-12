import type { Metadata } from "next";
import Link from "next/link";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { CartaoVotacao } from "@/components/Listas";
import { Container, Vazio } from "@/components/ui";
import { getVotacoes } from "@/lib/data";
import { numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "Votações",
  description: "Todas as votações nominais recentes da Câmara e do Senado, com o resultado e como cada partido e parlamentar votou.",
};

const POR_PAGINA = 24;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default async function Votacoes({ searchParams }: PageProps<"/votacoes">) {
  const sp = await searchParams;
  const casa = ["camara", "senado"].includes(t(sp.casa)) ? t(sp.casa) : "";
  const resultado = ["Aprovada", "Rejeitada"].includes(t(sp.resultado)) ? t(sp.resultado) : "";
  const q = t(sp.q).slice(0, 80);
  const pagina = Math.max(1, Math.floor(Number(t(sp.pagina)) || 1));

  const todas = await getVotacoes();
  const termo = norm(q.trim());
  const lista = todas.filter((v) => (!casa || v.casa === casa) && (!resultado || v.resultado === resultado) && (!termo || norm(`${v.titulo} ${v.descricao}`).includes(termo)));
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pg = Math.min(pagina, paginas);
  const url = (p: number) => {
    const u = new URLSearchParams();
    if (casa) u.set("casa", casa);
    if (resultado) u.set("resultado", resultado);
    if (q) u.set("q", q);
    if (p > 1) u.set("pagina", String(p));
    return `/votacoes${u.size ? `?${u}` : ""}`;
  };

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Votações</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">
        Votações nominais do Plenário nos últimos 12 meses. Em cada uma você vê o resultado, a orientação de cada partido e o voto de cada parlamentar.
      </p>
      <div className="mt-8">
        <FormFiltros acao="/votacoes">
          <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-sm">
            <span className="text-ink-3">Assunto</span>
            <input name="q" defaultValue={q} placeholder="Ex.: saúde, PEC, imposto" className="rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-ink" />
          </label>
          <Seletor
            nome="casa"
            rotulo="Casa"
            valor={casa}
            opcoes={[
              ["", "Câmara e Senado"],
              ["camara", "Câmara"],
              ["senado", "Senado"],
            ]}
          />
          <Seletor
            nome="resultado"
            rotulo="Resultado"
            valor={resultado}
            opcoes={[
              ["", "Todos"],
              ["Aprovada", "Aprovadas"],
              ["Rejeitada", "Rejeitadas"],
            ]}
          />
        </FormFiltros>
      </div>
      <p className="mt-5 text-ink-2" aria-live="polite">
        {numero(lista.length)} {lista.length === 1 ? "votação" : "votações"}.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.slice((pg - 1) * POR_PAGINA, pg * POR_PAGINA).map((v) => (
          <CartaoVotacao key={v.id} v={v} />
        ))}
      </div>
      {!lista.length && <Vazio>Nenhuma votação encontrada com esses filtros.</Vazio>}
      {paginas > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-between">
          {pg > 1 ? (
            <Link href={url(pg - 1)} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-3">
            Página {pg} de {paginas}
          </span>
          {pg < paginas ? (
            <Link href={url(pg + 1)} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </Container>
  );
}
