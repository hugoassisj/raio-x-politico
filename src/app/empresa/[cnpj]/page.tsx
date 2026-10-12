import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, ChevronDown, ChevronRight, Network, Scale } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { SiglaPartido } from "@/components/Partido";
import { Seletor } from "@/components/Filtros";
import { Barras, Container, Fonte, Origem, Pill, Secao } from "@/components/ui";
import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import { getEmpresa, getPoliticos } from "@/lib/data";
import { data, moeda, moedaCurta, numero } from "@/lib/format";
import { urlCorrecao } from "@/lib/site";
import type { EmpresaDetalhe, PoliticoResumo } from "@/lib/types";

/** Official lookup of any CNPJ at the Receita Federal (opens their own form) */
const RECEITA = "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";

export async function generateMetadata({ params }: PageProps<"/empresa/[cnpj]">): Promise<Metadata> {
  const { cnpj } = await params;
  const e = await getEmpresa(cnpj);
  return e ? { title: `${e.nome}: quem pagou e quanto`, description: `Pagamentos da cota parlamentar e ligações com campanhas da empresa ${e.nome}, pelo CNPJ.` } : {};
}

/** People shown at once; the rest open on demand so a fuel or airline page stays readable */
const VISIVEIS = 25;

const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const CASAS = { camara: "Deputados federais", senado: "Senadores", assembleia: "Deputados estaduais" } as const;
type Casa = keyof typeof CASAS;
const ORDENS = { valor: "Maior valor", n: "Mais pagamentos", nome: "Nome (A a Z)", ultima: "Pagamento mais recente" } as const;
type Ordem = keyof typeof ORDENS;

const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`;

/** Which houses the people paying this company sit in, for the summary line. */
function porCasa(pessoas: { pid: string }[], porId: Map<string, PoliticoResumo>): string {
  const n = { camara: 0, senado: 0, assembleia: 0, outros: 0 };
  for (const x of pessoas) {
    const p = porId.get(x.pid);
    if (!p) n.outros++;
    else if (p.casa === "camara") n.camara++;
    else if (p.casa === "senado") n.senado++;
    else n.assembleia++;
  }
  return [
    n.camara && plural(n.camara, "deputado federal", "deputados federais"),
    n.senado && plural(n.senado, "senador", "senadores"),
    n.assembleia && plural(n.assembleia, "deputado estadual", "deputados estaduais"),
    n.outros && plural(n.outros, "pessoa sem perfil no site", "pessoas sem perfil no site"),
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function Empresa({ params, searchParams }: PageProps<"/empresa/[cnpj]">) {
  const [{ cnpj }, sp] = await Promise.all([params, searchParams]);
  const c = normalizarCnpj(decodeURIComponent(cnpj));
  if (!c) notFound();
  const [e, pols] = await Promise.all([getEmpresa(c), getPoliticos()]);
  if (!e) notFound();
  const porId = new Map(pols.map((p) => [p.id, p]));
  const doacoes = e.campanhas?.registros.filter((r) => r.papel === "doador") ?? [];
  const servicos = e.campanhas?.registros.filter((r) => r.papel === "fornecedor") ?? [];
  const cota = e.cota;
  const pessoasCota = cota?.porPessoa ?? [];
  const comparar = pessoasCota.filter((x) => porId.has(x.pid)).slice(0, 4);

  // Flows inside the payer list: by house, party, name and order, all in the address
  const casaDe = (pid: string): Casa | "" => {
    const p = porId.get(pid);
    return !p ? "" : p.casa === "camara" ? "camara" : p.casa === "senado" ? "senado" : "assembleia";
  };
  const casa = (t(sp.casa) in CASAS ? t(sp.casa) : "") as Casa | "";
  const partido = t(sp.partido).toUpperCase().slice(0, 15);
  const q = t(sp.q).slice(0, 80);
  const termo = norm(q.trim());
  const ordem = (t(sp.ordem) in ORDENS ? t(sp.ordem) : "valor") as Ordem;
  const nomeDe = (x: { pid: string; nome: string }) => porId.get(x.pid)?.nome ?? x.nome;
  const visiveis = pessoasCota
    .filter((x) => (!casa || casaDe(x.pid) === casa) && (!partido || porId.get(x.pid)?.partido === partido) && (!termo || norm(nomeDe(x)).includes(termo)))
    .sort((a, b) => {
      const c =
        ordem === "nome"
          ? nomeDe(a).localeCompare(nomeDe(b), "pt-BR")
          : ordem === "n"
            ? b.n - a.n
            : ordem === "ultima"
              ? (b.ultima ?? "").localeCompare(a.ultima ?? "")
              : b.valor - a.valor;
      return c || b.valor - a.valor || a.pid.localeCompare(b.pid);
    });
  const contagemCasa = { camara: 0, senado: 0, assembleia: 0 };
  for (const x of pessoasCota) {
    const k = casaDe(x.pid);
    if (k) contagemCasa[k]++;
  }
  const partidos = [...new Set(pessoasCota.map((x) => porId.get(x.pid)?.partido).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtrando = !!casa || !!partido || !!termo;
  const url = (over: Partial<{ casa: string; partido: string; q: string; ordem: string }> = {}) => {
    const u = new URLSearchParams();
    const v = { casa, partido, q, ordem, ...over };
    if (v.casa) u.set("casa", v.casa);
    if (v.partido) u.set("partido", v.partido);
    if (v.q) u.set("q", v.q);
    if (v.ordem && v.ordem !== "valor") u.set("ordem", v.ordem);
    return `/empresa/${e.cnpj}${u.size ? `?${u}` : ""}#cota`;
  };

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-8 sm:py-10">
          <nav aria-label="Trilha" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-ink-3">
            <Link href="/" className="hover:underline">
              Início
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link href="/empresas" className="hover:underline">
              Empresas
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span className="text-ink-2">{e.nome}</span>
          </nav>
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-ink">
            <Building className="h-4 w-4" aria-hidden />
            Empresa ou entidade
          </p>
          <h1 className="display mt-1 text-3xl font-extrabold sm:text-5xl">{e.nome}</h1>
          <p className="tnum mt-2 text-lg text-ink-2">CNPJ {formatarCnpj(e.cnpj)}</p>
          {e.nomes.length > 0 && <p className="mt-1 text-sm text-ink-3">Também aparece como: {e.nomes.join("; ")}</p>}

          {/* The answer first: how much, from how many people, for what */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cota && (
              <>
                <Numero rotulo="Recebido da cota parlamentar" valor={moedaCurta(cota.total)} detalhe={`de ${data(cota.periodo.inicio)} a ${data(cota.periodo.fim)}`} />
                <Numero rotulo="Pessoas que pagaram" valor={numero(pessoasCota.length)} detalhe={porCasa(pessoasCota, porId)} />
                <Numero
                  rotulo="Pagamentos"
                  valor={numero(cota.n)}
                  detalhe={cota.porCategoria?.[0] ? `a maior parte em ${cota.porCategoria[0].categoria.toLowerCase()}` : undefined}
                />
              </>
            )}
            {e.campanhas && (
              <Numero
                rotulo="Ligações com campanhas"
                valor={numero(e.campanhas.registros.length)}
                detalhe={[doacoes.length && plural(doacoes.length, "doação", "doações"), servicos.length && plural(servicos.length, "serviço pago", "serviços pagos")]
                  .filter(Boolean)
                  .join(" e ")}
              />
            )}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/relacoes?no=e:${e.cnpj}`} className="botao">
              <Network className="h-4 w-4" aria-hidden />
              Ver no mapa de relações
            </Link>
            {comparar.length > 1 && (
              <Link href={`/comparar?ids=${comparar.map((x) => x.pid).join(",")}`} className="botao-sec">
                <Scale className="h-4 w-4" aria-hidden />
                Comparar quem mais pagou
              </Link>
            )}
            <Fonte href={RECEITA}>Consultar o CNPJ na Receita Federal</Fonte>
          </div>
          <p className="mt-5 max-w-3xl text-ink-2">
            Todas as ligações abaixo foram confirmadas pelo mesmo CNPJ nos registros oficiais. Receber por um serviço ou doar para campanha é legal dentro das regras; estar aqui
            não é sinal de nada errado.
          </p>
        </Container>
      </header>

      <Container>
        {cota && (
          <Secao
            id="cota"
            natureza="ligacao"
            titulo="Quem pagou esta empresa com a cota parlamentar"
            subtitulo="Toque numa casa para ver só ela, procure alguém pelo nome ou mude a ordem. Toque em “Ver pagamentos” para a data, o valor e a nota fiscal de cada um."
          >
            {/* Quick flow: one tap per house, with the count of each */}
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por casa">
              <Pill href={url({ casa: "" })} ativo={!casa}>
                Todas ({numero(pessoasCota.length)})
              </Pill>
              {(Object.keys(CASAS) as Casa[])
                .filter((k) => contagemCasa[k] > 0)
                .map((k) => (
                  <Pill key={k} href={url({ casa: casa === k ? "" : k })} ativo={casa === k}>
                    {CASAS[k]} ({numero(contagemCasa[k])})
                  </Pill>
                ))}
            </div>
            <form action={`/empresa/${e.cnpj}`} method="get" className="mb-4 flex flex-wrap items-end gap-3">
              {casa && <input type="hidden" name="casa" value={casa} />}
              <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-sm">
                <span className="text-ink-3">Procurar pelo nome</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Nome do parlamentar"
                  className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </label>
              {partidos.length > 1 && <Seletor nome="partido" rotulo="Partido" valor={partido} opcoes={[["", "Todos"], ...partidos.map((p): [string, string] => [p, p])]} />}
              <Seletor nome="ordem" rotulo="Ordem" valor={ordem} opcoes={Object.entries(ORDENS).map(([k, v]): [string, string] => [k, v])} />
              <button type="submit" className="botao-sec">
                Aplicar
              </button>
              {filtrando && (
                <Link href={`/empresa/${e.cnpj}#cota`} className="link text-sm">
                  Limpar filtros
                </Link>
              )}
            </form>
            <p className="mb-3 text-sm text-ink-2" aria-live="polite">
              {visiveis.length === pessoasCota.length ? (
                <>
                  <b className="tnum">{numero(pessoasCota.length)}</b> pessoas pagaram esta empresa.
                </>
              ) : (
                <>
                  Mostrando <b className="tnum">{numero(visiveis.length)}</b> de <b className="tnum">{numero(pessoasCota.length)}</b> pessoas. Os totais do topo são os da empresa
                  inteira.
                </>
              )}
            </p>
            <div className="grid gap-6 lg:grid-cols-[1fr_minmax(16rem,22rem)] lg:items-start">
              <div className="cartao">
                {visiveis.length === 0 ? (
                  <p className="p-6 text-center">
                    Ninguém com esses filtros.{" "}
                    <Link href={`/empresa/${e.cnpj}#cota`} className="link">
                      Mostrar todos de novo
                    </Link>
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {visiveis.slice(0, VISIVEIS).map((x) => (
                      <PessoaCota key={x.pid} x={x} p={porId.get(x.pid)} totalEmpresa={cota.total} />
                    ))}
                  </ul>
                )}
                {visiveis.length > VISIVEIS && (
                  <details className="group border-t border-line">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 px-4 text-sm font-semibold text-accent-ink">
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                      Mostrar as outras {numero(visiveis.length - VISIVEIS)} pessoas
                    </summary>
                    <ul className="divide-y divide-line border-t border-line">
                      {visiveis.slice(VISIVEIS).map((x) => (
                        <PessoaCota key={x.pid} x={x} p={porId.get(x.pid)} totalEmpresa={cota.total} />
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              {cota.porCategoria && cota.porCategoria.length > 0 && (
                <aside className="cartao p-4 sm:p-5" aria-labelledby="para-que">
                  <h3 id="para-que" className="font-semibold">
                    Para que o dinheiro foi usado
                  </h3>
                  <p className="mb-3 text-xs text-ink-3">Categoria declarada pela Casa em cada reembolso.</p>
                  <Barras
                    itens={cota.porCategoria.slice(0, 8).map((k) => ({ rotulo: k.categoria, valor: k.valor, detalhe: plural(k.n, "pagamento", "pagamentos") }))}
                    formato={moedaCurta}
                    max={cota.total}
                  />
                </aside>
              )}
            </div>
          </Secao>
        )}

        {(doacoes.length > 0 || servicos.length > 0) && (
          <Secao id="campanhas" natureza="ligacao" titulo="Ligações com campanhas" subtitulo="Segundo a prestação de contas entregue ao TSE pela campanha de cada pessoa.">
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { titulo: "Doou para a campanha de", lista: doacoes },
                { titulo: "Foi paga pela campanha de", lista: servicos },
              ]
                .filter((g) => g.lista.length)
                .map((g) => (
                  <div key={g.titulo} className="cartao p-4 sm:p-5">
                    <h3 className="font-semibold">{g.titulo}</h3>
                    <ul className="mt-2 divide-y divide-line">
                      {g.lista.map((r) => (
                        <li key={`${r.pid}-${r.ano}-${r.papel}`} className="flex items-center justify-between gap-3 py-2.5">
                          <Pessoa pid={r.pid} nome={r.nome} p={porId.get(r.pid)} />
                          <span className="shrink-0 text-right text-sm">
                            <b className="tnum">{moedaCurta(r.valor)}</b>
                            <span className="block text-ink-3">Eleição de {r.ano}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </Secao>
        )}

        <Origem>
          {cota && <p>{cota.fonte}. Cada pagamento leva à nota fiscal publicada pela Casa; os valores são os reembolsados no período da coleta.</p>}
          {e.campanhas && <p>{e.campanhas.fonte}, desde 2018, para as campanhas das pessoas acompanhadas pelo site e de quem disputou a Presidência.</p>}
          <p>
            Uma ligação só existe quando o CNPJ é exatamente o mesmo. Se algo parece errado,{" "}
            <a href={urlCorrecao(`/empresa/${e.cnpj}`)} target="_blank" rel="noopener noreferrer">
              avise para corrigirmos
            </a>
            .
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

function Pessoa({ pid, nome, p }: { pid: string; nome: string; p?: PoliticoResumo }) {
  const href = p ? `/politico/${pid}` : /^pres-/.test(pid) ? `/presidencia/${pid}` : undefined;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar src={p?.foto} nome={p?.nome ?? nome} size={36} />
      <span className="min-w-0">
        {href ? (
          <Link href={href} className="font-semibold hover:underline">
            {p?.nome ?? nome}
          </Link>
        ) : (
          <span className="font-semibold">{nome}</span>
        )}
        {p && (
          <span className="block text-xs text-ink-3">
            {p.cargo} · <SiglaPartido sigla={p.partido} /> · {p.uf}
          </span>
        )}
      </span>
    </span>
  );
}

type PessoaDaCota = NonNullable<EmpresaDetalhe["cota"]>["porPessoa"][number];

function PessoaCota({ x, p, totalEmpresa }: { x: PessoaDaCota; p?: PoliticoResumo; totalEmpresa: number }) {
  const parte = totalEmpresa > 0 ? Math.round((x.valor / totalEmpresa) * 100) : 0;
  const quando = x.primeira ? (x.primeira === x.ultima ? data(x.primeira) : `de ${data(x.primeira)} a ${data(x.ultima!)}`) : "";
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Pessoa pid={x.pid} nome={x.nome} p={p} />
        <span className="text-right text-sm">
          <b className="tnum text-base">{moeda(x.valor)}</b>
          <span className="block text-ink-3">
            {plural(x.n, "pagamento", "pagamentos")}
            {quando ? `, ${quando}` : ""}
            {parte > 0 ? ` · ${parte}% do que a empresa recebeu` : ""}
          </span>
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-2" aria-hidden>
        <div className="crescer-x h-1.5 rounded-full bg-accent" style={{ width: `${Math.max(0.5, parte)}%` }} />
      </div>
      {x.pagamentos && x.pagamentos.length > 0 ? (
        <details className="group mt-2">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-accent-ink">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            Ver pagamentos {x.n > x.pagamentos.length ? `(os ${x.pagamentos.length} mais recentes de ${x.n})` : `(${x.pagamentos.length})`}
          </summary>
          <table className="mt-1 w-full text-sm">
            <caption className="sr-only">Pagamentos de {x.nome} a esta empresa</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Para quê</th>
                <th scope="col">Valor</th>
                <th scope="col">Documento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {x.pagamentos.map((g, i) => (
                <tr key={i}>
                  <td className="tnum py-1.5 pr-3 text-ink-2">{g.data.length === 7 ? g.data.replace(/(\d{4})-(\d{2})/, "$2/$1") : data(g.data)}</td>
                  <td className="py-1.5 pr-3">{g.categoria}</td>
                  <td className="tnum py-1.5 pr-3 text-right font-semibold">{moeda(g.valor)}</td>
                  <td className="py-1.5 text-right">
                    {g.url ? (
                      <a href={g.url} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-6 items-center">
                        Nota fiscal<span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    ) : (
                      <span className="text-ink-3">sem documento</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {p && (
            <p className="mt-2 text-xs text-ink-3">
              <Link href={`/politico/${x.pid}#gastos`} className="link">
                Todos os gastos de {p.nome}
              </Link>
            </p>
          )}
        </details>
      ) : (
        x.exemplo && (
          <p className="mt-2 text-sm">
            <a href={x.exemplo} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-6 items-center">
              Nota fiscal mais recente<span className="sr-only"> (abre em nova aba)</span>
            </a>
          </p>
        )
      )}
    </li>
  );
}
