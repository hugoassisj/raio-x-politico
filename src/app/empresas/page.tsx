import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building, Landmark, Network, Search, Users, Vote } from "lucide-react";
import { Seletor } from "@/components/Filtros";
import { Paginacao } from "@/components/Paginacao";
import { Container, Fonte, Origem, Secao, Vazio } from "@/components/ui";
import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import { getEmpresas, getMeta } from "@/lib/data";
import { data, moedaCurta, numero } from "@/lib/format";
import { lerPagina, paginar } from "@/lib/paginacao";
import type { EmpresaResumo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Empresas e CNPJ",
  description: "Procure uma empresa pelo nome ou CNPJ e veja quem a pagou com a cota parlamentar, quem ela financiou em campanhas, cada nota fiscal e o mapa de relações.",
};

/** Official lookup of any CNPJ at the Receita Federal */
const RECEITA = "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";
const POR_PAGINA = 30;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ORDENS = {
  cota: { rotulo: "Mais recebeu da cota", cmp: (a: EmpresaResumo, b: EmpresaResumo) => b.cota - a.cota },
  campanhas: { rotulo: "Mais ligada a campanhas", cmp: (a: EmpresaResumo, b: EmpresaResumo) => b.campanhas - a.campanhas },
  pessoas: { rotulo: "Paga por mais pessoas", cmp: (a: EmpresaResumo, b: EmpresaResumo) => b.pessoas - a.pessoas },
  nome: { rotulo: "Nome (A a Z)", cmp: (a: EmpresaResumo, b: EmpresaResumo) => a.nome.localeCompare(b.nome, "pt-BR") },
} as const;
type Ordem = keyof typeof ORDENS;

export default async function Empresas({ searchParams }: PageProps<"/empresas">) {
  const sp = await searchParams;
  const q = t(sp.q).slice(0, 80);
  const ligacao = ["cota", "campanhas"].includes(t(sp.ligacao)) ? t(sp.ligacao) : "";
  const ordem: Ordem = t(sp.ordem) in ORDENS ? (t(sp.ordem) as Ordem) : "cota";
  const [todas, meta] = await Promise.all([getEmpresas(), getMeta()]);
  const cnpj = normalizarCnpj(q);
  const termo = norm(q.trim());
  const digitos = q.replace(/\D/g, "");
  // Part of a CNPJ also finds it (at least 4 digits, to avoid matching everything)
  const busca = (e: EmpresaResumo) => !termo || (cnpj ? e.cnpj === cnpj : norm(e.nome).includes(termo) || (digitos.length >= 4 && e.cnpj.includes(digitos)));
  const procurando = !!termo || !!ligacao || ordem !== "cota" || !!t(sp.pagina);
  const lista = todas
    .filter((e) => (!ligacao || (ligacao === "cota" ? e.cota > 0 : e.campanhas > 0)) && busca(e))
    .sort((a, b) => ORDENS[ordem].cmp(a, b) || a.cnpj.localeCompare(b.cnpj));
  const pg = paginar(lista, lerPagina(t(sp.pagina)), POR_PAGINA);
  const url = (over: { pagina?: number; ordem?: Ordem; ligacao?: string; q?: string } = {}) => {
    const u = new URLSearchParams();
    const qq = over.q ?? q;
    const l = over.ligacao ?? ligacao;
    const o = over.ordem ?? ordem;
    if (qq) u.set("q", qq);
    if (l) u.set("ligacao", l);
    if (o !== "cota") u.set("ordem", o);
    if ((over.pagina ?? 1) > 1) u.set("pagina", String(over.pagina));
    return `/empresas${u.size ? `?${u}` : ""}${procurando || over.pagina || over.ordem || over.ligacao ? "#lista" : ""}`;
  };
  const totalCota = todas.reduce((s, e) => s + e.cota, 0);
  const comCampanhas = todas.filter((e) => e.campanhas > 0);
  const totalCampanhas = comCampanhas.reduce((s, e) => s + e.campanhas, 0);
  const top = (cmp: (a: EmpresaResumo, b: EmpresaResumo) => number, n = 6) => [...todas].sort((a, b) => cmp(a, b) || a.cnpj.localeCompare(b.cnpj)).slice(0, n);

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-12">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-ink">
            <Building className="h-4 w-4" aria-hidden />
            Dinheiro público e empresas
          </p>
          <h1 className="display mt-1 text-4xl font-extrabold sm:text-5xl">Empresas e CNPJ</h1>
          <p className="mt-4 max-w-3xl text-lg text-ink-2">
            Toda empresa paga com a cota parlamentar ou ligada a uma campanha, identificada só pelo CNPJ. Procure pelo nome ou pelo número e veja quem pagou, quanto, para quê, cada
            nota fiscal e as outras pessoas que usam o mesmo fornecedor.
          </p>

          {/* The main flow: find a company */}
          <form action="/empresas" method="get" role="search" className="mt-6 flex max-w-3xl flex-wrap gap-2">
            <label className="relative min-w-64 flex-1">
              <span className="sr-only">Nome ou CNPJ da empresa</span>
              <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-ink-3" aria-hidden />
              <input
                name="q"
                defaultValue={q}
                placeholder="Nome da empresa ou CNPJ (ex.: 11.222.333/0001-81)"
                className="h-12 w-full rounded-xl border-2 border-line-strong bg-surface pl-10 pr-3 text-base outline-none focus:border-accent"
              />
            </label>
            <button type="submit" className="botao h-12">
              Procurar
            </button>
          </form>
          <p className="mt-2 text-sm text-ink-3">Um pedaço do nome ou os primeiros dígitos do CNPJ também encontram.</p>

          <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Numero rotulo="Empresas e entidades" valor={numero(todas.length)} detalhe="com CNPJ válido nos registros" />
            <Numero rotulo="Recebido da cota" valor={moedaCurta(totalCota)} detalhe={meta ? `até ${data(meta.geradoEm.slice(0, 10))}` : undefined} />
            <Numero
              rotulo="Ligadas a campanhas"
              valor={numero(comCampanhas.length)}
              detalhe={comCampanhas.length ? `${moedaCurta(totalCampanhas)} em doações e serviços` : "chegam na próxima coleta completa"}
            />
            <Numero rotulo="Maior número de pagadores" valor={numero(Math.max(0, ...todas.map((e) => e.pessoas)))} detalhe="parlamentares numa só empresa" />
          </dl>
        </Container>
      </header>

      <Container>
        {!procurando && todas.length > 0 && (
          <>
            <Secao titulo="Caminhos" subtitulo="Três perguntas que esta página responde de cara. Cada empresa leva à sua página, com quem pagou e cada nota.">
              <div className="grid gap-4 lg:grid-cols-3">
                <Caminho
                  icone={<Landmark className="h-5 w-5" aria-hidden />}
                  titulo="Quem mais recebe da cota parlamentar"
                  itens={top((a, b) => b.cota - a.cota).map((e) => ({
                    e,
                    valor: moedaCurta(e.cota),
                    detalhe: `${numero(e.pessoas)} ${e.pessoas === 1 ? "parlamentar" : "parlamentares"}`,
                  }))}
                  mais={{ href: "/gastos#fornecedores", rotulo: "Os 50 maiores, com todas as colunas" }}
                />
                <Caminho
                  icone={<Users className="h-5 w-5" aria-hidden />}
                  titulo="Pagas por mais parlamentares"
                  itens={top((a, b) => b.pessoas - a.pessoas).map((e) => ({ e, valor: `${numero(e.pessoas)} pessoas`, detalhe: moedaCurta(e.cota) }))}
                  mais={{ href: url({ ordem: "pessoas" }), rotulo: "Ver todas nesta ordem" }}
                />
                <Caminho
                  icone={<Vote className="h-5 w-5" aria-hidden />}
                  titulo="Ligadas a campanhas"
                  itens={top((a, b) => b.campanhas - a.campanhas)
                    .filter((e) => e.campanhas > 0)
                    .map((e) => ({ e, valor: moedaCurta(e.campanhas), detalhe: e.cota > 0 ? `e ${moedaCurta(e.cota)} da cota` : "sem pagamento da cota" }))}
                  vazio="As doações e os serviços de campanha vêm da prestação de contas do TSE e entram na próxima coleta completa."
                  mais={{ href: url({ ligacao: "campanhas", ordem: "campanhas" }), rotulo: "Ver todas as ligadas a campanhas" }}
                />
              </div>
            </Secao>

            <Secao titulo="Como conferir uma empresa" subtitulo="O caminho de quem quer entender uma ligação, do número ao documento oficial.">
              <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Procure pelo nome ou CNPJ", "A busca acima acha a empresa nos registros da cota e das campanhas."],
                  ["Veja quem pagou e para quê", "A página da empresa lista cada parlamentar, a parte de cada um, as categorias e as notas fiscais."],
                  ["Siga as ligações", "O mapa de relações mostra pessoas, partidos e cidades ligados à empresa, com a prova de cada traço."],
                  ["Confira na fonte", "O CNPJ pode ser consultado na Receita Federal; cada nota fiscal leva ao site da Casa que a publicou."],
                ].map(([titulo, texto], i) => (
                  <li key={titulo} className="cartao p-4 sm:p-5">
                    <span className="display text-3xl font-extrabold text-accent-ink">{i + 1}</span>
                    <p className="mt-1 font-semibold">{titulo}</p>
                    <p className="mt-1 text-sm text-ink-2">{texto}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <Link href="/relacoes" className="link inline-flex items-center gap-1">
                  <Network className="h-4 w-4" aria-hidden />
                  Abrir o mapa de relações
                </Link>
                <Fonte href={RECEITA}>Consultar um CNPJ na Receita Federal</Fonte>
              </p>
            </Secao>
          </>
        )}

        <Secao
          id="lista"
          titulo={termo ? `Resultado para “${q.trim()}”` : "Todas as empresas"}
          subtitulo={`${numero(lista.length)} ${lista.length === 1 ? "empresa" : "empresas"}${pg.paginas > 1 ? `, página ${pg.pagina} de ${pg.paginas}` : ""}. Ordem: ${ORDENS[ordem].rotulo.toLowerCase()}.`}
        >
          <form action="/empresas" method="get" className="mb-4 flex flex-wrap items-end gap-3">
            {q && <input type="hidden" name="q" value={q} />}
            <Seletor
              nome="ligacao"
              rotulo="Ligação"
              valor={ligacao}
              opcoes={[
                ["", "Todas"],
                ["cota", "Paga com a cota parlamentar"],
                ["campanhas", "Ligada a campanhas"],
              ]}
            />
            <Seletor nome="ordem" rotulo="Ordem" valor={ordem} opcoes={Object.entries(ORDENS).map(([k, v]) => [k, v.rotulo])} />
            <button type="submit" className="botao-sec">
              Aplicar
            </button>
            {procurando && (
              <Link href="/empresas" className="link text-sm">
                Limpar e voltar ao início
              </Link>
            )}
          </form>

          {lista.length === 0 ? (
            <Vazio>
              {todas.length
                ? cnpj
                  ? "Nenhum registro com este CNPJ. A empresa pode nunca ter recebido da cota nem aparecido em contas de campanha das pessoas acompanhadas."
                  : "Nenhuma empresa com esses filtros. Tente um pedaço do nome ou os primeiros dígitos do CNPJ."
                : "Os dados de empresas chegam na próxima coleta completa."}
            </Vazio>
          ) : (
            <div className="tabela-caixa" tabIndex={0} role="region" aria-label="Tabela; use as setas para rolar">
              <table className="tabela">
                <caption className="sr-only">Empresas ligadas por CNPJ</caption>
                <thead>
                  <tr>
                    <th scope="col">Empresa</th>
                    <th scope="col">CNPJ</th>
                    <th data-num="" scope="col">
                      Cota parlamentar
                    </th>
                    <th data-num="" scope="col">
                      Campanhas
                    </th>
                    <th data-num="" scope="col">
                      Pessoas ligadas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pg.itens.map((e) => (
                    <tr key={e.cnpj}>
                      <td>
                        <Link href={`/empresa/${e.cnpj}`} className="group flex items-center gap-2">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold group-hover:underline">{e.nome}</span>
                            <span className="block text-xs text-accent-ink">Ver quem pagou e cada nota</span>
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                        </Link>
                      </td>
                      <td className="tnum">{formatarCnpj(e.cnpj)}</td>
                      <td data-num="" data-ordenado={ordem === "cota" ? "" : undefined}>
                        {e.cota ? moedaCurta(e.cota) : <span className="text-ink-3">não</span>}
                      </td>
                      <td data-num="" data-ordenado={ordem === "campanhas" ? "" : undefined}>
                        {e.campanhas ? moedaCurta(e.campanhas) : <span className="text-ink-3">não</span>}
                      </td>
                      <td data-num="" data-ordenado={ordem === "pessoas" ? "" : undefined}>
                        {numero(e.pessoas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6">
            <Paginacao pagina={pg.pagina} paginas={pg.paginas} href={(n) => url({ pagina: n })} rotulo="Páginas de empresas" />
          </div>
        </Secao>

        <Origem>
          <p>
            Cota parlamentar: despesas reembolsadas publicadas pela Câmara, pelo Senado e pelas assembleias, no período da coleta. Campanhas: prestação de contas entregue ao TSE
            pelas campanhas das pessoas que acompanhamos, desde 2018.
          </p>
          <p>
            Uma empresa só aparece ligada a alguém quando o CNPJ é o mesmo nos registros oficiais; nome parecido não liga nada. Pessoas físicas não aparecem: só empresas e
            entidades com CNPJ válido, e nomes de microempreendedores saem sem o CPF. Receber dinheiro público por um serviço ou doar para campanha é legal; estar aqui não é sinal
            de nada errado.
          </p>
        </Origem>
      </Container>
    </>
  );
}

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <dt className="text-sm font-semibold text-ink-2">{rotulo}</dt>
      <dd className="display tnum mt-1 text-3xl font-extrabold">{valor}</dd>
      {detalhe && <dd className="mt-0.5 text-xs text-ink-3">{detalhe}</dd>}
    </div>
  );
}

function Caminho({
  icone,
  titulo,
  itens,
  mais,
  vazio,
}: {
  icone: React.ReactNode;
  titulo: string;
  itens: { e: EmpresaResumo; valor: string; detalhe: string }[];
  mais: { href: string; rotulo: string };
  vazio?: string;
}) {
  return (
    <section className="cartao flex flex-col p-4 sm:p-5" aria-label={titulo}>
      <h3 className="flex items-center gap-2 font-semibold">
        <span className="text-accent-ink">{icone}</span>
        {titulo}
      </h3>
      {itens.length === 0 ? (
        <p className="mt-3 flex-1 text-sm text-ink-2">{vazio}</p>
      ) : (
        <ol className="mt-3 flex-1 divide-y divide-line">
          {itens.map(({ e, valor, detalhe }, i) => (
            <li key={e.cnpj}>
              <Link href={`/empresa/${e.cnpj}`} className="flex items-center gap-3 py-2 hover:underline">
                <span className="tnum w-5 shrink-0 text-sm text-ink-3">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.nome}</span>
                  <span className="block text-xs text-ink-3">{detalhe}</span>
                </span>
                <b className="tnum shrink-0 text-sm">{valor}</b>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <Link href={mais.href} className="link mt-3 inline-flex items-center gap-1 text-sm">
        {mais.rotulo}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
