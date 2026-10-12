import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { Container, Fonte, Origem, Vazio } from "@/components/ui";
import { buscarFalas } from "@/lib/busca-falas";
import { getPoliticos } from "@/lib/data";
import { data, numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "Buscar no que os políticos disseram",
  description: "Busque por tema em discursos oficiais e publicações de deputados e senadores, sempre com link para o registro original.",
};

const POR_PAGINA = 20;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Highlights search matches returned by Postgres (marked with « ») without using raw HTML. */
function Trecho({ texto }: { texto: string }) {
  const partes = texto.split(/(«[^»]*»)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith("«") ? (
          <mark key={i} className="bg-mark px-0.5 text-mark-ink">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default async function Falas({ searchParams }: PageProps<"/falas">) {
  const sp = await searchParams;
  const q = t(sp.q).slice(0, 120);
  const pid = /^[\w-]+$/.test(t(sp.pid)) ? t(sp.pid) : undefined;
  const tipo = ["discurso", "youtube", "x", "instagram", "tiktok"].includes(t(sp.tipo)) ? t(sp.tipo) : undefined;
  const pagina = Math.max(1, Math.floor(Number(t(sp.pagina)) || 1));
  const [pols, r] = await Promise.all([getPoliticos(), buscarFalas(q, { pid, tipo, pagina, porPagina: POR_PAGINA })]);
  const porId = new Map(pols.map((p) => [p.id, p]));
  const pessoa = pid ? porId.get(pid) : undefined;
  const paginas = Math.max(1, Math.ceil(r.total / POR_PAGINA));
  const url = (p: number, comPessoa = true) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (pid && comPessoa) u.set("pid", pid);
    if (tipo) u.set("tipo", tipo);
    if (p > 1) u.set("pagina", String(p));
    return `/falas?${u}`;
  };

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">O que disseram</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">
        Busque um tema nos discursos oficiais da Câmara e do Senado e nas publicações coletadas pelas APIs oficiais das redes. Cada resultado leva ao registro original.
      </p>
      <div className="mt-8">
        <FormFiltros acao="/falas">
          <label className="flex min-w-[16rem] flex-[2] flex-col gap-1 text-sm">
            <span className="text-ink-3">Tema ou palavra</span>
            <input name="q" defaultValue={q} placeholder="Ex.: reforma tributária, segurança, vacina" className="rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-ink" />
          </label>
          <Seletor
            nome="tipo"
            rotulo="Onde"
            valor={tipo}
            opcoes={[
              ["", "Tudo"],
              ["discurso", "Discursos oficiais"],
              ["youtube", "YouTube"],
              ["x", "X"],
              ["instagram", "Instagram"],
              ["tiktok", "TikTok"],
            ]}
          />
          {pid && <input type="hidden" name="pid" value={pid} />}
        </FormFiltros>
      </div>
      {pessoa && (
        <p className="mt-4 text-ink-2">
          Mostrando apenas falas de{" "}
          <Link href={`/politico/${pessoa.id}`} className="link">
            {pessoa.nome}
          </Link>
          .{" "}
          <Link href={url(1, false)} className="link">
            Buscar em todos
          </Link>
        </p>
      )}
      <p className="mt-5 text-ink-2" aria-live="polite">
        {numero(r.total)} {r.total === 1 ? "resultado" : "resultados"}
        {q ? ` para "${q}"` : ", dos mais recentes aos mais antigos"}.
      </p>

      {r.itens.length ? (
        <ol className="mt-4 space-y-3">
          {r.itens.map((f) => {
            const p = porId.get(f.pid);
            return (
              <li key={f.id} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
                {p && <Avatar src={p.foto} nome={p.nome} size={44} />}
                <div className="min-w-0">
                  <p className="text-sm text-ink-3">
                    {p && (
                      <Link href={`/politico/${p.id}`} className="font-semibold text-ink hover:underline">
                        {p.nome}
                      </Link>
                    )}
                    {p ? ` (${p.partido}-${p.uf})` : ""} · {data(f.data)} · {f.titulo ?? f.tipo}
                  </p>
                  <p className="mt-1.5">{f.trecho ? <Trecho texto={f.trecho} /> : <span className="line-clamp-3">{f.texto}</span>}</p>
                  <p className="mt-2">
                    <Fonte href={f.url}>{f.fonte}</Fonte>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-4">
          <Vazio>Nenhuma fala encontrada. Tente outra palavra ou um termo mais geral.</Vazio>
        </div>
      )}

      {paginas > 1 && (
        <nav aria-label="Paginação" className="mt-6 flex items-center justify-between">
          {pagina > 1 ? (
            <Link href={url(pagina - 1)} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-3">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={url(pagina + 1)} className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-ink-3">
              Próxima
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <Origem>
        <p>
          Discursos: transcrições e resumos oficiais publicados pela Câmara dos Deputados e pronunciamentos do Senado Federal. Redes sociais: somente conteúdo obtido pelas APIs oficiais
          das plataformas, a partir dos perfis declarados à Câmara e ao TSE. Não coletamos conteúdo por raspagem de páginas.
        </p>
        <p>{r.motor === "banco" ? "Busca com dicionário em português (encontra variações como 'imposto' e 'impostos')." : "Busca por palavras exatas, sem diferenciar acentos."}</p>
      </Origem>
    </Container>
  );
}
