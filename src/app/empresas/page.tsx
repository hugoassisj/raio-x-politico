import type { Metadata } from "next";
import Link from "next/link";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { Paginacao } from "@/components/Paginacao";
import { Container, Origem, Vazio } from "@/components/ui";
import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import { getEmpresas } from "@/lib/data";
import { moedaCurta, numero } from "@/lib/format";
import { lerPagina, paginar } from "@/lib/paginacao";

export const metadata: Metadata = {
  title: "Empresas",
  description: "Empresas e entidades pagas com a cota parlamentar ou ligadas a campanhas de quem acompanhamos, sempre pelo CNPJ, com a fonte oficial de cada valor.",
};

const POR_PAGINA = 30;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Empresas({ searchParams }: PageProps<"/empresas">) {
  const sp = await searchParams;
  const q = t(sp.q).slice(0, 80);
  const ligacao = ["cota", "campanhas"].includes(t(sp.ligacao)) ? t(sp.ligacao) : "";
  const todas = await getEmpresas();
  const cnpj = normalizarCnpj(q);
  const termo = norm(q.trim());
  // Part of a CNPJ also finds it (at least 4 digits, to avoid matching everything)
  const digitos = q.replace(/\D/g, "");
  const busca = (e: (typeof todas)[number]) => !termo || (cnpj ? e.cnpj === cnpj : norm(e.nome).includes(termo) || (digitos.length >= 4 && e.cnpj.includes(digitos)));
  const lista = todas.filter((e) => (!ligacao || (ligacao === "cota" ? e.cota > 0 : e.campanhas > 0)) && busca(e));
  const pg = paginar(lista, lerPagina(t(sp.pagina)), POR_PAGINA);
  const url = (pagina: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (ligacao) u.set("ligacao", ligacao);
    if (pagina > 1) u.set("pagina", String(pagina));
    return `/empresas${u.size ? `?${u}` : ""}`;
  };

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Empresas</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-2">
        Empresas e entidades que receberam dinheiro da cota parlamentar ou que doaram ou prestaram serviço para campanhas de quem acompanhamos. Uma empresa só aparece ligada a
        alguém quando o CNPJ é o mesmo nos registros oficiais. Nome parecido não liga nada.
      </p>
      <p className="mt-2 max-w-3xl text-ink-3">Receber dinheiro público por um serviço é legal. Estar nesta lista não é sinal de nada errado.</p>

      <div className="mt-6">
        <FormFiltros acao="/empresas">
          <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-sm">
            <span className="text-ink-3">Nome ou CNPJ</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Ex.: gráfica, 11.222.333/0001-81"
              className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
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
        </FormFiltros>
      </div>

      <p className="mt-6 text-ink-2" aria-live="polite">
        {numero(lista.length)} {lista.length === 1 ? "empresa" : "empresas"}
        {pg.paginas > 1 ? `, página ${pg.pagina} de ${pg.paginas}` : ""}. Ordem: maior valor somado primeiro.
      </p>

      {lista.length === 0 ? (
        <Vazio>{todas.length ? "Nenhuma empresa com esses filtros." : "Os dados de empresas chegam na próxima coleta completa."}</Vazio>
      ) : (
        <div className="cartao mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Empresas ligadas por CNPJ</caption>
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th scope="col" className="px-4 py-3 font-normal">
                  Empresa
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Cota parlamentar
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Campanhas
                </th>
                <th scope="col" className="px-4 py-3 text-right font-normal">
                  Pessoas ligadas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pg.itens.map((e) => (
                <tr key={e.cnpj}>
                  <td className="px-4 py-3">
                    <Link href={`/empresa/${e.cnpj}`} className="font-semibold hover:underline">
                      {e.nome}
                    </Link>
                    <span className="tnum block text-xs text-ink-3">CNPJ {formatarCnpj(e.cnpj)}</span>
                  </td>
                  <td className="tnum px-4 py-3 text-right">{e.cota ? moedaCurta(e.cota) : "não"}</td>
                  <td className="tnum px-4 py-3 text-right">{e.campanhas ? moedaCurta(e.campanhas) : "não"}</td>
                  <td className="tnum px-4 py-3 text-right">{e.pessoas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <Paginacao pagina={pg.pagina} paginas={pg.paginas} href={url} rotulo="Páginas de empresas" />
      </div>

      <Origem>
        <p>
          Cota parlamentar: despesas reembolsadas publicadas pela Câmara e pelo Senado, no período da coleta. Campanhas: prestação de contas entregue ao TSE pelas campanhas das
          pessoas que acompanhamos, desde 2018.
        </p>
        <p>Pessoas físicas não aparecem aqui: só empresas e entidades com CNPJ válido. Nomes de microempreendedores são publicados sem o CPF que às vezes vem junto.</p>
      </Origem>
    </Container>
  );
}
