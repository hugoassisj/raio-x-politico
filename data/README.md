# Dados publicados

Retrato gerado pelo pipeline (`npm run pipeline`) e atualizado diariamente pelo GitHub Actions. Os tipos de cada arquivo estão em [`src/lib/types.ts`](../src/lib/types.ts). Valores ausentes são omitidos, nunca preenchidos com zero.

| Arquivo | Conteúdo |
|---|---|
| `meta.json` | Data da coleta, situação de cada fonte, totais e subsídios (`Meta`) |
| `politicos.json` | Todos os parlamentares com métricas resumidas (`PoliticoResumo[]`) |
| `politicos/{id}.json` | Perfil completo: carreira, presença, votos, gastos, projetos, emendas, eleições, redes e fontes (`PoliticoDetalhe`) |
| `votacoes.json` | Votações nominais com totais e votos por partido (`VotacaoResumo[]`) |
| `votacoes/{id}.json` | Votação com o voto de cada parlamentar e as orientações (`VotacaoDetalhe`) |
| `falas/{id}.json` | Discursos e publicações de um parlamentar, com o resumo oficial e o início do texto (`FalasArquivo`) |
| `falas-recentes.json` | As 300 falas mais recentes de todos |
| `ia/{id}.json` | Resumos de IA com citações (`IAArquivo`), quando habilitados |
| `gastos.json` | Visão nacional da cota: por casa, categoria, fornecedor e alertas (`GastosGerais`) |
| `agregados.json` | Medianas e médias por casa, partido e estado (`Agregado[]`) |

## Identificadores

| Prefixo | Exemplo | Origem do número |
|---|---|---|
| `dep-` | `dep-204379` | id do deputado na API da Câmara |
| `sen-` | `sen-5672` | código do parlamentar no Senado |
| `est-{uf}-` | `est-mg-130001612345` | sequencial da candidatura no TSE (eleição de 2022) |
| `cam-` / `sen-` em votações | `cam-2611313-34` | id da votação na Câmara / código da sessão de votação no Senado |
