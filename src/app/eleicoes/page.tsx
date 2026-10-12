import type { Metadata } from "next";
import Link from "next/link";
import { FormFiltros, Seletor } from "@/components/Filtros";
import { Paginacao } from "@/components/Paginacao";
import { SiglaPartido } from "@/components/Partido";
import { Container, Origem, Vazio } from "@/components/ui";
import { ROTULO_RESULTADO, rotuloResultado } from "@/lib/carreira";
import { getCandidaturas } from "@/lib/data";
import { numero } from "@/lib/format";
import { lerPagina, paginar } from "@/lib/paginacao";
import { ESTADOS, nomeUf } from "@/lib/ufs";
import type { CandidaturaIndice } from "@/lib/types";

export const metadata: Metadata = {
  title: "Eleições",
  description: "Escolha uma eleição e veja quem das pessoas acompanhadas disputou, por qual partido naquela eleição e com qual resultado, pelos arquivos do TSE.",
};

const POR_PAGINA = 50;
const t = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ORDEM: NonNullable<CandidaturaIndice["resultado"]>[] = ["eleito", "segundo-turno", "suplente", "nao-eleito", "registro-negado", "sem-resultado"];

export default async function Eleicoes({ searchParams }: PageProps<"/eleicoes">) {
  const sp = await searchParams;
  const todas = await getCandidaturas();
  const anos = [...new Set(todas.map((c) => c.ano))].sort((a, b) => b - a);
  const ano = anos.includes(Number(t(sp.ano))) ? Number(t(sp.ano)) : (anos[0] ?? 0);
  const doAno = todas.filter((c) => c.ano === ano);
  const cargos = [...new Set(doAno.map((c) => c.cargo))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const cargo = cargos.includes(t(sp.cargo)) ? t(sp.cargo) : "";
  const uf = ESTADOS.some((e) => e.uf === t(sp.uf)) ? t(sp.uf) : "";
  const resultado = ORDEM.includes(t(sp.resultado) as (typeof ORDEM)[number]) ? t(sp.resultado) : "";
  const q = norm(t(sp.q).trim().slice(0, 60));
  const lista = doAno
    .filter((c) => (!cargo || c.cargo === cargo) && (!uf || c.uf === uf) && (!q || norm(c.nome).includes(q)))
    .sort(
      (a, b) =>
        ORDEM.indexOf(a.resultado ?? "sem-resultado") - ORDEM.indexOf(b.resultado ?? "sem-resultado") || a.nome.localeCompare(b.nome, "pt-BR") || a.href.localeCompare(b.href),
    );
  const porResultado = ORDEM.map((r) => ({ r, n: lista.filter((c) => (c.resultado ?? "sem-resultado") === r).length })).filter((x) => x.n > 0);
  const filtrada = resultado ? lista.filter((c) => (c.resultado ?? "sem-resultado") === resultado) : lista;
  const pg = paginar(filtrada, lerPagina(t(sp.pagina)), POR_PAGINA);
  const url = (mudar: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ano: String(ano), cargo, uf, resultado, q: t(sp.q), pagina: "", ...mudar })) if (v) u.set(k, v);
    return `/eleicoes?${u}`;
  };

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Eleições</h1>
      <p className="mt-3 max-w-3xl text-lg text-ink-2">
        Escolha uma eleição e veja quem disputou, por qual partido <b>naquela eleição</b> e com qual resultado. O partido mostrado é o da candidatura, não o de hoje.
      </p>
      <p className="mt-2 max-w-3xl text-ink-3">
        Mostramos as candidaturas das pessoas acompanhadas pelo site (parlamentares em exercício) e de quem disputou a Presidência, não a lista completa de cada eleição.
      </p>

      {!todas.length ? (
        <div className="mt-8">
          <Vazio>As candidaturas chegam na próxima coleta completa dos arquivos do TSE.</Vazio>
        </div>
      ) : (
        <>
          <nav aria-label="Ano da eleição" className="mt-6 flex flex-wrap gap-2">
            {anos.map((a) => (
              <Link key={a} href={url({ ano: String(a), cargo: "", resultado: "" })} className="chip" aria-current={a === ano ? "page" : undefined}>
                {a}
              </Link>
            ))}
          </nav>

          <div className="mt-4">
            <FormFiltros acao="/eleicoes">
              <input type="hidden" name="ano" value={ano} />
              <Seletor nome="cargo" rotulo="Cargo" valor={cargo} opcoes={[["", "Todos os cargos"], ...cargos.map((c) => [c, c] as [string, string])]} />
              <Seletor nome="uf" rotulo="Estado" valor={uf} opcoes={[["", "Todos"], ...ESTADOS.map((e) => [e.uf, e.nome] as [string, string])]} />
              <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm">
                <span className="text-ink-3">Nome</span>
                <input name="q" defaultValue={t(sp.q)} className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink outline-none focus:border-accent" />
              </label>
            </FormFiltros>
          </div>

          <div role="group" aria-label="Resultado" className="mt-5 flex flex-wrap gap-2">
            <Link href={url({ resultado: "" })} className="chip" aria-current={!resultado ? "page" : undefined}>
              Todos <span className="tnum font-normal">{lista.length}</span>
            </Link>
            {porResultado.map(({ r, n }) => (
              <Link key={r} href={url({ resultado: r })} className="chip" aria-current={resultado === r ? "page" : undefined}>
                {ROTULO_RESULTADO[r]} <span className="tnum font-normal">{n}</span>
              </Link>
            ))}
          </div>

          <p className="mt-4 text-ink-2" aria-live="polite">
            Eleição de {ano}
            {cargo ? `, ${cargo.toLowerCase()}` : ""}
            {uf ? `, ${nomeUf(uf)}` : ""}: {numero(filtrada.length)} {filtrada.length === 1 ? "candidatura" : "candidaturas"}.
          </p>

          {filtrada.length === 0 ? (
            <div className="mt-3">
              <Vazio>Nenhuma candidatura com esses filtros.</Vazio>
            </div>
          ) : (
            <div className="tabela-caixa mt-3" tabIndex={0} role="region" aria-label="Tabela; use as setas para rolar">
              <table className="tabela">
                <caption className="sr-only">Candidaturas da eleição de {ano}</caption>
                <thead>
                  <tr>
                    <th scope="col">Pessoa</th>
                    <th scope="col">Cargo disputado</th>
                    <th scope="col">Partido em {ano}</th>
                    <th scope="col">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {pg.itens.map((c, i) => (
                    <tr key={`${c.href}-${c.cargo}-${i}`}>
                      <td>
                        <Link href={c.href} className="font-semibold hover:underline">
                          {c.nome}
                        </Link>
                      </td>
                      <td>
                        {c.cargo}
                        <span className="block text-xs text-ink-3">{c.municipio ? `${c.municipio} (${c.uf})` : c.uf === "BR" ? "Brasil" : nomeUf(c.uf)}</span>
                      </td>
                      <td>
                        <SiglaPartido sigla={c.partido} />
                      </td>
                      <td>{rotuloResultado(c.resultado, c.sexo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6">
            <Paginacao pagina={pg.pagina} paginas={pg.paginas} href={(p) => url({ pagina: p > 1 ? String(p) : "" })} rotulo="Páginas de candidaturas" />
          </div>
        </>
      )}

      <Origem>
        <p>Arquivos de candidaturas do TSE (consulta_cand) de cada eleição desde 1994. O resultado é o publicado pelo TSE para o último turno da candidatura.</p>
        <p>Para saber que duas candidaturas são da mesma pessoa, seguimos o título de eleitor; na dúvida, a candidatura fica de fora.</p>
      </Origem>
    </Container>
  );
}
