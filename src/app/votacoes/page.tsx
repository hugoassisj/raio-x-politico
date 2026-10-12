import type { Metadata } from "next";
import Link from "next/link";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { IconeAssunto } from "@/components/Icone";
import { CartaoProjeto, CartaoVotacao } from "@/components/Listas";
import { Paginacao } from "@/components/Paginacao";
import { Container, Vazio } from "@/components/ui";
import { ASSUNTOS } from "@/lib/assuntos";
import { getExplicacoes, getMaterias, getVotacoes } from "@/lib/data";
import { numero, partesDescricao } from "@/lib/format";
import { explicarEtapa } from "@/lib/linguagem";
import { agruparPorProjeto } from "@/lib/projetos";

export const metadata: Metadata = {
  title: "Votações",
  description: "Os projetos votados na Câmara e no Senado, explicados em palavras simples, com o resultado e como cada partido e parlamentar votou.",
};

const POR_PAGINA = 24;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Votacoes({ searchParams }: PageProps<"/votacoes">) {
  const sp = await searchParams;
  const ver = t(sp.ver) === "todas" ? "todas" : "projetos";
  const casa = ["camara", "senado"].includes(t(sp.casa)) ? t(sp.casa) : "";
  const resultado = ["Aprovada", "Rejeitada"].includes(t(sp.resultado)) ? t(sp.resultado) : "";
  const tema = ASSUNTOS.some((a) => a.id === t(sp.assunto)) ? t(sp.assunto) : "";
  const conteudo = t(sp.so) === "conteudo";
  const q = t(sp.q).slice(0, 80);
  const periodo = ["30", "90"].includes(t(sp.periodo)) ? t(sp.periodo) : "";
  const pagina = Math.max(1, Math.floor(Number(t(sp.pagina)) || 1));

  const [todas, materias, explicacoes] = await Promise.all([getVotacoes(), getMaterias(), getExplicacoes()]);
  const termo = norm(q.trim());
  // Measured from the most recent vote in the data, so the filter is stable between daily updates
  const ultima = todas.reduce((m, v) => (v.data > m ? v.data : m), "");
  const desde = periodo && ultima ? new Date(Date.parse(ultima) - Number(periodo) * 86_400_000).toISOString().slice(0, 10) : "";
  const busca = (texto: string) => !termo || norm(texto).includes(termo);

  const grupos = agruparPorProjeto(todas, materias, explicacoes);
  const projetos = grupos.filter(
    (p) =>
      (!casa || p.casa === casa) &&
      (!resultado || p.principal.resultado === resultado) &&
      (!desde || p.votacoes.some((v) => v.data >= desde)) &&
      (!tema || p.assuntos.includes(tema)) &&
      busca([p.sigla, p.ementa, p.explicacao?.resumo, p.materia?.ementaDetalhada, p.materia?.palavrasChave?.join(" ")].filter(Boolean).join(" ")),
  );
  const votacoes = todas.filter(
    (v) =>
      (!casa || v.casa === casa) &&
      (!resultado || v.resultado === resultado) &&
      (!desde || v.data >= desde) &&
      (!tema || v.assuntos?.includes(tema)) &&
      (!conteudo || explicarEtapa(partesDescricao(v.descricao).procedimento, v.objeto)?.tipo !== "procedimento") &&
      busca(`${v.titulo} ${v.descricao}`),
  );
  const total = ver === "projetos" ? projetos.length : votacoes.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pg = Math.min(pagina, paginas);
  const url = (mudar: Record<string, string>) => {
    const u = new URLSearchParams();
    const atual: Record<string, string> = { ver: ver === "todas" ? "todas" : "", casa, resultado, periodo, assunto: tema, so: conteudo ? "conteudo" : "", q, pagina: "" };
    for (const [k, val] of Object.entries({ ...atual, ...mudar })) if (val) u.set(k, val);
    return `/votacoes${u.size ? `?${u}` : ""}`;
  };
  const contagem = (id: string) => grupos.filter((p) => p.assuntos.includes(id)).length;

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Votações</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">
        O que a Câmara e o Senado votaram nos últimos 12 meses. Cada projeto aparece uma vez, explicado em palavras simples, com o resultado do texto principal.
      </p>

      <nav aria-label="Assuntos" className="mt-8">
        <p className="mb-2 text-sm font-semibold text-ink-3">Escolha um assunto</p>
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href={url({ assunto: "" })} className="chip" aria-current={!tema ? "page" : undefined}>
              Todos
            </Link>
          </li>
          {ASSUNTOS.map((a) => {
            const n = contagem(a.id);
            if (!n) return null;
            return (
              <li key={a.id}>
                <Link href={url({ assunto: a.id })} className="chip" aria-current={tema === a.id ? "page" : undefined}>
                  <IconeAssunto nome={a.icone} className="h-4 w-4" />
                  {a.nome}
                  <span className="tnum text-xs opacity-70">{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6">
        <FormFiltros acao="/votacoes">
          {ver === "todas" && <input type="hidden" name="ver" value="todas" />}
          {tema && <input type="hidden" name="assunto" value={tema} />}
          <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-sm">
            <span className="text-ink-3">Buscar</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Ex.: aposentadoria, PEC, imposto de renda"
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
            />
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
          <Seletor
            nome="periodo"
            rotulo="Quando"
            valor={periodo}
            opcoes={[
              ["", "Últimos 12 meses"],
              ["90", "Últimos 3 meses"],
              ["30", "Últimos 30 dias"],
            ]}
          />
        </FormFiltros>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Como mostrar">
          <Link href={url({ ver: "" })} className="chip" aria-current={ver === "projetos" ? "page" : undefined}>
            Por projeto
          </Link>
          <Link href={url({ ver: "todas" })} className="chip" aria-current={ver === "todas" ? "page" : undefined}>
            Cada votação
          </Link>
          {ver === "todas" && (
            <Link href={url({ so: conteudo ? "" : "conteudo" })} className="chip" aria-current={conteudo ? "page" : undefined}>
              Esconder pedidos sobre o andamento
            </Link>
          )}
        </div>
        <p className="text-ink-2" aria-live="polite">
          {numero(total)} {ver === "projetos" ? (total === 1 ? "projeto" : "projetos") : total === 1 ? "votação" : "votações"}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ver === "projetos"
          ? projetos.slice((pg - 1) * POR_PAGINA, pg * POR_PAGINA).map((p, i) => <CartaoProjeto key={p.chave} p={p} i={i} />)
          : votacoes
              .slice((pg - 1) * POR_PAGINA, pg * POR_PAGINA)
              .map((v, i) => <CartaoVotacao key={v.id} v={v} i={i} resumo={v.materia ? explicacoes.get(v.materia)?.resumo : undefined} />)}
      </div>
      {!total && <Vazio>Nada encontrado com esses filtros. Tente outro assunto ou apague a busca.</Vazio>}
      <div className="mt-8">
        <Paginacao pagina={pg} paginas={paginas} href={(p) => url({ pagina: p > 1 ? String(p) : "" })} rotulo="Páginas de votações" />
      </div>
    </Container>
  );
}
