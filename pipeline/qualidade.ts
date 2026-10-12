/**
 * Integrity checks run on the assembled snapshot before anything is written. If a blocking check
 * fails, the run stops and the previous snapshot stays online: a partial or broken collection must
 * never look like an update.
 */
import type { Meta, PoliticoDetalhe, VerificacaoQualidade, VotacaoDetalhe } from "../src/lib/types";

export interface EntradaQualidade {
  hoje: Date;
  detalhes: PoliticoDetalhe[];
  votacoes: VotacaoDetalhe[];
  fontes: Meta["fontes"];
  anterior?: Meta;
}

export function verificarQualidade(e: EntradaQualidade): VerificacaoQualidade[] {
  const out: VerificacaoQualidade[] = [];
  const add = (id: string, descricao: string, ok: boolean, bloqueia: boolean, detalhe?: string) => out.push({ id, descricao, ok, bloqueia, detalhe });
  const ativos = (casa: string) => e.detalhes.filter((d) => d.casa === casa && d.emExercicio).length;
  const amanha = new Date(e.hoje.getTime() + 86_400_000).toISOString().slice(0, 10);

  const fed = ativos("camara");
  add("deputados-federais", "A Câmara tem perto de 513 deputados em exercício", fed >= 480 && fed <= 530, true, `${fed} encontrados`);
  const sen = ativos("senado");
  add("senadores", "O Senado tem perto de 81 senadores em exercício", sen >= 75 && sen <= 85, true, `${sen} encontrados`);

  const ids = new Set<string>();
  const repetidos = e.detalhes.filter((d) => ids.size === ids.add(d.id).size).map((d) => d.id);
  add("ids-unicos", "Cada pessoa aparece uma única vez", !repetidos.length, true, repetidos.length ? `repetidos: ${repetidos.slice(0, 5).join(", ")}` : undefined);

  const essenciais = e.fontes.filter((f) => ["camara", "senado"].includes(f.id) && f.status === "falhou");
  add("fontes-essenciais", "Câmara e Senado responderam", !essenciais.length, true, essenciais.map((f) => `${f.nome}: ${f.erro ?? "falhou"}`).join("; ") || undefined);

  const antes = e.anterior?.totais?.votacoes;
  const agora = e.votacoes.length;
  add(
    "votacoes-sem-queda",
    "O número de votações não caiu de repente em relação à última atualização",
    !antes || agora >= antes * 0.7,
    true,
    antes ? `${agora} agora, ${antes} antes` : "primeira atualização",
  );

  const futuras = e.votacoes.filter((v) => v.data > amanha).length;
  add("datas-validas", "Nenhuma votação tem data no futuro", !futuras, true, futuras ? `${futuras} votações com data futura` : undefined);

  const foraDaFaixa = e.detalhes.filter((d) => [d.m.presenca, d.m.participacao, d.m.fidelidade, d.m.governismo].some((x) => x != null && (x < 0 || x > 1))).length;
  add("porcentagens-validas", "Toda porcentagem está entre 0% e 100%", !foraDaFaixa, true, foraDaFaixa ? `${foraDaFaixa} perfis com valor impossível` : undefined);

  const gastoNegativo = e.detalhes.filter((d) => (d.m.gasto12m ?? 0) < 0).length;
  add("gastos-validos", "Nenhum total de gastos é negativo", !gastoNegativo, true, gastoNegativo ? `${gastoNegativo} perfis` : undefined);

  const semVinculo = e.detalhes.filter((d) => d.casa !== "assembleia" && d.emExercicio && !d.eleicoes.length).length;
  add("vinculo-tse", "Quase todo parlamentar federal foi ligado ao seu registro no TSE", semVinculo <= (fed + sen) * 0.1, false, `${semVinculo} sem candidatura encontrada`);

  const parciais = e.fontes.filter((f) => f.status === "parcial" || f.status === "falhou").map((f) => f.nome);
  add("fontes-completas", "Todas as fontes responderam por completo", !parciais.length, false, parciais.length ? parciais.join(", ") : undefined);
  return out;
}

/** Throws with a readable summary when a blocking check failed. */
export function exigirQualidade(vs: VerificacaoQualidade[]) {
  const falhas = vs.filter((v) => v.bloqueia && !v.ok);
  if (falhas.length) throw new Error(`Publicação bloqueada pela verificação de qualidade: ${falhas.map((f) => `${f.descricao} (${f.detalhe ?? "falhou"})`).join("; ")}`);
}
