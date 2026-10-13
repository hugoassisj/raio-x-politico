import { SeletorIdentidade } from "@/components/SeletorIdentidade";
import { Uf } from "@/components/Bandeira";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CicloEmenda } from "@/components/CicloEmenda";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { Paginacao } from "@/components/Paginacao";
import { SiglaPartido } from "@/components/Partido";
import { Container, Origem, Secao, Vazio } from "@/components/base";
import { formatarCnpj } from "@/lib/cnpj";
import { getDestinosEmendas } from "@/lib/data";
import { moedaCurta, numero, pct } from "@/lib/format";
import { lerPagina, paginar } from "@/lib/paginacao";
import { ESTADOS, nomeUf } from "@/lib/ufs";

export const metadata: Metadata = {
  title: "Emendas por cidade",
  description: "Quanto dinheiro de emendas cada cidade e cada estado recebeu, de quais parlamentares, e quanto já foi reservado e pago, com a fonte oficial.",
};

const POR_PAGINA = 30;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Emendas({ searchParams }: PageProps<"/emendas">) {
  const sp = await searchParams;
  const q = t(sp.q).slice(0, 80);
  const uf = ESTADOS.some((e) => e.uf === t(sp.uf)) ? t(sp.uf) : "";
  const escolhido = t(sp.destino);
  const todos = await getDestinosEmendas();
  const destino = escolhido ? todos.find((d) => d.chave === escolhido) : undefined;
  const termo = norm(q.trim());
  const lista = todos.filter((d) => (!uf || d.uf === uf) && (!termo || norm(d.nome).includes(termo)));
  const pg = paginar(lista, lerPagina(t(sp.pagina)), POR_PAGINA);
  const url = (mudar: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, uf, destino: "", pagina: "", ...mudar })) if (v) u.set(k, v);
    return `/emendas${u.size ? `?${u}` : ""}`;
  };
  const totais = lista.reduce((s, d) => ({ indicado: s.indicado + d.indicado, empenhado: s.empenhado + d.empenhado, pago: s.pago + d.pago }), {
    indicado: 0,
    empenhado: 0,
    pago: 0,
  });

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Emendas por cidade</h1>
      <p className="medida mt-3 text-lg text-ink-2">
        Emendas são a parte do orçamento federal que deputados e senadores escolhem para onde vai. Procure sua cidade para ver quem mandou dinheiro, quanto e quanto já foi pago.
      </p>
      <p className="medida mt-2 text-ink-3">Hoje mostramos as transferências especiais (“Emendas Pix”), que vão direto para prefeituras e governos estaduais.</p>

      {destino ? (
        <Secao
          titulo={`${destino.nome}${destino.uf ? ` (${destino.uf})` : ""}`}
          subtitulo={destino.cnpj ? `Recebedor com CNPJ ${formatarCnpj(destino.cnpj)}` : "O recebedor não tem CNPJ publicado nesta fonte."}
          acao={
            <Link href={url({})} className="link text-sm">
              Voltar para a lista
            </Link>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="cartao p-5">
              <CicloEmenda ciclo={destino} />
            </div>
            <div className="cartao p-5">
              <h3 className="font-semibold">Quem mandou ({destino.autores.length})</h3>
              <ul className="mt-2 divide-y divide-line">
                {destino.autores.map((a) => (
                  <li key={a.pid} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <Link href={`/politico/${a.pid}#emendas`} className="font-semibold hover:underline">
                        {a.nome}
                      </Link>
                      <span className="block text-sm text-ink-3">
                        <SiglaPartido sigla={a.partido} />
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-right text-sm">
                      <b>{moedaCurta(a.indicado)}</b>
                      <span className="block text-ink-3">pago {a.indicado ? pct(a.pago / a.indicado) : "0%"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Secao>
      ) : (
        <>
          <div className="mt-6">
            <FormFiltros acao="/emendas">
              <label className="flex min-w-[14rem] flex-[2] flex-col gap-1 text-sm">
                <span className="text-ink-3">Cidade ou governo</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Ex.: Campinas"
                  className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </label>
              <SeletorIdentidade tipo="uf" nome="uf" rotulo="Estado" valor={uf} textoTodos="Todos os estados" />
            </FormFiltros>
          </div>

          {lista.length > 0 && (
            <div className="cartao mt-6 p-5">
              <p className="mb-3 text-sm font-semibold text-ink-3">
                {uf ? `Somando ${nomeUf(uf)}` : "Somando o país"}
                {termo ? `, com “${q}”` : ""}: {numero(lista.length)} {lista.length === 1 ? "recebedor" : "recebedores"}
              </p>
              <CicloEmenda ciclo={totais} />
            </div>
          )}

          {lista.length === 0 ? (
            <div className="mt-6">
              <Vazio>{todos.length ? "Nenhum lugar com esses filtros." : "Os dados por cidade chegam na próxima coleta."}</Vazio>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-line cartao">
              {pg.itens.map((d) => (
                <li key={d.chave}>
                  <Link href={url({ destino: d.chave })} className="flex items-center justify-between gap-4 p-4 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {d.nome}
                        {d.uf ? (
                          <>
                            {" "}
                            <Uf uf={d.uf} altura={11} />
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                      <span className="block text-sm text-ink-3">
                        {d.autores.length} {d.autores.length === 1 ? "parlamentar" : "parlamentares"} · pago {d.indicado ? pct(d.pago / d.indicado) : "0%"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <b className="tnum">{moedaCurta(d.indicado)}</b>
                      <ChevronRight className="h-4 w-4 text-ink-3" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            <Paginacao pagina={pg.pagina} paginas={pg.paginas} href={(p) => url({ pagina: p > 1 ? String(p) : "" })} rotulo="Páginas de cidades" />
          </div>
        </>
      )}

      <Origem>
        <p>
          Transferegov, transferências especiais: o plano de ação mostra o valor indicado e o recebedor; o empenho mostra a reserva no orçamento; a ordem bancária mostra o
          pagamento. Ligamos cada etapa à anterior pelos números que a própria fonte publica.
        </p>
        <p>Ser pago mais tarde é comum: depende do orçamento e do plano do governo que recebe. Uma emenda indicada não é dinheiro na conta da cidade até ser paga.</p>
      </Origem>
    </Container>
  );
}
