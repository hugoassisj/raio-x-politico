import type { Cadeira, ItemLegenda } from "./plenario";
import { CATEGORIAS_VOTO, rotuloVoto } from "./linguagem";
import { COR_CATEGORIA, ORDEM_CATEGORIAS, contar, linhasDaVotacao, type LinhaVoto } from "./votos";
import type { PoliticoResumo, VotacaoDetalhe } from "./types";
import { COR_SEM_DADO, FAIXAS_GOVERNO, faixaGoverno, nomePartido, ordenarParaPlenario, type ResumoPartido } from "./partidos";

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

/**
 * One seat per member colored by their vote group. Members of the house in office today who are
 * missing from the official list fill the remaining seats, so the chart always shows the whole room.
 * Groups are the same as in the list of votes (`votos.ts`), so a filter means the same in both.
 */
export function cadeirasPorVoto(v: VotacaoDetalhe, membrosDaCasa: PoliticoResumo[]): { cadeiras: Cadeira[]; legenda: ItemLegenda[] } {
  return cadeirasDasLinhas(linhasDaVotacao(v, membrosDaCasa), v.secreta);
}

/** Seats from an already built list of votes; `aceso` dims the seats left out by a filter. */
export function cadeirasDasLinhas(todas: LinhaVoto[], secreta?: boolean, aceso?: (l: LinhaVoto) => boolean): { cadeiras: Cadeira[]; legenda: ItemLegenda[] } {
  const pos = new Map(ORDEM_CATEGORIAS.map((c, i) => [c, i]));
  const linhas = [...todas].sort(
    (a, b) => pos.get(a.categoria)! - pos.get(b.categoria)! || a.partido.localeCompare(b.partido) || a.nome.localeCompare(b.nome, "pt-BR") || a.pid.localeCompare(b.pid),
  );
  const cadeiras: Cadeira[] = linhas.map((l) => ({
    id: l.pid,
    nome: l.nome,
    partido: l.partido,
    uf: l.uf,
    foto: l.foto,
    cor: COR_CATEGORIA[l.categoria],
    detalhe: secreta && l.categoria === "outro" ? "participou; o voto é secreto" : votoLegivel(l.original),
    href: l.perfil ? `/politico/${l.pid}` : undefined,
    esmaecido: aceso ? !aceso(l) : false,
  }));
  const n = contar(linhas);
  const legenda = CATEGORIAS_VOTO.filter((c) => n[c.id] > 0).map((c) => ({
    id: c.id,
    cor: COR_CATEGORIA[c.id],
    rotulo: secreta && c.id === "outro" ? "Participou (voto secreto)" : c.rotulo,
    n: n[c.id],
  }));
  return { cadeiras, legenda };
}

/** "votou Sim", or the plain meaning of a house code such as "Artigo 17" */
function votoLegivel(voto: string) {
  const r = rotuloVoto(voto);
  return r.tipo === "sim" || r.tipo === "nao" ? `votou ${r.rotulo}` : r.rotulo.toLowerCase();
}
