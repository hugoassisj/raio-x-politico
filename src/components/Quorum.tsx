import { CircleCheck, CircleX, Info } from "lucide-react";
import { avaliarQuorum, descricaoExigencia, type Regra } from "@/lib/quorum";
import type { Casa } from "@/lib/types";
import { numero } from "@/lib/format";
import { Fonte } from "./ui";

/**
 * Explains the approval rule of a vote and draws the count against the threshold.
 * The outcome shown is always the official one; the bar only illustrates the rule.
 */
export function QuorumExplicado({ regra, casa, sim, nao, outros, resultado }: { regra: Regra; casa: Casa; sim: number; nao: number; outros: number; resultado?: string }) {
  const q = avaliarQuorum(regra, casa, sim, nao, outros);
  if (!q) return null;
  const membros = q.membros;
  const pctDe = (n: number) => `${Math.min(100, (n / membros) * 100)}%`;
  const casaNome = casa === "camara" ? "deputados" : "senadores";
  const aprovado = resultado ? resultado === "Aprovada" : q.atingiu;

  return (
    <div className="cartao p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mark text-mark-ink" aria-hidden>
          <Info size={20} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Quantos votos precisava?</h2>
          <p className="mt-1 text-ink-2">
            {regra.nome}: {regra.oQueE}
          </p>
          <p className="mt-2 text-lg">
            Para ser aprovada, precisa de <b>{descricaoExigencia(regra.exigencia)}</b>
            {q.medida === "sim" ? (
              <>
                , ou seja, <b className="grifo">{numero(q.necessario)} votos Sim</b> de {numero(membros)} {casaNome}
              </>
            ) : (
              <>
                {" "}
                (pelo menos <b>{numero(q.necessario)}</b> de {numero(membros)} {casaNome} presentes)
              </>
            )}
            {regra.turnos > 1 ? `, em ${regra.turnos} votações (turnos) em cada casa` : ""}.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div
          className="relative h-9 overflow-hidden rounded-lg bg-surface-2"
          role="img"
          aria-label={`${sim} votos Sim, ${nao} Não e ${outros} outros de ${membros} ${casaNome}; precisava de ${q.necessario}`}
        >
          <div className="absolute inset-y-0 left-0 bg-sim" style={{ width: pctDe(sim) }} />
          {q.medida === "presenca" && (
            <>
              <div className="absolute inset-y-0 bg-nao" style={{ left: pctDe(sim), width: pctDe(nao) }} />
              <div className="absolute inset-y-0 bg-abst" style={{ left: pctDe(sim + nao), width: pctDe(outros) }} />
            </>
          )}
          <div className="absolute inset-y-[-4px] w-[3px] bg-ink" style={{ left: pctDe(q.necessario) }} />
        </div>
        <div className="relative mt-1 h-10 text-sm">
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-center font-semibold" style={{ left: pctDe(q.necessario) }}>
            ↑ {numero(q.necessario)}
            <span className="block text-xs font-normal text-ink-3">{q.medida === "sim" ? "votos Sim necessários" : "presentes necessários"}</span>
          </span>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 text-sm tnum">
          <span>
            <b className="text-sim">Sim</b> {numero(sim)}
          </span>
          <span>
            <b className="text-nao">Não</b> {numero(nao)}
          </span>
          {outros > 0 && (
            <span>
              <b className="text-abst">Outros</b> {numero(outros)}
            </span>
          )}
          <span className="text-ink-3">
            de {numero(membros)} {casaNome}
          </span>
        </p>
      </div>

      <p className={`mt-5 flex items-center gap-2 text-lg font-bold ${aprovado ? "text-sim" : "text-nao"}`}>
        {aprovado ? <CircleCheck size={22} aria-hidden /> : <CircleX size={22} aria-hidden />}
        {resultado ?? (q.atingiu ? "Atingiu o necessário" : "Não atingiu o necessário")}
        {resultado && <span className="text-sm font-normal text-ink-3">(resultado oficial)</span>}
      </p>
      <p className="mt-3 text-sm text-ink-3">
        Regra: <Fonte href={regra.url}>{regra.artigo}</Fonte>. Algumas votações decidem só uma parte do texto (um destaque ou um pedido); a regra é a do tipo de proposta e o
        resultado é sempre o publicado pela casa.
      </p>
    </div>
  );
}
