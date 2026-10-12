/**
 * What the site has about one person, section by section, said out loud: complete, partial,
 * missing (and why), or not applicable. Missing data is never shown as zero.
 */
import { METRICAS } from "./metricas";
import type { PoliticoDetalhe } from "./types";

export type EstadoCobertura = "disponivel" | "parcial" | "indisponivel" | "nao-se-aplica";

export interface CoberturaSecao {
  id: string;
  titulo: string;
  estado: EstadoCobertura;
  motivo?: string;
}

/** First election year with campaign accounts in the files we read (see tse-contas.ts) */
const PRIMEIRO_ANO_CONTAS = 2018;

const motivoDaMetrica = (chave: string, casa: PoliticoDetalhe["casa"]) => METRICAS.find((m) => m.chave === chave)?.cobertura?.[casa]?.motivo;

export function coberturaDoPerfil(p: PoliticoDetalhe, nFalas = p.nFalas ?? 0): CoberturaSecao[] {
  const assembleia = p.casa === "assembleia";
  const out: CoberturaSecao[] = [];

  out.push(
    assembleia
      ? { id: "votos", titulo: "Votos", estado: "indisponivel", motivo: motivoDaMetrica("participacao", p.casa) }
      : p.votos.length
        ? { id: "votos", titulo: "Votos", estado: "disponivel" }
        : { id: "votos", titulo: "Votos", estado: "indisponivel", motivo: "Nenhuma votação nominal com esta pessoa no período." },
  );

  out.push(
    assembleia
      ? { id: "resumo", titulo: "Presença", estado: "indisponivel", motivo: motivoDaMetrica("presenca", p.casa) }
      : p.presenca
        ? { id: "resumo", titulo: "Presença", estado: "disponivel" }
        : { id: "resumo", titulo: "Presença", estado: "indisponivel", motivo: "A Casa não publicou sessões com esta pessoa no período." },
  );

  out.push(
    p.gastos
      ? { id: "gastos", titulo: "Gastos", estado: assembleia ? "parcial" : "disponivel", motivo: assembleia ? motivoDaMetrica("gasto12m", p.casa) : undefined }
      : { id: "gastos", titulo: "Gastos", estado: "indisponivel", motivo: assembleia ? motivoDaMetrica("gasto12m", p.casa) : "Nenhuma despesa publicada no período." },
  );

  const temProjetos = p.proposicoesLista.length > 0 || Object.keys(p.proposicoesPorTipo).length > 0;
  out.push(
    temProjetos
      ? { id: "projetos", titulo: "Projetos", estado: "disponivel" }
      : {
          id: "projetos",
          titulo: "Projetos",
          estado: "indisponivel",
          motivo: assembleia ? "Os projetos das assembleias ainda não são coletados." : "Nenhum projeto encontrado como autor ou coautor.",
        },
  );

  out.push(
    assembleia
      ? { id: "emendas", titulo: "Emendas", estado: "indisponivel", motivo: "Emendas ao orçamento dos estados ainda não são coletadas." }
      : p.emendas
        ? /transferegov/i.test(p.emendas.fonte)
          ? { id: "emendas", titulo: "Emendas", estado: "parcial", motivo: "Só as transferências especiais (Emendas Pix)." }
          : { id: "emendas", titulo: "Emendas", estado: "disponivel" }
        : { id: "emendas", titulo: "Emendas", estado: "indisponivel", motivo: "Nenhuma emenda encontrada nas fontes consultadas." },
  );

  out.push(
    nFalas > 0
      ? { id: "falas", titulo: "Falas", estado: "disponivel" }
      : { id: "falas", titulo: "Falas", estado: "indisponivel", motivo: assembleia ? "Os discursos das assembleias ainda não são coletados." : "Nenhum discurso no período." },
  );

  out.push(
    p.eleicoes.length
      ? { id: "vida", titulo: "Vida pública", estado: "disponivel" }
      : { id: "vida", titulo: "Vida pública", estado: "indisponivel", motivo: "Nenhuma candidatura ligada com segurança a esta pessoa nos arquivos do TSE." },
  );

  const recentes = p.eleicoes.filter((e) => e.ano >= PRIMEIRO_ANO_CONTAS);
  out.push(
    p.eleicoes.some((e) => e.campanha)
      ? {
          id: "campanhas",
          titulo: "Campanhas",
          estado: recentes.every((e) => e.campanha) ? "disponivel" : "parcial",
          motivo: recentes.every((e) => e.campanha) ? undefined : "Falta a prestação de contas de alguma campanha.",
        }
      : recentes.length
        ? { id: "campanhas", titulo: "Campanhas", estado: "indisponivel", motivo: "A prestação de contas não foi encontrada nos arquivos do TSE." }
        : {
            id: "campanhas",
            titulo: "Campanhas",
            estado: "nao-se-aplica",
            motivo: `Nenhuma eleição desde ${PRIMEIRO_ANO_CONTAS}, quando começam os arquivos de contas que usamos.`,
          },
  );

  out.push(
    p.perfil.email || p.perfil.telefone
      ? { id: "fontes", titulo: "Contato", estado: "disponivel" }
      : { id: "fontes", titulo: "Contato", estado: "indisponivel", motivo: "A fonte oficial não publica contato." },
  );
  return out;
}
