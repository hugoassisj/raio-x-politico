CREATE TABLE "despesas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "despesas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pid" text NOT NULL,
	"mes" text NOT NULL,
	"data" date,
	"categoria" text NOT NULL,
	"fornecedor" text,
	"fornecedor_doc" text,
	"valor" numeric(14, 2) NOT NULL,
	"documento" text,
	"fonte_url" text
);
--> statement-breakpoint
CREATE TABLE "eleicoes" (
	"pid" text NOT NULL,
	"ano" integer NOT NULL,
	"cargo" text NOT NULL,
	"uf" text,
	"partido" text,
	"situacao" text,
	"votos" integer,
	"patrimonio" numeric(16, 2),
	"bens" jsonb,
	CONSTRAINT "eleicoes_pid_ano_cargo_pk" PRIMARY KEY("pid","ano","cargo")
);
--> statement-breakpoint
CREATE TABLE "execucoes" (
	"id" text PRIMARY KEY NOT NULL,
	"iniciada_em" timestamp with time zone NOT NULL,
	"meta" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "falas" (
	"id" text PRIMARY KEY NOT NULL,
	"pid" text NOT NULL,
	"data" date NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text,
	"texto" text NOT NULL,
	"url" text NOT NULL,
	"fonte" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mandatos" (
	"pid" text NOT NULL,
	"cargo" text NOT NULL,
	"inicio" integer NOT NULL,
	"fim" integer,
	"uf" text,
	"partido" text,
	"fonte" text NOT NULL,
	CONSTRAINT "mandatos_pid_cargo_inicio_pk" PRIMARY KEY("pid","cargo","inicio")
);
--> statement-breakpoint
CREATE TABLE "politicos" (
	"id" text PRIMARY KEY NOT NULL,
	"casa" text NOT NULL,
	"cargo" text NOT NULL,
	"nome" text NOT NULL,
	"nome_civil" text,
	"partido" text NOT NULL,
	"uf" text NOT NULL,
	"foto" text,
	"em_exercicio" boolean NOT NULL,
	"inicio_politica" integer,
	"metricas" jsonb NOT NULL,
	"perfil" jsonb,
	"fontes" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposicoes" (
	"id" text NOT NULL,
	"pid" text NOT NULL,
	"tipo" text NOT NULL,
	"ementa" text,
	"data" date,
	"situacao" text,
	"virou_lei" boolean,
	"fonte_url" text,
	CONSTRAINT "proposicoes_id_pid_pk" PRIMARY KEY("id","pid")
);
--> statement-breakpoint
CREATE TABLE "redes_sociais" (
	"pid" text NOT NULL,
	"plataforma" text NOT NULL,
	"url" text NOT NULL,
	"handle" text,
	"fonte" text NOT NULL,
	"fonte_url" text,
	"verificado" boolean DEFAULT false,
	CONSTRAINT "redes_sociais_pid_url_pk" PRIMARY KEY("pid","url")
);
--> statement-breakpoint
CREATE TABLE "resumos_ia" (
	"pid" text NOT NULL,
	"periodo" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"hash" text NOT NULL,
	"modelo" text NOT NULL,
	"conteudo" jsonb NOT NULL,
	"gerado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "resumos_ia_pid_periodo_hash_pk" PRIMARY KEY("pid","periodo","hash")
);
--> statement-breakpoint
CREATE TABLE "votacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"casa" text NOT NULL,
	"data" date NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"resultado" text,
	"orientacao_governo" text,
	"orientacoes" jsonb,
	"fonte_url" text
);
--> statement-breakpoint
CREATE TABLE "votos" (
	"votacao_id" text NOT NULL,
	"pid" text NOT NULL,
	"partido" text,
	"voto" text NOT NULL,
	CONSTRAINT "votos_votacao_id_pid_pk" PRIMARY KEY("votacao_id","pid")
);
--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_pid_politicos_id_fk" FOREIGN KEY ("pid") REFERENCES "public"."politicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eleicoes" ADD CONSTRAINT "eleicoes_pid_politicos_id_fk" FOREIGN KEY ("pid") REFERENCES "public"."politicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandatos" ADD CONSTRAINT "mandatos_pid_politicos_id_fk" FOREIGN KEY ("pid") REFERENCES "public"."politicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposicoes" ADD CONSTRAINT "proposicoes_pid_politicos_id_fk" FOREIGN KEY ("pid") REFERENCES "public"."politicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redes_sociais" ADD CONSTRAINT "redes_sociais_pid_politicos_id_fk" FOREIGN KEY ("pid") REFERENCES "public"."politicos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos" ADD CONSTRAINT "votos_votacao_id_votacoes_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "despesas_pid_mes_idx" ON "despesas" USING btree ("pid","mes");--> statement-breakpoint
CREATE INDEX "despesas_fornecedor_idx" ON "despesas" USING btree ("fornecedor_doc");--> statement-breakpoint
CREATE INDEX "falas_pid_data_idx" ON "falas" USING btree ("pid","data");--> statement-breakpoint
CREATE INDEX "falas_busca_idx" ON "falas" USING gin (to_tsvector('portuguese', coalesce("titulo", '') || ' ' || "texto"));--> statement-breakpoint
CREATE INDEX "politicos_uf_idx" ON "politicos" USING btree ("uf");--> statement-breakpoint
CREATE INDEX "politicos_partido_idx" ON "politicos" USING btree ("partido");--> statement-breakpoint
CREATE INDEX "resumos_ia_pid_fim_idx" ON "resumos_ia" USING btree ("pid","fim");--> statement-breakpoint
CREATE INDEX "votacoes_data_idx" ON "votacoes" USING btree ("data");--> statement-breakpoint
CREATE INDEX "votos_pid_idx" ON "votos" USING btree ("pid");