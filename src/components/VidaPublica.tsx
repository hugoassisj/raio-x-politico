import Link from "next/link";
import { ArrowRight, Repeat2 } from "lucide-react";
import { documentoPublicavel, formatarCnpj } from "@/lib/cnpj";
import type { CSSProperties } from "react";
import { listaNatural, resumoEleicoes, rotuloResultado, trocasDePartido } from "@/lib/carreira";
import { moeda, moedaCurta, numero, pct } from "@/lib/format";
import type { CampanhaFinancas, EleicaoTSE, Mandato } from "@/lib/types";
import { Fonte } from "./ui";

const COR_RESULTADO: Record<NonNullable<EleicaoTSE["resultado"]>, string> = {
  eleito: "bg-sim-soft text-sim",
  "segundo-turno": "bg-accent-soft text-accent-ink",
  suplente: "bg-abst-soft text-abst",
  "nao-eleito": "bg-surface-3 text-ink-2",
  "registro-negado": "bg-nao-soft text-nao",
  "sem-resultado": "bg-surface-3 text-ink-2",
};

/** "Candidato a vereador em Maceió (AL)", gendered when the sex is known. */
export function fraseCandidatura(e: EleicaoTSE, sexo?: string) {
  const quem = sexo === "F" ? "Candidata" : sexo === "M" ? "Candidato" : "Candidatura";
  const cargo = e.cargo.toLowerCase();
  const onde = e.municipio ? `em ${e.municipio} (${e.uf})` : e.uf && e.uf !== "BR" ? `por ${e.uf}` : "";
  return `${quem} a ${cargo} ${onde}`.trim();
}

/** One-sentence summary of the whole electoral life. */
export function ResumoVida({ eleicoes, sexo }: { eleicoes: EleicaoTSE[]; sexo?: string }) {
  const r = resumoEleicoes(eleicoes);
  if (!r.disputadas) return null;
  const venceu = sexo === "F" ? "eleita" : "eleito";
  return (
    <p className="text-xl leading-relaxed sm:text-2xl sm:leading-snug">
      Disputou <b>{r.disputadas}</b> {r.disputadas === 1 ? "eleição" : "eleições"} desde {r.primeiroAno} e foi {venceu} em <b className="grifo">{r.vitorias}</b>.{" "}
      {r.partidos.length > 1 ? (
        <>
          Passou por {r.partidos.length} partidos: {listaNatural(r.partidos)}.
        </>
      ) : r.partidos.length === 1 ? (
        <>Sempre pelo mesmo partido: {r.partidos[0]}.</>
      ) : null}
    </p>
  );
}

/**
 * Every candidacy, newest first, with result, votes, assets declared and campaign money. Party
 * changes are marked between items so a change of side is never hidden in a table.
 */
export function LinhaDaVida({ eleicoes, sexo }: { eleicoes: EleicaoTSE[]; sexo?: string }) {
  const lista = [...eleicoes].sort((a, b) => b.ano - a.ano);
  const trocas = new Map(trocasDePartido(eleicoes).map((t) => [t.ano, t]));
  return (
    <ol className="relative space-y-3 border-l-2 border-line pl-6">
      {lista.map((e, i) => {
        const troca = trocas.get(e.ano);
        return (
          <li key={`${e.ano}-${e.cargo}-${i}`} className="surgir relative" style={{ "--i": i } as CSSProperties}>
            <span className={`absolute -left-[33px] top-5 h-4 w-4 rounded-full border-[3px] border-paper ${e.resultado === "eleito" ? "bg-sim" : "bg-line-strong"}`} aria-hidden />
            <div className="cartao p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="flex items-baseline gap-3">
                  <span className="figure text-2xl font-bold">{e.ano}</span>
                  <span className="font-semibold">{fraseCandidatura(e, sexo)}</span>
                </p>
                <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${COR_RESULTADO[e.resultado ?? "sem-resultado"]}`}>{rotuloResultado(e.resultado, sexo)}</span>
              </div>
              <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {e.partido && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">Partido</dt>
                    <dd className="font-semibold">{e.partido}</dd>
                  </div>
                )}
                {e.numero && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">Número</dt>
                    <dd className="tnum">{e.numero}</dd>
                  </div>
                )}
                {e.votos != null && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">Votos</dt>
                    <dd className="tnum font-semibold">{numero(e.votos)}</dd>
                  </div>
                )}
                {e.patrimonio != null && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">Bens declarados</dt>
                    <dd className="tnum font-semibold">{moedaCurta(e.patrimonio)}</dd>
                  </div>
                )}
                {e.campanha && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">Campanha arrecadou</dt>
                    <dd className="tnum font-semibold">{moedaCurta(e.campanha.receitas)}</dd>
                  </div>
                )}
              </dl>
              {e.url && (
                <p className="mt-2">
                  <Fonte href={e.url}>Ver a candidatura no TSE</Fonte>
                </p>
              )}
            </div>
            {troca && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-accent-ink">
                <Repeat2 className="h-4 w-4" aria-hidden />
                Mudou de partido: {troca.de} <ArrowRight className="h-3.5 w-3.5" aria-hidden /> {troca.para}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Assets declared at each election, as columns, with the caveats people need to read them. */
export function CurvaPatrimonio({ eleicoes }: { eleicoes: EleicaoTSE[] }) {
  const pontos = eleicoes
    .filter((e) => e.patrimonio != null)
    .reduce<{ ano: number; valor: number }[]>((acc, e) => (acc.some((x) => x.ano === e.ano) ? acc : [...acc, { ano: e.ano, valor: e.patrimonio! }]), [])
    .sort((a, b) => a.ano - b.ano);
  if (!pontos.length) return null;
  const max = Math.max(...pontos.map((p) => p.valor), 1);
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const variacao = primeiro.valor > 0 && pontos.length > 1 ? ultimo.valor / primeiro.valor - 1 : undefined;
  return (
    <figure>
      <div className="flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label={`Bens declarados por eleição: ${pontos.map((p) => `${p.ano}, ${moeda(p.valor)}`).join("; ")}`}>
        {pontos.map((p) => (
          <div key={p.ano} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="tnum text-xs font-semibold text-ink-2">{moedaCurta(p.valor)}</span>
            <div className="crescer-y w-full max-w-16 rounded-t-md bg-accent" style={{ height: `${Math.max(2, (p.valor / max) * 100)}%` }} />
            <span className="tnum text-xs text-ink-3">{p.ano}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 space-y-1.5 text-sm text-ink-2">
        {variacao != null && (
          <p>
            De {primeiro.ano} a {ultimo.ano}, o total declarado {variacao >= 0 ? "aumentou" : "diminuiu"} <b className="text-ink">{pct(Math.abs(variacao))}</b>.
          </p>
        )}
        <p>
          É o que a própria pessoa declarou ao TSE ao se candidatar, pelo valor de compra de cada bem, não pelo valor de hoje. Os valores não são corrigidos pela inflação. Uma
          variação, para mais ou para menos, não é sinal de nada por si só.
        </p>
      </figcaption>
    </figure>
  );
}

const COR_ORIGEM = ["bg-accent", "bg-accent/60", "bg-ink-2", "bg-ink-3", "bg-line-strong", "bg-surface-3"];

/** Where one campaign's money came from and who was paid. */
export function DinheiroCampanha({ c, sexo }: { c: CampanhaFinancas; sexo?: string }) {
  const parte = c.receitas > 0 ? c.dinheiroPublico / c.receitas : 0;
  const quem = sexo === "F" ? "a candidata" : sexo === "M" ? "o candidato" : "a candidatura";
  return (
    <div className="space-y-6">
      <div>
        <p className="text-lg">
          A campanha de {c.ano} arrecadou <b className="grifo">{moeda(c.receitas)}</b>
          {c.receitas > 0 && (
            <>
              . <b>{pct(parte)}</b> veio de dinheiro público (fundo eleitoral e fundo partidário)
            </>
          )}
          .
        </p>
        {c.receitas > 0 && (
          <>
            <div className="crescer-x mt-3 flex h-4 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              {c.porOrigem.map((o, i) => (
                <div key={o.origem} className={COR_ORIGEM[i] ?? "bg-surface-3"} style={{ width: `${(o.valor / c.receitas) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {c.porOrigem.map((o, i) => (
                <li key={o.origem} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 shrink-0 rounded-sm ${COR_ORIGEM[i] ?? "bg-surface-3"}`} aria-hidden />
                    {o.origem}
                  </span>
                  <span className="tnum shrink-0 font-semibold">{moedaCurta(o.valor)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="font-semibold">Quem mais deu dinheiro</h4>
          <p className="text-sm text-ink-3">Pessoas aparecem só pelo nome; empresas e partidos, com CNPJ.</p>
          <ol className="mt-2 divide-y divide-line">
            {c.doadores.map((d) => (
              <li key={`${d.nome}-${d.cnpj ?? ""}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0">
                  <NomeEmpresa nome={d.nome} cnpj={d.cnpj} />
                  <span className="block text-xs text-ink-3">{d.origem}</span>
                </span>
                <span className="tnum shrink-0 font-semibold">{moedaCurta(d.valor)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="font-semibold">Com quem {quem} mais gastou</h4>
          <p className="text-sm text-ink-3">Despesas contratadas: {moeda(c.despesas)} no total.</p>
          <ol className="mt-2 divide-y divide-line">
            {c.fornecedores.map((f) => (
              <li key={`${f.nome}-${f.cnpj ?? ""}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0">
                  <NomeEmpresa nome={f.nome} cnpj={f.cnpj} />
                  {f.cnpj && <span className="block text-xs text-ink-3 tnum">CNPJ {formatarCnpj(f.cnpj)}</span>}
                </span>
                <span className="tnum shrink-0 font-semibold">{moedaCurta(f.valor)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-sm">
        <Fonte href={c.fonte}>Prestação de contas oficial no TSE</Fonte>
      </p>
    </div>
  );
}

/** Mandates the house itself records (they may predate the TSE files we read). */
export function MandatosRegistrados({ carreira }: { carreira: Mandato[] }) {
  if (!carreira.length) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {[...carreira].reverse().map((c, i) => (
        <li key={i} className="flex flex-wrap justify-between gap-x-4">
          <span>
            <b>{c.cargo}</b> <span className="text-ink-3">{[c.municipio, c.uf, c.partido].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="tnum text-ink-3">
            {c.inicio}
            {c.fim ? `–${c.fim}` : "–atual"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Assets declared in each election, with the full list of the latest declaration a tap away. */
export function BensDeclarados({ eleicoes }: { eleicoes: EleicaoTSE[] }) {
  if (!eleicoes.some((e) => e.patrimonio != null)) return null;
  const ultima = [...eleicoes].filter((e) => e.bens?.length).sort((a, b) => b.ano - a.ano)[0];
  return (
    <div className="cartao p-5">
      <h3 className="mb-4 font-semibold">Bens declarados em cada eleição</h3>
      <CurvaPatrimonio eleicoes={eleicoes} />
      {!!ultima?.bens?.length && (
        <details className="mt-4 text-sm">
          <summary className="font-semibold text-accent-ink underline decoration-dotted underline-offset-4">Ver os bens declarados em {ultima.ano}</summary>
          <ul className="mt-2 divide-y divide-line">
            {ultima.bens.map((b, i) => (
              <li key={i} className="flex justify-between gap-4 py-1.5">
                <span className="min-w-0">
                  <span className="block">{b.tipo}</span>
                  <span className="block truncate text-ink-3">{b.descricao}</span>
                </span>
                <span className="tnum shrink-0">{moeda(b.valor)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Every campaign with filed accounts: the latest open, the others a tap away. */
export function Campanhas({ eleicoes, sexo }: { eleicoes: EleicaoTSE[]; sexo?: string }) {
  const campanhas = [...eleicoes].filter((e) => e.campanha).sort((a, b) => b.ano - a.ano);
  if (!campanhas.length) return null;
  return (
    <div className="space-y-6">
      <div className="cartao p-5 sm:p-6">
        <DinheiroCampanha c={campanhas[0].campanha!} sexo={sexo} />
      </div>
      {campanhas.slice(1).map((e) => (
        <details key={`${e.ano}-${e.cargo}`} className="cartao p-5">
          <summary className="flex flex-wrap items-center justify-between gap-2 font-semibold">
            <span>
              Campanha de {e.ano}: {e.cargo.toLowerCase()}
            </span>
            <span className="tnum text-ink-2">{moedaCurta(e.campanha!.receitas)}</span>
          </summary>
          <div className="mt-4">
            <DinheiroCampanha c={e.campanha!} sexo={sexo} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** A donor or supplier name; with a valid CNPJ it opens the company page. People are never linked. */
function NomeEmpresa({ nome, cnpj }: { nome: string; cnpj?: string }) {
  const c = documentoPublicavel(cnpj);
  const texto = <span className="block truncate capitalize">{nome.toLowerCase()}</span>;
  return c ? (
    <Link href={`/empresa/${c}`} className="hover:underline">
      {texto}
    </Link>
  ) : (
    texto
  );
}
