import type { Metadata } from "next";
import Link from "next/link";
import { GraficoMensal } from "@/components/GraficoMensal";
import { LinhaPolitico } from "@/components/Listas";
import { Barras, Container, Origem, Secao, Vazio } from "@/components/ui";
import { getGastosGerais, getPoliticos } from "@/lib/data";
import { mesAno, moeda, moedaCurta, numero } from "@/lib/format";
import { metrica, NOME_CASA } from "@/lib/metricas";

export const metadata: Metadata = {
  title: "Gastos com a cota parlamentar",
  description: "Quanto deputados e senadores gastam da cota parlamentar, em quê, com quais fornecedores e quais gastos merecem um segundo olhar.",
};

const REGRAS: Record<string, string> = {
  documento_invalido: "CNPJ/CPF inválido",
  refeicao_atipica: "Refeição atípica",
  duplicidade: "Possível duplicidade",
  fornecedor_concentrado: "Fornecedor concentrado",
  valor_atipico: "Valor atípico",
};

export default async function Gastos() {
  const [g, pols] = await Promise.all([getGastosGerais(), getPoliticos()]);
  if (!g) {
    return (
      <Container className="py-10">
        <h1 className="display text-4xl font-extrabold">Gastos com a cota parlamentar</h1>
        <div className="mt-6">
          <Vazio>Os dados de gastos ainda não foram coletados.</Vazio>
        </div>
      </Container>
    );
  }
  const total = g.porCasa.reduce((s, c) => s + c.total, 0);
  const maiores = pols.filter((p) => p.m.gasto12m != null && p.emExercicio).sort((a, b) => b.m.gasto12m! - a.m.gasto12m!);
  const comAlertas = pols.filter((p) => (p.m.alertas ?? 0) > 0).sort((a, b) => b.m.alertas! - a.m.alertas!);

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Gastos com a cota parlamentar</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed">
        Entre {mesAno(g.periodo.inicio)} e {mesAno(g.periodo.fim)}, parlamentares pediram reembolso de <span className="grifo font-semibold">{moeda(total)}</span> em despesas do
        mandato: passagens, combustível, aluguel de escritório, divulgação e alimentação.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {g.porCasa.map((c) => (
          <div key={c.casa} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
            <h2 className="font-semibold">{NOME_CASA[c.casa]}</h2>
            <p className="figure mt-2 text-3xl font-bold">{moedaCurta(c.total)}</p>
            <p className="text-sm text-ink-3">
              {numero(c.parlamentares)} parlamentares, média de {moedaCurta(c.total / Math.max(1, c.parlamentares))} por pessoa
            </p>
            <div className="mt-4">
              <GraficoMensal meses={c.porMes} />
            </div>
          </div>
        ))}
      </div>

      <Secao titulo="Em que o dinheiro é gasto" subtitulo="Categorias da cota somadas para todos os parlamentares da casa.">
        <div className="grid gap-6 md:grid-cols-2">
          {g.porCasa.map((c) => (
            <div key={c.casa} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">{NOME_CASA[c.casa]}</h3>
              <Barras
                itens={g.categorias
                  .filter((x) => x.casa === c.casa)
                  .slice(0, 8)
                  .map((x) => ({ rotulo: x.categoria, valor: x.valor }))}
                formato={moedaCurta}
              />
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Quem mais gastou" subtitulo="Lembre que o teto da cota varia por estado: compare cada pessoa com colegas do mesmo estado no perfil.">
        <div className="grid gap-6 md:grid-cols-2">
          {(["camara", "senado"] as const).map((casa) => {
            const l = maiores.filter((p) => p.casa === casa).slice(0, 10);
            if (!l.length) return null;
            return (
              <div key={casa} className="rounded-xl border border-line bg-surface p-3">
                <h3 className="px-2 pb-1 pt-1 font-semibold">{NOME_CASA[casa]}</h3>
                {l.map((p) => (
                  <LinhaPolitico key={p.id} p={p} valor={moedaCurta(p.m.gasto12m)} />
                ))}
                <Link href={`/politicos?casa=${casa}&ordem=gasto12m&dir=desc`} className="link block px-2 py-1 text-sm">
                  Ver todos em ordem
                </Link>
              </div>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Fornecedores que mais receberam" subtitulo="Empresas e pessoas pagas com a cota, somando todos os parlamentares.">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-3">
                <th className="px-4 py-2.5 font-normal">Fornecedor</th>
                <th className="px-4 py-2.5 text-right font-normal">Parlamentares</th>
                <th className="px-4 py-2.5 text-right font-normal">Pagamentos</th>
                <th className="px-4 py-2.5 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {g.fornecedores.slice(0, 25).map((f) => (
                <tr key={(f.doc ?? "") + f.nome}>
                  <td className="px-4 py-2.5">
                    <span className="block font-semibold">{f.nome || "Sem nome"}</span>
                    {f.doc && <span className="tnum block text-ink-3">{f.doc}</span>}
                  </td>
                  <td className="tnum px-4 py-2.5 text-right">{numero(f.parlamentares)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{numero(f.n)}</td>
                  <td className="tnum px-4 py-2.5 text-right font-semibold">{moedaCurta(f.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>

      <Secao
        titulo="Gastos para conferir"
        subtitulo={metrica("alertas").limites}
        origem={
          <>
            <p>{metrica("alertas").calculo}</p>
          </>
        }
      >
        <div className="mb-6 flex flex-wrap gap-3">
          {Object.entries(g.alertasPorRegra).map(([r, n]) => (
            <div key={r} className="rounded-lg border border-alerta/40 bg-alerta-bg px-4 py-2">
              <p className="figure text-2xl font-bold">{numero(n)}</p>
              <p className="text-sm">{REGRAS[r] ?? r}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <h3 className="px-2 pb-1 pt-1 font-semibold">Parlamentares com mais pontos de atenção</h3>
          {comAlertas.slice(0, 10).map((p) => (
            <LinhaPolitico key={p.id} p={p} valor={numero(p.m.alertas)} />
          ))}
        </div>
      </Secao>

      <Origem>
        <p>{metrica("gasto12m").calculo}</p>
        <p>{metrica("gasto12m").limites}</p>
      </Origem>
    </Container>
  );
}
