# Raio-X Político

O que fazem senadores, deputados federais e deputados estaduais do Brasil: presença, votos, projetos, gastos da cota, emendas, patrimônio, falas e carreira. Tudo a partir de dados públicos oficiais, com a fonte de cada número.

- Visão, princípios, métricas, fontes e roadmap: [PRODUCT.md](PRODUCT.md)
- Dicionário dos dados publicados: [data/README.md](data/README.md)

## Como funciona

1. Um **pipeline** (`pipeline/`) coleta dados da Câmara, do Senado, do TSE, do Transferegov, de assembleias legislativas e das APIs oficiais de redes sociais, vincula as pessoas entre as fontes, calcula métricas e publica um retrato em `data/`.
2. O **GitHub Actions** roda o pipeline todo dia e versiona os dados no repositório.
3. O **app** Next.js (`src/`) gera as páginas a partir desse retrato. Um banco Postgres opcional guarda o histórico de falas e resumos de IA e faz busca textual em português.

## Rodar localmente

Requer Node 22.

```bash
npm ci

# Opção A: dados fictícios de demonstração (rápido, sem internet para fontes oficiais)
npm run demo
DATA_DIR=data-demo npm run dev

# Opção B: dados reais (leva de 1 a 3 horas na primeira vez; depois usa cache)
npm run pipeline
npm run dev
```

Abra http://localhost:3000.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run pipeline` | Coleta tudo e grava `data/` |
| `npm run pipeline -- --only=senado,camara` | Recoleta só algumas fontes, reaproveitando as outras da última coleta |
| `npm run pipeline -- --dias=90` | Janela menor para votos, presença e discursos |
| `npm run pipeline:ai` | Gera resumos de IA com citações (requer `ANTHROPIC_API_KEY`) |
| `npm run db:migrate` e `npm run pipeline:db` | Cria as tabelas e carrega o retrato no Postgres (requer `DATABASE_URL`) |
| `npm test` | Testes de métricas, coletores (com respostas no formato das APIs oficiais), banco (Postgres em memória) e app |
| `npm run lint` e `npm run typecheck` | Qualidade de código |

### Variáveis de ambiente

Todas são opcionais. Veja [.env.example](.env.example).

| Variável | Habilita |
|---|---|
| `DATABASE_URL` | Banco Postgres (busca textual e histórico) |
| `ANTHROPIC_API_KEY` | Resumos de IA |
| `PORTAL_TRANSPARENCIA_API_KEY` | Todas as emendas parlamentares (chave gratuita em portaldatransparencia.gov.br/api-de-dados) |
| `YOUTUBE_API_KEY` | Vídeos dos canais oficiais |
| `X_BEARER_TOKEN`, `IG_ACCESS_TOKEN` + `IG_USER_ID`, `TIKTOK_RESEARCH_TOKEN` | Publicações via APIs oficiais dessas plataformas |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (sitemap e metadados) |

## Publicar

1. Importe o repositório na Vercel. Nenhuma configuração extra é necessária.
2. Em **Settings > Secrets and variables > Actions** do GitHub, adicione as chaves opcionais que quiser usar.
3. Rode o workflow **Atualizar dados** manualmente uma vez. A partir daí ele roda diariamente, e cada commit de dados dispara um novo deploy.

## Estrutura

```
pipeline/            coleta, vínculo entre fontes, métricas, IA e carga no banco
  sources/           um coletor por fonte oficial
  tests/             testes de métricas, coletores, IA e banco
src/
  app/               páginas
  components/        componentes de interface
  lib/               tipos compartilhados, métricas, formatação, acesso aos dados
  db/                schema do Postgres (Drizzle)
drizzle/             migrações do banco
data/                retrato publicado (gerado pelo pipeline)
```

## Contribuir

Encontrou um número errado? [Abra uma issue](../../issues/new?template=erro-nos-dados.yml) com o link da página e o link da fonte oficial. Melhorias de código são bem-vindas via pull request; rode `npm run lint && npm run typecheck && npm test` antes.

## Licença

Código sob licença MIT. Os dados publicados em `data/` são derivados de bases públicas oficiais e podem ser reutilizados citando o Raio-X Político e as fontes originais.
