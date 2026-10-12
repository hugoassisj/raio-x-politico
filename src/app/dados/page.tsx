import type { Metadata } from "next";
import { Container, Fonte, Secao } from "@/components/ui";
import { getMeta } from "@/lib/data";
import { dataHora, moeda, numero } from "@/lib/format";
import { METRICAS } from "@/lib/metricas";

export const metadata: Metadata = {
  title: "Fontes, metodologia e limites",
  description: "De onde vêm os dados do Raio-X Político, como cada número é calculado, quais são os limites e como verificar tudo.",
};

const STATUS: Record<string, { rotulo: string; cls: string }> = {
  ok: { rotulo: "Coletado", cls: "bg-ok-bg text-sim" },
  parcial: { rotulo: "Parcial", cls: "bg-alerta-bg text-alerta" },
  falhou: { rotulo: "Falhou", cls: "bg-alerta-bg text-nao" },
  ignorado: { rotulo: "Não configurado", cls: "bg-surface-2 text-ink-3" },
};

export default async function Dados() {
  const meta = await getMeta();
  const repo = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/hugoassisj/raio-x-politico";
  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Sobre os dados</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed">
        O Raio-X Político reúne dados públicos que já existem, espalhados em dezenas de sites oficiais, e os organiza para qualquer pessoa entender. Não produzimos notas, rankings
        de &ldquo;melhores&rdquo; ou opiniões: mostramos o que os registros oficiais dizem e como chegamos a cada número.
      </p>

      <Secao titulo="Princípios" subtitulo="O que guia cada decisão do projeto.">
        <ul className="grid gap-4 md:grid-cols-2">
          {[
            ["Todo número tem fonte", "Cada dado leva ao registro oficial de onde veio, e os arquivos completos podem ser baixados do repositório."],
            ["Fatos, não notas", "Mostramos posição em relação aos colegas (mediana, faixa), nunca uma nota de bom ou ruim. Faltar ou gastar pode ter boas explicações."],
            ["Comparação justa", "Só comparamos pessoas da mesma casa, e gastos com colegas do mesmo estado, porque as regras e tetos são diferentes."],
            [
              "IA com rédea curta",
              "Resumos de IA usam só registros públicos, toda afirmação precisa citar a fonte e o que não tem fonte é descartado. Tudo vem marcado como gerado por IA.",
            ],
            ["Código e dados abertos", "O código que coleta e calcula está no GitHub. Qualquer pessoa pode auditar, apontar erros e reproduzir os números."],
            ["Sem raspagem de redes", "Conteúdo de redes sociais só entra por APIs oficiais das plataformas. Perfis vêm do que o próprio político declarou à Câmara ou ao TSE."],
          ].map(([t, d]) => (
            <li key={t} className="cartao rounded-xl p-4">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-ink-2">{d}</p>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Como cada número é calculado" subtitulo="A mesma explicação que aparece em cada cartão dos perfis.">
        <div className="space-y-3">
          {METRICAS.map((m) => (
            <details key={m.chave} className="group cartao rounded-xl p-4">
              <summary className="flex items-center justify-between gap-4">
                <span>
                  <span className="block font-semibold">{m.titulo}</span>
                  <span className="block text-sm text-ink-3">{m.pergunta}</span>
                </span>
                <span aria-hidden className="text-ink-3 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-ink-2">
                <p>{m.calculo}</p>
                <p>
                  <b className="text-ink">Limites:</b> {m.limites}
                </p>
                <p className="flex flex-wrap gap-x-4">
                  {m.fontes.map((f) => (
                    <Fonte key={f.url} href={f.url}>
                      {f.nome}
                    </Fonte>
                  ))}
                </p>
              </div>
            </details>
          ))}
        </div>
      </Secao>

      <Secao titulo="Fontes consultadas" subtitulo={meta ? `Situação de cada fonte na última atualização, em ${dataHora(meta.geradoEm)}.` : "Os dados ainda não foram coletados."}>
        {meta && (
          <div className="overflow-x-auto cartao rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="px-4 py-2.5 font-normal">Fonte</th>
                  <th className="px-4 py-2.5 font-normal">Situação</th>
                  <th className="px-4 py-2.5 text-right font-normal">Registros</th>
                  <th className="px-4 py-2.5 font-normal">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {meta.fontes.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2.5">{f.url ? <Fonte href={f.url}>{f.nome}</Fonte> : f.nome}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS[f.status].cls}`}>{STATUS[f.status].rotulo}</span>
                    </td>
                    <td className="tnum px-4 py-2.5 text-right">{numero(f.registros)}</td>
                    <td className="max-w-md px-4 py-2.5 text-ink-3">{f.erro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Salários (subsídios)" subtitulo="Valores mensais brutos definidos em lei, sem contar cota, auxílios e verba de gabinete.">
        <ul className="grid gap-4 md:grid-cols-3">
          {(meta?.subsidios ?? []).map((s) => (
            <li key={s.cargo} className="cartao rounded-xl p-4">
              <p className="text-sm text-ink-3">{s.cargo}</p>
              <p className="figure mt-1 text-2xl font-bold">{moeda(s.valor)}</p>
              {s.fonte.startsWith("http") ? <Fonte href={s.fonte}>Fonte</Fonte> : <p className="mt-1 text-sm text-ink-3">{s.fonte}</p>}
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Limites conhecidos" subtitulo="O que os dados ainda não permitem afirmar.">
        <ul className="list-disc space-y-2 pl-5 text-ink-2">
          <li>A Câmara não publica em formato aberto se uma ausência foi justificada. O Senado publica, e mostramos separado.</li>
          <li>Poucas assembleias legislativas publicam presença, votos e gastos em formato aberto. Para os estados sem dados, mostramos o que o TSE informa.</li>
          <li>A ligação entre um parlamentar e seus registros no TSE e no Transferegov é feita por nome e data de nascimento, e pode falhar em casos raros de homônimos.</li>
          <li>Patrimônio é o valor declarado pelo próprio candidato, geralmente o preço histórico de compra, não o de mercado.</li>
          <li>Os dados oficiais podem ser corrigidos pelas próprias casas depois da publicação. Atualizamos tudo diariamente.</li>
        </ul>
      </Secao>

      <Secao titulo="Verifique, baixe, contribua">
        <div className="flex flex-wrap gap-3">
          <a href={`${repo}/tree/main/data`} className="botao">
            Baixar todos os dados (JSON)
          </a>
          <a href={repo} className="botao-sec">
            Ver o código
          </a>
          <a href={`${repo}/issues/new`} className="botao-sec">
            Reportar um erro
          </a>
        </div>
      </Secao>
    </Container>
  );
}
