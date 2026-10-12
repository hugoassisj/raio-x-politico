import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building, ChevronRight, Network } from "lucide-react";
import { Container, Fonte, Origem, Secao } from "@/components/ui";
import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import { getEmpresa, getPoliticos } from "@/lib/data";
import { data, moeda, moedaCurta, numero } from "@/lib/format";
import { urlCorrecao } from "@/lib/site";

/** Official lookup of any CNPJ at the Receita Federal (opens their own form) */
const RECEITA = "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";

export async function generateMetadata({ params }: PageProps<"/empresa/[cnpj]">): Promise<Metadata> {
  const { cnpj } = await params;
  const e = await getEmpresa(cnpj);
  return e ? { title: `${e.nome}: ligações com políticos`, description: `Pagamentos da cota parlamentar e ligações com campanhas da empresa ${e.nome}, pelo CNPJ.` } : {};
}

export default async function Empresa({ params }: PageProps<"/empresa/[cnpj]">) {
  const { cnpj } = await params;
  const c = normalizarCnpj(decodeURIComponent(cnpj));
  if (!c) notFound();
  const [e, pols] = await Promise.all([getEmpresa(c), getPoliticos()]);
  if (!e) notFound();
  const porId = new Map(pols.map((p) => [p.id, p]));
  const pessoa = (pid: string, nome: string) => {
    const p = porId.get(pid);
    const href = p ? `/politico/${pid}` : /^pres-/.test(pid) ? `/presidencia/${pid}` : undefined;
    return (
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
            {p.cargo} · {p.partido}-{p.uf}
          </span>
        )}
      </span>
    );
  };
  const doacoes = e.campanhas?.registros.filter((r) => r.papel === "doador") ?? [];
  const servicos = e.campanhas?.registros.filter((r) => r.papel === "fornecedor") ?? [];

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
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/relacoes?no=e:${e.cnpj}`} className="botao">
              <Network className="h-4 w-4" aria-hidden />
              Ver no mapa de relações
            </Link>
            <Fonte href={RECEITA}>Consultar o CNPJ na Receita Federal</Fonte>
          </div>
          <p className="mt-5 max-w-3xl text-ink-2">
            Todas as ligações abaixo foram confirmadas pelo mesmo CNPJ nos registros oficiais. Receber por um serviço ou doar para campanha é legal dentro das regras; estar aqui
            não é sinal de nada errado.
          </p>
        </Container>
      </header>

      <Container>
        {e.cota && (
          <Secao
            id="cota"
            titulo="Pagamentos com a cota parlamentar"
            subtitulo={`${moeda(e.cota.total)} em ${numero(e.cota.n)} ${e.cota.n === 1 ? "pagamento" : "pagamentos"} de ${e.cota.porPessoa.length} ${e.cota.porPessoa.length === 1 ? "parlamentar" : "parlamentares"}, de ${data(e.cota.periodo.inicio)} a ${data(e.cota.periodo.fim)}.`}
          >
            <ul className="divide-y divide-line cartao">
              {e.cota.porPessoa.map((x) => (
                <li key={x.pid} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  {pessoa(x.pid, x.nome)}
                  <span className="text-right text-sm">
                    <b className="tnum text-base">{moeda(x.valor)}</b>
                    <span className="block text-ink-3">
                      {x.n} {x.n === 1 ? "pagamento" : "pagamentos"}
                      {x.primeira ? `, ${x.primeira === x.ultima ? data(x.primeira) : `de ${data(x.primeira)} a ${data(x.ultima!)}`}` : ""}
                    </span>
                    {x.exemplo && (
                      <a href={x.exemplo} target="_blank" rel="noopener noreferrer" className="link">
                        Nota fiscal mais recente<span className="sr-only"> (abre em nova aba)</span>
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {(doacoes.length > 0 || servicos.length > 0) && (
          <Secao id="campanhas" titulo="Ligações com campanhas" subtitulo="Segundo a prestação de contas entregue ao TSE pela campanha de cada pessoa.">
            <div className="grid gap-4 lg:grid-cols-2">
              {[
                { titulo: "Doou para a campanha", lista: doacoes },
                { titulo: "Foi paga pela campanha", lista: servicos },
              ]
                .filter((g) => g.lista.length)
                .map((g) => (
                  <div key={g.titulo} className="cartao p-4 sm:p-5">
                    <h3 className="font-semibold">{g.titulo}</h3>
                    <ul className="mt-2 divide-y divide-line">
                      {g.lista.map((r) => (
                        <li key={`${r.pid}-${r.ano}-${r.papel}`} className="flex items-center justify-between gap-3 py-2.5">
                          {pessoa(r.pid, r.nome)}
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
          {e.cota && <p>{e.cota.fonte}. Cada pagamento leva à nota fiscal publicada pela Casa.</p>}
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
