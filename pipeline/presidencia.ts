/**
 * The Presidency page data: every presidential election since 1994 with each candidate's whole
 * public life, and the acts the Executive sent to Congress. Only TSE and Câmara files are used, so
 * impeachments and substitutions (which are not in them) are never inferred.
 */
import { resultadoDe } from "../src/lib/carreira";
import type { CampanhaFinancas, EleicaoPresidencial, PessoaPresidencia, Presidencia } from "../src/lib/types";
import { eleicaoDe, juntarCandidaturas } from "./build";
import { nomeProprio } from "./lib/util";
import type { CandidatoTSE } from "./model";
import type { AtoExecutivo } from "./sources/camara";

/** How many acts are listed one by one; the per-year counts cover all of them */
const ATOS_LISTADOS = 300;

const ORDEM_RESULTADO: Record<string, number> = { eleito: 0, "segundo-turno": 1, "nao-eleito": 2, suplente: 3, "registro-negado": 4, "sem-resultado": 5 };

export function montarPresidencia(inp: {
  hoje: Date;
  candidaturas: CandidatoTSE[];
  donoPorCandidatura: Map<string, string>;
  historico: Map<string, CandidatoTSE[]>;
  contas?: Map<string, CampanhaFinancas>;
  /** Ids of people with a profile on the site */
  perfis: Set<string>;
  atos: AtoExecutivo[];
}): Presidencia {
  const porPessoa = new Map<string, CandidatoTSE[]>();
  for (const c of inp.candidaturas) {
    const pid = inp.donoPorCandidatura.get(`${c.ano}:${c.sq}`);
    if (pid) porPessoa.set(pid, [...(porPessoa.get(pid) ?? []), c]);
  }

  const pessoas: PessoaPresidencia[] = [...porPessoa].map(([pid, presidenciais]) => {
    const todas = juntarCandidaturas(presidenciais, inp.historico.get(pid) ?? []);
    const recente = [...presidenciais].sort((a, b) => b.ano - a.ano)[0];
    return {
      id: pid,
      nome: nomeProprio(recente.nome),
      nomeUrna: nomeProprio(recente.nomeUrna),
      perfil: inp.perfis.has(pid) ? pid : undefined,
      candidaturas: todas.map((c) => eleicaoDe(c, inp.contas)),
    };
  });
  pessoas.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR") || a.id.localeCompare(b.id));
  const urnaDe = new Map(pessoas.map((p) => [p.id, p.nomeUrna]));

  const porAno = new Map<number, CandidatoTSE[]>();
  for (const c of inp.candidaturas) porAno.set(c.ano, [...(porAno.get(c.ano) ?? []), c]);
  const eleicoes: EleicaoPresidencial[] = [...porAno]
    .sort(([a], [b]) => b - a)
    .map(([ano, cs]) => ({
      ano,
      candidatos: cs
        .map((c) => {
          const pessoa = inp.donoPorCandidatura.get(`${c.ano}:${c.sq}`) ?? "";
          return {
            pessoa,
            nomeUrna: urnaDe.get(pessoa) ?? nomeProprio(c.nomeUrna),
            partido: c.partido,
            numero: c.numero,
            resultado: resultadoDe(c.situacao),
            situacao: c.situacao,
            sexo: /^fem/i.test(c.genero ?? "") ? ("F" as const) : /^masc/i.test(c.genero ?? "") ? ("M" as const) : undefined,
          };
        })
        // Result first (as published), then alphabetical: no ranking is implied beyond the official result
        .sort(
          (a, b) =>
            (ORDEM_RESULTADO[a.resultado ?? "sem-resultado"] ?? 9) - (ORDEM_RESULTADO[b.resultado ?? "sem-resultado"] ?? 9) || a.nomeUrna.localeCompare(b.nomeUrna, "pt-BR"),
        ),
    }));

  const contagem = new Map<number, { ano: number; medidasProvisorias: number; projetos: number }>();
  for (const a of inp.atos) {
    const ano = Number((a.data ?? "").slice(0, 4)) || a.ano;
    if (!ano) continue;
    const x = contagem.get(ano) ?? { ano, medidasProvisorias: 0, projetos: 0 };
    if (a.origem === "medida-provisoria") x.medidasProvisorias++;
    else x.projetos++;
    contagem.set(ano, x);
  }

  return {
    atualizadoEm: inp.hoje.toISOString(),
    pessoas,
    eleicoes,
    atos: inp.atos.slice(0, ATOS_LISTADOS),
    atosPorAno: [...contagem.values()].sort((a, b) => a.ano - b.ano),
    fontes: [
      { nome: "TSE: candidaturas, bens e contas de campanha", url: "https://dadosabertos.tse.jus.br/dataset/?groups=candidatos" },
      { nome: "Câmara dos Deputados: proposições por ano (medidas provisórias e projetos do Executivo)", url: "https://dadosabertos.camara.leg.br/swagger/api.html#staticfile" },
    ],
  };
}
