import type { Metadata } from "next";
import { VAZIO } from "@/lib/format";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { cargoDe } from "@/components/Listas";
import { SeletorComparar } from "@/components/SeletorComparar";
import { Container, Origem } from "@/components/ui";
import { getPolitico } from "@/lib/data";
import { METRICAS } from "@/lib/metricas";
import type { PoliticoDetalhe } from "@/lib/types";

const PERCENTUAIS = ["presenca", "participacao", "fidelidade", "governismo"];

export const metadata: Metadata = {
  title: "Comparar políticos",
  description: "Compare lado a lado presença, votos, gastos, projetos e patrimônio de até quatro políticos.",
};

export default async function Comparar({ searchParams }: PageProps<"/comparar">) {
  const raw = (await searchParams).ids;
  const ids = [
    ...new Set(
      (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[\w-]+$/.test(s)),
    ),
  ].slice(0, 4);
  const pessoas = (await Promise.all(ids.map((id) => getPolitico(id)))).filter((p): p is PoliticoDetalhe => !!p);
  const linhas = METRICAS.filter((m) => pessoas.some((p) => p.m[m.chave] != null));
  const semEsta = (id: string) => `/comparar?ids=${pessoas.filter((p) => p.id !== id).map((p) => p.id).join(",")}`;

  // Votes in common: same roll call, different choices
  const comuns =
    pessoas.length >= 2
      ? pessoas[0].votos
          .filter((v) => pessoas.slice(1).every((p) => p.votos.some((x) => x.votacaoId === v.votacaoId)))
          .map((v) => ({ v, votos: pessoas.map((p) => p.votos.find((x) => x.votacaoId === v.votacaoId)!.voto) }))
      : [];
  const divergentes = comuns.filter((c) => new Set(c.votos.filter((x) => /^(sim|não)$/i.test(x))).size > 1);

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Comparar</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">Coloque até quatro pessoas lado a lado. Os números são os mesmos dos perfis, com as mesmas regras de cálculo.</p>
      <div className="mt-6">
        <SeletorComparar ids={pessoas.map((p) => p.id)} />
      </div>

      {pessoas.length === 0 ? (
        <p className="mt-8 rounded-lg bg-surface-2 px-4 py-5 text-ink-2">Comece adicionando alguém pelo nome. Dica: no perfil de qualquer político há um botão &ldquo;Comparar com outro&rdquo;.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="w-48 px-4 py-4" />
                {pessoas.map((p) => (
                  <th key={p.id} className="px-4 py-4 text-left align-top font-normal">
                    <div className="flex items-start gap-3">
                      <Avatar src={p.foto} nome={p.nome} size={48} />
                      <div className="min-w-0">
                        <Link href={`/politico/${p.id}`} className="block font-semibold hover:underline">
                          {p.nome}
                        </Link>
                        <span className="block text-ink-3">
                          {cargoDe(p)} · {p.partido}-{p.uf}
                        </span>
                        <Link href={semEsta(p.id)} className="mt-1 inline-block text-xs text-ink-3 underline">
                          Remover
                        </Link>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {linhas.map((m) => {
                const vals = pessoas.map((p) => p.m[m.chave]);
                // shares are drawn on a fixed 0-100% scale; amounts relative to the largest in the row
                const max = PERCENTUAIS.includes(m.chave) ? 1 : Math.max(...vals.map((v) => v ?? 0), 1e-9);
                return (
                  <tr key={m.chave}>
                    <th scope="row" className="px-4 py-3 text-left font-normal text-ink-2">
                      {m.titulo}
                    </th>
                    {vals.map((v, i) => (
                      <td key={pessoas[i].id} className="px-4 py-3">
                        <span className="figure block text-lg font-semibold">{m.formato(v)}</span>
                        {v != null && (
                          <span className="mt-1 block h-1.5 rounded-full bg-surface-2">
                            <span className="block h-1.5 rounded-full bg-ink-2" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-normal text-ink-2">
                  Mandatos desde
                </th>
                {pessoas.map((p) => (
                  <td key={p.id} className="figure px-4 py-3 text-lg font-semibold">
                    {p.inicioPolitica ?? VAZIO}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {pessoas.length >= 2 && (
        <section className="mt-10">
          <h2 className="display text-2xl font-bold">Onde votaram diferente</h2>
          <p className="mt-1 text-ink-2">
            {comuns.length} votações nominais em comum. Em {divergentes.length} delas, uma parte votou Sim e outra votou Não.
          </p>
          {divergentes.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[640px] text-sm">
                <tbody className="divide-y divide-line">
                  {divergentes.slice(0, 30).map((c) => (
                    <tr key={c.v.votacaoId}>
                      <td className="w-1/2 px-4 py-3">
                        <Link href={`/votacao/${c.v.votacaoId}`} className="font-semibold hover:underline">
                          {c.v.titulo}
                        </Link>
                        <span className="block line-clamp-1 text-ink-3">{c.v.descricao}</span>
                      </td>
                      {c.votos.map((v, i) => (
                        <td key={i} className="px-4 py-3 font-semibold">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Origem titulo="Como comparar com justiça">
        <p>Compare pessoas da mesma casa: Câmara, Senado e assembleias têm regras, cotas e calendários diferentes.</p>
        <p>Gastos devem ser comparados entre pessoas do mesmo estado, porque o teto da cota varia conforme a distância até Brasília.</p>
      </Origem>
    </Container>
  );
}
