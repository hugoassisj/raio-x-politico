import { SeloNatureza } from "./Natureza";
import type { Casa } from "@/lib/types";
import { METRICAS, NOME_PARES, parcela, percentil, type ChaveMetrica, type DefMetrica } from "@/lib/metricas";
import { IconeTema } from "./Icone";
import { ComoSabemosMetrica } from "./ComoSabemos";

type Dist = { min: number; max: number; mediana: number; p10: number; p90: number; n: number; valores: number[] };

const LOG: ChaveMetrica[] = ["patrimonio", "emendas", "votosRecebidos"];

/** Position of one value inside its peers: range, middle 80% band, median tick and the person's dot. */
function Faixa({ valor, dist, chave, rotulo }: { valor: number; dist: Dist; chave: ChaveMetrica; rotulo: string }) {
  const log = LOG.includes(chave) && dist.min > 0;
  const f = (x: number) => (log ? Math.log10(Math.max(x, 1)) : x);
  const lo = f(dist.min);
  const hi = f(dist.max);
  const x = (v: number) => (hi === lo ? 50 : ((f(v) - lo) / (hi - lo)) * 100);
  return (
    <div role="img" aria-label={rotulo} className="relative mx-1.5 mt-4 h-5">
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line" />
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full border border-line bg-surface-2"
        style={{ left: `${x(dist.p10)}%`, width: `${Math.max(1, x(dist.p90) - x(dist.p10))}%` }}
      />
      <div className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-ink-3" style={{ left: `${x(dist.mediana)}%` }} />
      <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink" style={{ left: `${x(valor)}%` }} />
    </div>
  );
}

export function TileMetrica({
  def,
  valor,
  casa,
  dist,
  nota,
  destaque,
  coletadoEm,
}: {
  def: DefMetrica;
  valor: number | undefined;
  casa: Casa;
  dist?: Dist;
  nota?: string;
  destaque?: boolean;
  /** When the data was collected, shown in the evidence card */
  coletadoEm?: string;
}) {
  const p = percentil(valor, dist?.valores ?? []);
  const pares = NOME_PARES[casa];
  const extremo =
    valor != null && dist && dist.n >= 5
      ? valor >= dist.max
        ? `Ninguém entre os ${pares.replace(/^dos /, "")} tem valor maior`
        : valor <= dist.min
          ? `Ninguém entre os ${pares.replace(/^dos /, "")} tem valor menor`
          : undefined
      : undefined;
  return (
    <article className="flex flex-col cartao p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <IconeTema nome={def.icone} tamanho={16} />
        <div>
          <h3 className="font-semibold leading-tight">{def.titulo}</h3>
          <p className="text-sm text-ink-3">{def.pergunta}</p>
        </div>
        <SeloNatureza tipo="calculo" className="ml-auto self-start" />
      </div>
      {valor == null ? (
        <p className="mt-3 text-ink-3">{def.cobertura?.[casa]?.motivo ?? "Sem dados para esta pessoa nas fontes consultadas."}</p>
      ) : (
        <>
          <p className="figure mt-3 text-[2.4rem] font-bold">
            <span className={destaque ? "grifo" : undefined}>{def.formato(valor)}</span>
          </p>
          {nota && <p className="mt-1 text-sm text-ink-3">{nota}</p>}
          {dist && dist.n >= 5 && (
            <>
              <Faixa
                valor={valor}
                dist={dist}
                chave={def.chave}
                rotulo={`${def.formato(valor)}; mediana ${def.formato(dist.mediana)}; de ${def.formato(dist.min)} a ${def.formato(dist.max)}`}
              />
              <div className="flex justify-between text-[11px] text-ink-3 tnum">
                <span>{def.formato(dist.min)}</span>
                <span>mediana {def.formato(dist.mediana)}</span>
                <span>{def.formato(dist.max)}</span>
              </div>
            </>
          )}
          {p != null && <p className="mt-2 text-sm text-ink-2">{extremo ?? def.comparacao(parcela(p), pares)}.</p>}
        </>
      )}
      <ComoSabemosMetrica def={def} casa={casa} coletadoEm={coletadoEm} />
    </article>
  );
}

/** Tiles shown on a profile. "Became law" is folded into the bills tile as a note. */
export function metricasDaCasa(casa: Casa) {
  return METRICAS.filter((d) => d.casas.includes(casa) && d.chave !== "proposicoesLei");
}

/**
 * The four answers most people want first, each in one plain sentence with what is typical among
 * colleagues. Details and methodology live in the tiles below.
 */
export function CartoesResumo({ itens }: { itens: { def: DefMetrica; valor: number | undefined; frase: string; tipico?: string }[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map(({ def, valor, frase, tipico }) => (
        <li key={def.chave} className="flex flex-col cartao p-5">
          <div className="flex items-center gap-3">
            <IconeTema nome={def.icone} tamanho={18} />
            <h3 className="font-semibold leading-tight text-ink-2">{def.pergunta}</h3>
          </div>
          <p className="figure mt-4 text-[2.6rem] font-bold">{def.formato(valor)}</p>
          <p className="mt-2 text-ink">{frase}</p>
          {tipico && <p className="mt-auto pt-3 text-sm text-ink-3">{tipico}</p>}
        </li>
      ))}
    </ul>
  );
}
