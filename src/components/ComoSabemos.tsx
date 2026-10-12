import { CircleAlert, CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import type { ReactNode } from "react";
import { dataHora } from "@/lib/format";
import { ROTULO_COBERTURA, type DefMetrica } from "@/lib/metricas";
import type { CoberturaSecao, EstadoCobertura } from "@/lib/cobertura";
import type { Casa } from "@/lib/types";
import { Fonte } from "./ui";

/**
 * "Como sabemos disso?": the same evidence card for every number on the site. What it is, the
 * period, how it was calculated, what it does not tell, the official source and when the data
 * was collected. People who only want the number never have to open it; anyone who doubts it
 * finds everything in one place.
 */
export function ComoSabemos({
  oQueE,
  periodo,
  calculo,
  naoDiz,
  fontes,
  coletadoEm,
  cobertura,
  extra,
  resumo = "Como sabemos disso?",
}: {
  oQueE?: ReactNode;
  periodo?: ReactNode;
  calculo?: ReactNode;
  naoDiz?: ReactNode;
  fontes?: { nome: string; url: string }[];
  coletadoEm?: string;
  cobertura?: { estado: "disponivel" | "parcial" | "indisponivel"; motivo?: string };
  extra?: ReactNode;
  resumo?: string;
}) {
  return (
    <details className="group mt-auto pt-3 text-sm">
      <summary className="text-ink-3 underline decoration-dotted underline-offset-4 hover:text-ink">{resumo}</summary>
      <dl className="mt-3 space-y-2.5 rounded-xl bg-surface-2 p-3 text-ink-2">
        {cobertura && <Cobertura {...cobertura} />}
        {oQueE && <Item rotulo="O que é">{oQueE}</Item>}
        {periodo && <Item rotulo="Período">{periodo}</Item>}
        {calculo && <Item rotulo="Como calculamos">{calculo}</Item>}
        {naoDiz && <Item rotulo="O que isso não diz">{naoDiz}</Item>}
        {extra}
        {!!fontes?.length && (
          <Item rotulo="Fonte oficial">
            <span className="flex flex-wrap gap-x-3">
              {fontes.map((f) => (
                <Fonte key={f.url} href={f.url}>
                  {f.nome}
                </Fonte>
              ))}
            </span>
          </Item>
        )}
        {coletadoEm && <Item rotulo="Dados coletados em">{dataHora(coletadoEm)}</Item>}
      </dl>
    </details>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-ink-3">{rotulo}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

/** Whether the data behind a number is complete, partial or missing, said plainly. */
export function Cobertura({ estado, motivo }: { estado: EstadoCobertura; motivo?: string }) {
  const Icone = estado === "disponivel" ? CircleCheck : estado === "parcial" ? CircleDashed : estado === "nao-se-aplica" ? CircleMinus : CircleAlert;
  const cor = estado === "disponivel" ? "text-sim" : estado === "parcial" ? "text-alerta" : "text-ink-3";
  return (
    <p className={`flex items-start gap-1.5 text-sm ${cor}`}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <b>{ROTULO_COBERTURA[estado]}</b>
        {motivo ? <span className="text-ink-2">. {motivo}</span> : null}
      </span>
    </p>
  );
}

/** The evidence card of a metric definition, for a given house. */
export function ComoSabemosMetrica({ def, casa, coletadoEm }: { def: DefMetrica; casa: Casa; coletadoEm?: string }) {
  const cob = def.cobertura?.[casa];
  return (
    <ComoSabemos
      oQueE={def.explicacao}
      periodo={def.periodo}
      calculo={def.calculo}
      naoDiz={def.limites}
      fontes={def.fontes}
      coletadoEm={coletadoEm}
      cobertura={cob ? { estado: cob.estado, motivo: cob.motivo } : { estado: "disponivel" }}
    />
  );
}

/**
 * What the site has about this person, section by section. Every gap says why, so an empty
 * section is never mistaken for "zero".
 */
export function CoberturaPerfil({ itens }: { itens: CoberturaSecao[] }) {
  const cor: Record<EstadoCobertura, string> = { disponivel: "text-sim", parcial: "text-alerta", indisponivel: "text-ink-3", "nao-se-aplica": "text-ink-3" };
  const icone: Record<EstadoCobertura, typeof CircleCheck> = { disponivel: CircleCheck, parcial: CircleDashed, indisponivel: CircleAlert, "nao-se-aplica": CircleMinus };
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((c) => {
        const I = icone[c.estado];
        const corpo = (
          <>
            <I className={`mt-0.5 h-4 w-4 shrink-0 ${cor[c.estado]}`} aria-hidden />
            <span className="min-w-0">
              <span className="font-semibold">{c.titulo}</span>
              <span className={`ml-1.5 text-sm ${cor[c.estado]}`}>{ROTULO_COBERTURA[c.estado]}</span>
              {c.motivo && <span className="block text-sm text-ink-3">{c.motivo}</span>}
            </span>
          </>
        );
        return (
          <li key={c.titulo}>
            {c.estado === "disponivel" || c.estado === "parcial" ? (
              <a href={`#${c.id}`} className="flex items-start gap-2 rounded-lg p-2 hover:bg-surface-2">
                {corpo}
              </a>
            ) : (
              <div className="flex items-start gap-2 p-2">{corpo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
