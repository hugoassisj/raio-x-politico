import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import type { EtapaSimples } from "@/lib/linguagem";
import type { ExplicacaoIA, MateriaVotada } from "@/lib/types";
import { data } from "@/lib/format";
import { TextoComTermos } from "./Termos";
import { Fonte } from "./ui";

/**
 * "What is this about?" in plain words. Prefers the AI explanation (validated against the official
 * texts and labelled as such); falls back to the house's own explanation; always offers the
 * official text one tap away.
 */
export function ExplicacaoProjeto({ explicacao, materia, ementa }: { explicacao?: ExplicacaoIA; materia?: MateriaVotada; ementa: string }) {
  if (explicacao)
    return (
      <div>
        <p className="text-xl leading-relaxed sm:text-2xl sm:leading-snug">{explicacao.resumo}</p>
        {explicacao.mudancas.length > 0 && (
          <ul className="mt-4 space-y-2">
            {explicacao.mudancas.map((m) => (
              <li key={m} className="flex gap-2.5 text-lg">
                <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        )}
        {explicacao.quemAfeta && (
          <p className="mt-3 text-ink-2">
            <b className="text-ink">Quem é afetado:</b> {explicacao.quemAfeta}
          </p>
        )}
        <details className="group mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          <summary className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" aria-hidden />
            Explicação feita por IA a partir do texto oficial. Ver de onde saiu
          </summary>
          <div className="mt-3 space-y-2 text-ink-2">
            <p>
              Um modelo de linguagem ({explicacao.modelo}) reescreveu o texto oficial em palavras simples em {data(explicacao.geradoEm.slice(0, 10))}. Ele só pôde usar os textos
              abaixo, e a explicação foi descartada automaticamente se tivesse números que não estão neles. Os trechos oficiais que sustentam a explicação:
            </p>
            <ul className="space-y-1">
              {explicacao.trechos.map((t) => (
                <li key={t} className="border-l-2 border-accent pl-3 italic">
                  “{t}”
                </li>
              ))}
            </ul>
            <p>Na dúvida, vale o texto oficial.</p>
          </div>
        </details>
        <TextoOficial materia={materia} ementa={ementa} />
      </div>
    );
  const oficial = materia?.explicacao || materia?.ementaDetalhada;
  return (
    <div>
      <p className="text-xl leading-relaxed sm:text-2xl sm:leading-snug">
        <TextoComTermos texto={oficial ?? ementa} />
      </p>
      {oficial ? (
        <p className="mt-2 text-sm text-ink-3">
          {materia?.explicacao ? "Explicação oficial do Senado." : "Resumo detalhado oficial da Câmara."} Toque nas palavras sublinhadas para ver o que significam.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-3">Resumo oficial (ementa). Toque nas palavras sublinhadas para ver o que significam.</p>
      )}
      <TextoOficial materia={materia} ementa={ementa} />
    </div>
  );
}

function TextoOficial({ materia, ementa }: { materia?: MateriaVotada; ementa: string }) {
  return (
    <details className="mt-3 rounded-xl border border-line px-4 py-3 text-sm">
      <summary className="flex items-center gap-2 font-semibold text-ink-2">
        <BookOpen className="h-4 w-4" aria-hidden />
        Texto oficial
      </summary>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="text-ink-3">Ementa (resumo oficial)</dt>
          <dd>{materia?.ementa || ementa}</dd>
        </div>
        {materia?.ementaDetalhada && (
          <div>
            <dt className="text-ink-3">Ementa detalhada</dt>
            <dd>{materia.ementaDetalhada}</dd>
          </div>
        )}
        {materia?.explicacao && (
          <div>
            <dt className="text-ink-3">Explicação da ementa (Senado)</dt>
            <dd>{materia.explicacao}</dd>
          </div>
        )}
        {materia?.palavrasChave?.length ? (
          <div>
            <dt className="text-ink-3">Palavras-chave oficiais</dt>
            <dd>{materia.palavrasChave.join(", ")}</dd>
          </div>
        ) : null}
        {materia?.autores?.length ? (
          <div>
            <dt className="text-ink-3">Quem apresentou</dt>
            <dd>
              {materia.autores
                .slice(0, 3)
                .map((a) => a.nome)
                .join(", ")}
              {(materia.autoresTotal ?? 0) > 3 ? ` e mais ${materia.autoresTotal! - 3}` : ""}
              {materia.apresentacao ? `, em ${data(materia.apresentacao)}` : ""}
            </dd>
          </div>
        ) : null}
        {materia?.situacao && (
          <div>
            <dt className="text-ink-3">Situação hoje</dt>
            <dd>{materia.situacao}</dd>
          </div>
        )}
      </dl>
      {materia && (
        <p className="mt-3 flex flex-wrap gap-x-4">
          <Fonte href={materia.url}>Página oficial do projeto</Fonte>
          {materia.inteiroTeor && <Fonte href={materia.inteiroTeor}>Texto completo (PDF)</Fonte>}
        </p>
      )}
    </details>
  );
}

/** What this specific roll call decided, and what each vote meant. */
export function EtapaExplicada({ etapa, procedimento }: { etapa?: EtapaSimples; procedimento: string }) {
  if (!etapa)
    return procedimento ? (
      <p className="text-ink-2">
        <b className="text-ink">O que foi votado:</b> <TextoComTermos texto={procedimento} />
      </p>
    ) : null;
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">{etapa.titulo}</span>
        {etapa.tipo === "procedimento" && <span className="rounded-md bg-surface-3 px-2 py-0.5 text-xs font-bold text-ink-2">Sobre o andamento, não sobre o conteúdo</span>}
      </p>
      <p className="mt-1 text-ink-2">{etapa.texto}</p>
      {(etapa.sim || etapa.nao) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {etapa.sim && <p className="rounded-xl bg-sim-soft px-3 py-2 text-sm">{destacar(etapa.sim, "Sim", "text-sim")}</p>}
          {etapa.nao && <p className="rounded-xl bg-nao-soft px-3 py-2 text-sm">{destacar(etapa.nao, "Não", "text-nao")}</p>}
        </div>
      )}
      {procedimento && <p className="mt-2 text-xs text-ink-3">Texto oficial: {procedimento}</p>}
    </div>
  );
}

function destacar(frase: string, palavra: string, cor: string) {
  const i = frase.indexOf(palavra);
  if (i < 0) return frase;
  return (
    <>
      {frase.slice(0, i)}
      <b className={cor}>{palavra}</b>
      {frase.slice(i + palavra.length)}
    </>
  );
}
