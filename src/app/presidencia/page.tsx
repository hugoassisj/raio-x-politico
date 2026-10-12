import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Landmark } from "lucide-react";
import { Barras, Container, Fonte, Origem, Secao, Vazio } from "@/components/ui";
import { SiglaPartido } from "@/components/Partido";
import { TextoComTermos } from "@/components/Termos";
import { CARGOS } from "@/lib/cargos";
import { rotuloResultado } from "@/lib/carreira";
import { getMeta, getPresidencia } from "@/lib/data";
import { data, numero } from "@/lib/format";
import { pessoasPorUltimaDisputa, situacaoDaPresidencia } from "@/lib/presidencia";
import type { EleicaoPresidencial } from "@/lib/types";

export const metadata: Metadata = {
  title: "Presidência da República",
  description: "Quem foi eleito Presidente, todas as eleições para Presidente desde 1994 e o que o Poder Executivo enviou ao Congresso, com a fonte oficial de cada dado.",
};

const PRESIDENTE = CARGOS.find((c) => c.id === "presidente")!;

const CHIP: Record<string, string> = {
  eleito: "bg-sim-soft text-sim",
  "segundo-turno": "bg-accent-soft text-accent-ink",
};

/** People with a profile on the site go to it; everyone else to their page under /presidencia. */
const hrefPessoa = (pessoa: string) => (/^pres-/.test(pessoa) ? `/presidencia/${pessoa}` : `/politico/${pessoa}`);

function Candidato({ c }: { c: EleicaoPresidencial["candidatos"][number] }) {
  return (
    <Link href={hrefPessoa(c.pessoa)} className="font-semibold hover:underline">
      {c.nomeUrna}
    </Link>
  );
}

export default async function Presidencia() {
  const [p, meta] = await Promise.all([getPresidencia(), getMeta()]);
  const hoje = meta ? new Date(meta.geradoEm) : new Date();
  const s = p ? situacaoDaPresidencia(p.eleicoes, hoje) : undefined;
  const pessoas = p ? pessoasPorUltimaDisputa(p) : [];
  const atosRecentes = p?.atos.slice(0, 20) ?? [];
  const ultimosAnos = p?.atosPorAno.slice(-12) ?? [];
  const totalAtos = p?.atosPorAno.reduce((n, a) => n + a.medidasProvisorias + a.projetos, 0) ?? 0;

  return (
    <>
      <header className="border-b border-line bg-surface">
        <Container className="py-10">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-ink">
            <Landmark className="h-4 w-4" aria-hidden />
            Poder Executivo federal
          </p>
          <h1 className="display mt-2 text-4xl font-extrabold sm:text-5xl">Presidência da República</h1>
          <p className="mt-3 max-w-3xl text-xl leading-relaxed text-ink-2">
            {PRESIDENTE.faz} {PRESIDENTE.mandato.charAt(0).toUpperCase() + PRESIDENTE.mandato.slice(1)}.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {PRESIDENTE.exemplos.map((e) => (
              <li key={e} className="chip">
                {e}
              </li>
            ))}
          </ul>

          {s && (s.emExercicio || s.proxima) && (
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {s.emExercicio && (
                <div className="cartao p-5 sm:p-6">
                  <p className="text-sm font-bold text-ink-3">Quem a última eleição colocou no cargo</p>
                  <p className="display mt-1 text-3xl font-extrabold">
                    <Candidato c={s.emExercicio.candidato} />
                  </p>
                  <p className="mt-1 text-ink-2">
                    {rotuloResultado("eleito", s.emExercicio.candidato.sexo)} em {s.emExercicio.ano} ({s.emExercicio.candidato.partido}), para o mandato de {s.emExercicio.inicio} a{" "}
                    {s.emExercicio.fim}.
                  </p>
                  <p className="mt-3 text-sm text-ink-3">
                    Vem do resultado oficial do TSE. Afastamentos, renúncias e substituições (como um impeachment) não aparecem nesses arquivos.
                  </p>
                </div>
              )}
              {s.proxima && (
                <div className="cartao p-5 sm:p-6">
                  <p className="text-sm font-bold text-ink-3">Eleição de {s.proxima.ano}</p>
                  {s.proxima.eleito ? (
                    <p className="mt-1 text-lg">
                      <Candidato c={s.proxima.eleito} /> foi {rotuloResultado("eleito", s.proxima.eleito.sexo).toLowerCase()} para o mandato que começa em janeiro de{" "}
                      {s.proxima.ano + 1}.
                    </p>
                  ) : s.proxima.segundoTurno.length ? (
                    <p className="mt-1 text-lg">
                      Foram ao 2º turno:{" "}
                      {s.proxima.segundoTurno.map((c, i) => (
                        <span key={c.pessoa}>
                          {i > 0 ? " e " : ""}
                          <Candidato c={c} /> ({c.partido})
                        </span>
                      ))}
                      .
                    </p>
                  ) : (
                    <p className="mt-1 text-lg">{s.proxima.candidatos} candidaturas registradas. O TSE ainda não publicou o resultado nos arquivos.</p>
                  )}
                  <p className="mt-3 text-sm text-ink-3">Como o TSE publica nos arquivos de candidaturas, conferidos em {data(hoje.toISOString().slice(0, 10))}.</p>
                </div>
              )}
            </div>
          )}
        </Container>
      </header>

      <Container>
        {!p ? (
          <Secao titulo="Dados da Presidência">
            <Vazio>Os dados da Presidência ainda não foram coletados. Eles chegam na próxima coleta completa dos arquivos do TSE.</Vazio>
          </Secao>
        ) : (
          <>
            <Secao
              id="eleicoes"
              titulo="Eleições para Presidente desde 1994"
              subtitulo="Em cada eleição, quem disputou, por qual partido e o resultado oficial. A ordem é a do resultado e, depois, alfabética."
            >
              <div className="grid gap-4 md:grid-cols-2">
                {p.eleicoes.map((e) => (
                  <div key={e.ano} className="cartao p-4 sm:p-5">
                    <h3 className="display text-2xl font-extrabold">{e.ano}</h3>
                    <ul className="mt-2 divide-y divide-line">
                      {e.candidatos.map((c) => (
                        <li key={`${e.ano}-${c.pessoa}-${c.numero}`} className="flex items-center justify-between gap-3 py-2">
                          <span className="min-w-0">
                            <Candidato c={c} />
                            <span className="block text-sm text-ink-3">
                              <SiglaPartido sigla={c.partido} />
                              {c.numero ? ` · número ${c.numero}` : ""}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${CHIP[c.resultado ?? ""] ?? "bg-surface-2 text-ink-2"}`} title={c.situacao}>
                            {rotuloResultado(c.resultado, c.sexo)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Secao>

            <Secao
              id="quem-disputou"
              titulo="A vida pública de quem disputou"
              subtitulo="Toque em um nome para ver todas as eleições que a pessoa disputou, para qualquer cargo, os bens declarados e o dinheiro das campanhas."
            >
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pessoas.map((x) => (
                  <li key={x.id}>
                    <Link href={hrefPessoa(x.id)} className="cartao flex items-center justify-between gap-3 p-3 hover:border-line-strong">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{x.nomeUrna}</span>
                        <span className="block text-sm text-ink-3">
                          Disputou para Presidente em {x.anos.join(", ")}
                          {x.perfil ? " · tem perfil no site" : ""}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Secao>

            <Secao
              id="atos"
              titulo="O que o Executivo enviou ao Congresso"
              subtitulo={
                <TextoComTermos
                  texto={`Medidas provisórias valem na hora, mas o Congresso precisa aprová-las em até 120 dias. Os projetos do Executivo só valem se o Congresso aprovar. Encontramos ${numero(totalAtos)} desses atos nos arquivos da Câmara.`}
                />
              }
            >
              {ultimosAnos.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                  <div className="cartao p-4 sm:p-5">
                    <h3 className="font-semibold">Medidas provisórias por ano</h3>
                    <p className="mb-3 text-sm text-ink-3">Últimos {ultimosAnos.length} anos, pela data em que chegaram à Câmara.</p>
                    <Barras
                      itens={[...ultimosAnos]
                        .reverse()
                        .map((a) => ({ rotulo: String(a.ano), valor: a.medidasProvisorias, detalhe: a.projetos ? `e ${a.projetos} projetos do Executivo` : undefined }))}
                      formato={(n) => numero(n)}
                    />
                  </div>
                  <div className="cartao p-4 sm:p-5">
                    <h3 className="font-semibold">Os mais recentes</h3>
                    <ul className="mt-2 divide-y divide-line">
                      {atosRecentes.map((a) => (
                        <li key={a.id} className="py-2.5">
                          <p className="text-sm text-ink-3">
                            {a.data ? data(a.data) : ""} · {a.origem === "medida-provisoria" ? "Medida provisória" : "Projeto do Executivo"}
                            {a.situacao ? ` · ${a.situacao}` : ""}
                          </p>
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                            {a.tipo} {a.numero}/{a.ano}
                            <span className="sr-only"> (abre em nova aba)</span>
                          </a>
                          <p className="line-clamp-2 text-sm text-ink-2">{a.ementa}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Secao>

            <Origem>
              <p>
                Candidaturas, resultados, bens e contas de campanha vêm dos arquivos de dados abertos do TSE. Medidas provisórias e projetos do Executivo vêm dos arquivos anuais de
                proposições da Câmara dos Deputados, onde esses atos começam a tramitar.
              </p>
              <p>
                Mostramos o resultado das eleições, não a lista de quem governou: quem assumiu por impeachment, renúncia ou morte do titular não aparece nesses arquivos. Atualizado
                em {data(p.atualizadoEm.slice(0, 10))}.
              </p>
              <p className="flex flex-wrap gap-x-4">
                {p.fontes.map((f) => (
                  <Fonte key={f.url} href={f.url}>
                    {f.nome}
                  </Fonte>
                ))}
              </p>
            </Origem>
          </>
        )}
      </Container>
    </>
  );
}
