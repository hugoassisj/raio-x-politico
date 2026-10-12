import type { PoliticoDetalhe, VotacaoDetalhe, EleicaoTSE } from "../src/lib/types";

/** A politician record as assembled by a source, before metrics are computed. */
export type PoliticoParcial = Partial<Omit<PoliticoDetalhe, "id" | "casa" | "cargo" | "nome" | "partido" | "uf" | "emExercicio" | "m">> &
  Pick<PoliticoDetalhe, "id" | "casa" | "cargo" | "nome" | "partido" | "uf" | "emExercicio"> & {
    /** Câmara returns a masked CPF like 742***287 */
    cpfMascarado?: string;
    /** yyyy-mm-dd of the start of the current term in office (for fair attendance) */
    inicioExercicioAtual?: string;
    /** Periods in office in the current legislature (Câmara); end is exclusive, open when still in office */
    exercicio?: { ini: string; fim?: string }[];
    proposicoesTotal?: number;
    proposicoesLei?: number;
    /** TSE candidate sequence number when the record came from TSE */
    sqCandidato?: string;
    eleicaoTseBase?: EleicaoTSE;
  };

export interface Despesa {
  pid: string;
  ano: number;
  mes: number;
  data?: string;
  categoria: string;
  fornecedor: string;
  doc?: string;
  valor: number;
  url?: string;
  /** Unique id of the reimbursement row at the source */
  docId?: string;
  /** Receipt/invoice number printed on the document (used to detect true duplicates) */
  numeroDoc?: string;
}

export interface Sessao {
  id: string;
  data: string;
  presentes: string[];
  /** Senado: absences with formal justification */
  justificadas?: string[];
}

export interface SourceOutput {
  politicos: PoliticoParcial[];
  votacoes: VotacaoDetalhe[];
  despesas: Despesa[];
  sessoes: Sessao[];
  avisos: string[];
}

export interface CandidatoTSE {
  ano: number;
  sq: string;
  cpf?: string;
  titulo?: string;
  nome: string;
  nomeUrna: string;
  nascimento?: string;
  uf: string;
  cargo: string;
  codCargo: number;
  partido: string;
  numero: string;
  situacao: string;
  ocupacao?: string;
  instrucao?: string;
  genero?: string;
  patrimonio?: number;
  bens?: { tipo: string; descricao: string; valor: number }[];
  votos?: number;
}

export interface EmendaAgg {
  nome: string;
  codigo?: string;
  total: number;
  porAno: Map<number, number>;
  destinos: Map<string, { nome: string; uf?: string; valor: number }>;
  fonte: string;
}
