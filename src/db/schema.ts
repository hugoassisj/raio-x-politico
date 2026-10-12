import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Relational model of everything the pipeline collects.
 *
 * Two kinds of tables:
 *  - Snapshot tables (politicos, mandatos, votacoes, votos, despesas, proposicoes, eleicoes,
 *    redes_sociais) are replaced on every pipeline run and mirror the published JSON snapshot.
 *  - History tables (falas, resumos_ia, execucoes) are append-only, have no foreign key to
 *    politicos on purpose, and preserve what was said and summarized even after someone leaves office.
 *
 * Every fact keeps a source URL so any number shown in the app can be traced to an official record.
 */

export const politicos = pgTable(
  "politicos",
  {
    id: text("id").primaryKey(),
    casa: text("casa").notNull(),
    cargo: text("cargo").notNull(),
    nome: text("nome").notNull(),
    nomeCivil: text("nome_civil"),
    partido: text("partido").notNull(),
    uf: text("uf").notNull(),
    foto: text("foto"),
    emExercicio: boolean("em_exercicio").notNull(),
    inicioPolitica: integer("inicio_politica"),
    metricas: jsonb("metricas").notNull(),
    perfil: jsonb("perfil"),
    /** Official records this profile was assembled from */
    fontes: jsonb("fontes").notNull(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull(),
  },
  (t) => [index("politicos_uf_idx").on(t.uf), index("politicos_partido_idx").on(t.partido)],
);

export const mandatos = pgTable(
  "mandatos",
  {
    pid: text("pid").notNull().references(() => politicos.id, { onDelete: "cascade" }),
    cargo: text("cargo").notNull(),
    inicio: integer("inicio").notNull(),
    fim: integer("fim"),
    uf: text("uf"),
    partido: text("partido"),
    fonte: text("fonte").notNull(),
  },
  (t) => [primaryKey({ columns: [t.pid, t.cargo, t.inicio] })],
);

export const votacoes = pgTable(
  "votacoes",
  {
    id: text("id").primaryKey(),
    casa: text("casa").notNull(),
    data: date("data").notNull(),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    resultado: text("resultado"),
    orientacaoGoverno: text("orientacao_governo"),
    orientacoes: jsonb("orientacoes"),
    fonteUrl: text("fonte_url"),
  },
  (t) => [index("votacoes_data_idx").on(t.data)],
);

export const votos = pgTable(
  "votos",
  {
    votacaoId: text("votacao_id").notNull().references(() => votacoes.id, { onDelete: "cascade" }),
    pid: text("pid").notNull(),
    partido: text("partido"),
    voto: text("voto").notNull(),
  },
  (t) => [primaryKey({ columns: [t.votacaoId, t.pid] }), index("votos_pid_idx").on(t.pid)],
);

export const despesas = pgTable(
  "despesas",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    pid: text("pid")
      .notNull()
      .references(() => politicos.id, { onDelete: "cascade" }),
    /** yyyy-mm, the reimbursement month */
    mes: text("mes").notNull(),
    data: date("data"),
    categoria: text("categoria").notNull(),
    fornecedor: text("fornecedor"),
    /** Supplier CNPJ/CPF, digits only */
    fornecedorDoc: text("fornecedor_doc"),
    valor: numeric("valor", { precision: 14, scale: 2 }).notNull(),
    /** Document id at the source (receipt), when published */
    documento: text("documento"),
    fonteUrl: text("fonte_url"),
  },
  (t) => [index("despesas_pid_mes_idx").on(t.pid, t.mes), index("despesas_fornecedor_idx").on(t.fornecedorDoc)],
);

export const proposicoes = pgTable(
  "proposicoes",
  {
    id: text("id").notNull(),
    pid: text("pid")
      .notNull()
      .references(() => politicos.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    ementa: text("ementa"),
    data: date("data"),
    situacao: text("situacao"),
    virouLei: boolean("virou_lei"),
    fonteUrl: text("fonte_url"),
  },
  (t) => [primaryKey({ columns: [t.id, t.pid] })],
);

export const eleicoes = pgTable(
  "eleicoes",
  {
    pid: text("pid")
      .notNull()
      .references(() => politicos.id, { onDelete: "cascade" }),
    ano: integer("ano").notNull(),
    cargo: text("cargo").notNull(),
    uf: text("uf"),
    partido: text("partido"),
    situacao: text("situacao"),
    votos: integer("votos"),
    patrimonio: numeric("patrimonio", { precision: 16, scale: 2 }),
    bens: jsonb("bens"),
  },
  (t) => [primaryKey({ columns: [t.pid, t.ano, t.cargo] })],
);

export const redesSociais = pgTable(
  "redes_sociais",
  {
    pid: text("pid")
      .notNull()
      .references(() => politicos.id, { onDelete: "cascade" }),
    plataforma: text("plataforma").notNull(),
    url: text("url").notNull(),
    handle: text("handle"),
    fonte: text("fonte").notNull(),
    fonteUrl: text("fonte_url"),
    verificado: boolean("verificado").default(false),
  },
  (t) => [primaryKey({ columns: [t.pid, t.url] })],
);

export const falas = pgTable(
  "falas",
  {
    id: text("id").primaryKey(),
    pid: text("pid").notNull(),
    data: date("data").notNull(),
    tipo: text("tipo").notNull(),
    titulo: text("titulo"),
    texto: text("texto").notNull(),
    url: text("url").notNull(),
    fonte: text("fonte").notNull(),
  },
  (t) => [
    index("falas_pid_data_idx").on(t.pid, t.data),
    // Portuguese full-text search over titles and transcripts
    index("falas_busca_idx").using("gin", sql`to_tsvector('portuguese', coalesce(${t.titulo}, '') || ' ' || ${t.texto})`),
  ],
);

export const resumosIA = pgTable(
  "resumos_ia",
  {
    pid: text("pid").notNull(),
    periodo: text("periodo").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    hash: text("hash").notNull(),
    modelo: text("modelo").notNull(),
    conteudo: jsonb("conteudo").notNull(),
    geradoEm: timestamp("gerado_em", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.pid, t.periodo, t.hash] }), index("resumos_ia_pid_fim_idx").on(t.pid, t.fim)],
);

export const execucoes = pgTable("execucoes", {
  id: text("id").primaryKey(),
  iniciadaEm: timestamp("iniciada_em", { withTimezone: true }).notNull(),
  meta: jsonb("meta").notNull(),
});
