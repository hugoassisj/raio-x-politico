import { moedaCurta, pct } from "@/lib/format";

const ETAPAS = [
  { chave: "indicado", nome: "Indicado", explica: "O parlamentar escolheu para onde vai o dinheiro." },
  { chave: "empenhado", nome: "Reservado", explica: "O governo reservou o dinheiro no orçamento (empenho)." },
  { chave: "pago", nome: "Pago", explica: "O dinheiro saiu: a ordem bancária foi emitida." },
] as const;

/**
 * The three steps of an amendment as bars of the same scale, so it is clear how much of what was
 * indicated has actually been paid. Paying later is normal: it depends on the budget and on the
 * receiving government's plan.
 */
export function CicloEmenda({ ciclo, compacto = false }: { ciclo: { indicado: number; empenhado: number; pago: number }; compacto?: boolean }) {
  const max = Math.max(ciclo.indicado, ciclo.empenhado, ciclo.pago, 1);
  return (
    <dl className={compacto ? "space-y-1.5" : "space-y-3"}>
      {ETAPAS.map((e) => {
        const v = ciclo[e.chave];
        return (
          <div key={e.chave}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="font-semibold">
                {e.nome}
                {!compacto && <span className="ml-1.5 font-normal text-ink-3">{e.explica}</span>}
              </dt>
              <dd className="tnum shrink-0">
                <b>{moedaCurta(v)}</b>
                {e.chave !== "indicado" && ciclo.indicado > 0 && <span className="text-ink-3"> ({pct(v / ciclo.indicado)})</span>}
              </dd>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden>
              <div
                className="crescer-x h-2 rounded-full bg-accent"
                style={{ width: `${Math.max(0.5, (v / max) * 100)}%`, opacity: e.chave === "indicado" ? 0.45 : e.chave === "empenhado" ? 0.7 : 1 }}
              />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
