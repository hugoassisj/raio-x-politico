import type { Cadeira, ItemLegenda } from "./plenario";
import { rotuloVoto } from "./linguagem";
import type { PoliticoResumo, VotacaoDetalhe } from "./types";
import { COR_SEM_DADO, FAIXAS_GOVERNO, faixaGoverno, nomePartido, ordenarParaPlenario, type ResumoPartido } from "./partidos";

const canon = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** One seat per member, grouped by party and colored by how much the party votes with the government. */
export function cadeirasPorPartido(membros: PoliticoResumo[], partidos: ResumoPartido[], destacar?: string): { cadeiras: Cadeira[]; legenda: ItemLegenda[] } {
  const pos = new Map(partidos.map((p) => [p.sigla, p.governismo]));
  const cadeiras = ordenarParaPlenario(membros, partidos).map((m) => {
    const f = faixaGoverno(pos.get(m.partido));
    return {
      id: m.id,
      nome: m.nome,
      partido: m.partido,
      uf: m.uf,
      foto: m.foto,
      cor: f?.cor ?? COR_SEM_DADO,
      detalhe: nomePartido(m.partido),
      href: `/politico/${m.id}`,
      esmaecido: destacar ? m.partido !== destacar : false,
    };
  });
  const legenda = [...FAIXAS_GOVERNO]
    .reverse()
    .map((f) => ({ cor: f.cor, rotulo: f.rotulo, n: cadeiras.filter((c) => c.cor === f.cor).length }))
    .filter((l) => l.n > 0);
  const sem = cadeiras.filter((c) => c.cor === COR_SEM_DADO).length;
  if (sem) legenda.push({ cor: COR_SEM_DADO, rotulo: "Sem dados suficientes", n: sem });
  return { cadeiras, legenda };
}

const GRUPOS = [
  { id: "sim", rotulo: "Sim", cor: "var(--sim)" },
  { id: "nao", rotulo: "Não", cor: "var(--nao)" },
  { id: "outros", rotulo: "Abstenção ou obstrução", cor: "var(--abst)" },
  { id: "ausente", rotulo: "Não votou", cor: "var(--ausente)" },
] as const;

const GRUPOS_SECRETA = [
  { id: "sim", rotulo: "Participou (voto secreto)", cor: "var(--ink-2)" },
  { id: "ausente", rotulo: "Não votou", cor: "var(--ausente)" },
] as const;

function grupoDoVoto(voto: string, secreta?: boolean) {
  const v = canon(voto);
  if (secreta) return v && v !== "ausente" ? "sim" : "ausente";
  if (v === "sim") return "sim";
  if (v === "nao") return "nao";
  if (!v || v === "ausente") return "ausente";
  return "outros";
}

/**
 * One seat per member colored by their vote. Members of the house who did not register a vote fill
 * the remaining seats, so the chart always shows the whole room.
 */
export function cadeirasPorVoto(v: VotacaoDetalhe, membrosDaCasa: PoliticoResumo[]): { cadeiras: Cadeira[]; legenda: ItemLegenda[] } {
  const conhecidos = new Map(membrosDaCasa.map((m) => [m.id, m]));
  const votaram = new Set(v.votos.map((x) => x.pid));
  const linhas = [
    ...v.votos.map((x) => ({ id: x.pid, nome: x.nome, partido: x.partido, uf: x.uf, voto: x.voto })),
    ...membrosDaCasa.filter((m) => m.emExercicio && !votaram.has(m.id)).map((m) => ({ id: m.id, nome: m.nome, partido: m.partido, uf: m.uf, voto: "" })),
  ];
  const grupos: readonly { id: string; rotulo: string; cor: string }[] = v.secreta ? GRUPOS_SECRETA : GRUPOS;
  const ordemGrupo = new Map(grupos.map((g, i) => [g.id, i]));
  linhas.sort(
    (a, b) =>
      ordemGrupo.get(grupoDoVoto(a.voto, v.secreta))! - ordemGrupo.get(grupoDoVoto(b.voto, v.secreta))! ||
      a.partido.localeCompare(b.partido) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
  const cadeiras: Cadeira[] = linhas.map((l) => {
    const g = grupos.find((x) => x.id === grupoDoVoto(l.voto, v.secreta))!;
    return {
      id: l.id,
      nome: conhecidos.get(l.id)?.nome ?? l.nome,
      partido: l.partido,
      uf: l.uf,
      foto: conhecidos.get(l.id)?.foto,
      cor: g.cor,
      detalhe: !l.voto ? "não registrou voto" : v.secreta ? "participou; o voto é secreto" : votoLegivel(l.voto),
      href: conhecidos.has(l.id) ? `/politico/${l.id}` : undefined,
    };
  });
  const legenda = grupos.map((g) => ({ cor: g.cor, rotulo: g.rotulo, n: linhas.filter((l) => grupoDoVoto(l.voto, v.secreta) === g.id).length })).filter((l) => l.n > 0);
  return { cadeiras, legenda };
}

/** "votou Sim", or the plain meaning of a house code such as "Artigo 17" */
function votoLegivel(voto: string) {
  const r = rotuloVoto(voto);
  return r.tipo === "sim" || r.tipo === "nao" ? `votou ${r.rotulo}` : r.rotulo.toLowerCase();
}
