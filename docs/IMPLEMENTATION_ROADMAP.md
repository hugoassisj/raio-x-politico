# Plano de implementação (rastreador)

Este é o registro oficial do que falta fazer, do que está em andamento e do que já foi conferido. Quem pegar o trabalho no meio (pessoa ou agente) deve começar por aqui.

- **Leia antes:** [PRODUCT.md](../PRODUCT.md) (princípios, que são requisitos) e [AGENTS.md](../AGENTS.md) (regras do código).
- **Situações:** `NOT_STARTED` (não começou), `IN_PROGRESS` (em andamento), `BLOCKED` (travado, com o motivo), `IMPLEMENTED` (código escrito), `VERIFIED` (critérios de aceite testados, com a prova anotada).
- **Prioridades:** P0 (correção e base), P1 (melhoria central para o cidadão), P2 (capacidade avançada), P3 (acabamento e futuro).
- Um item só vira `VERIFIED` com prova: teste automatizado com nome, página conferida no navegador com data, ou execução real do coletor. Compilar não é prova.

## 1. Objetivos e princípios

1. Qualquer pessoa, inclusive quem lê pouco, entende o que um político fez, com a fonte oficial ao lado de cada número.
2. Neutro: sem nota, ranking, rótulo ideológico ou juízo de valor. Fato, cálculo, inferência e texto de IA aparecem separados e marcados.
3. Melhor faltar do que errar: dado ausente é dito como ausente, nunca vira zero; ligação incerta entre registros não é publicada como certa.
4. Rápido e simples no celular; detalhes ficam a um toque (revelação progressiva).
5. Código limpo: uma fonte para cada definição (`metricas.ts`, `linguagem.ts`, `perguntas.ts`, `types.ts`), coletores que desconfiam das APIs, testes para cada regra.

## 2. O que já existe (conferido no código em 2026-10-12)

| Área | O que existe | Onde |
|---|---|---|
| Páginas | Início, políticos, perfil, votações, votação, partidos, partido, estado, gastos, falas, comparar, análises, como funciona, dados, sobre, API de índice | `src/app/**/page.tsx` |
| Coleta | Câmara, Senado, TSE (candidaturas, bens, redes), histórico TSE desde 1994, contas de campanha (2018 em diante), assembleias, Emendas Pix (Transferegov), Portal da Transparência (com chave), discursos, redes sociais oficiais, matérias votadas | `pipeline/sources/*.ts` |
| Confiabilidade | Verificações antes de publicar (bloqueiam a publicação), manifesto SHA-256 dos arquivos oficiais, cartão “Como sabemos disso?” com período, cálculo, limites e cobertura | `pipeline/qualidade.ts`, `pipeline/lib/http.ts`, `src/components/ComoSabemos.tsx` |
| Linguagem simples | Glossário com toque, regras públicas para explicar cada etapa de votação, rótulos para códigos de voto (Artigo 17, P-NRV, AP, LS...), explicações por IA com regras de validação | `src/lib/linguagem.ts`, `pipeline/explicar.ts` |
| Votações | Lista com filtros por assunto e casa, página da votação com explicação, regra de aprovação desenhada, plenário (uma bolinha por cadeira), votos do meu estado, linha do tempo do projeto, tabela por partido, lista nominal com busca e filtro por voto (situação antes deste plano) | `src/app/votacao/[id]/page.tsx`, `src/components/{Plenario,Quorum,MeuEstado}.tsx` |
| Vida pública | Linha do tempo de candidaturas, trocas de partido, curva de patrimônio, dinheiro de campanha, mandatos | `src/components/VidaPublica.tsx`, `src/lib/carreira.ts` |
| Design | Tokens em três camadas (primitivos OKLCH, semânticos, receitas), tema claro e escuro por preferência do sistema e por `data-theme`, movimento contido com respeito a `prefers-reduced-motion`, ícones Lucide | `src/app/globals.css`, `src/components/Icone.tsx` |
| Testes | 89 testes (Vitest): cálculos, coletores com respostas simuladas, banco, interface, linguagem | `pipeline/tests/*`, `src/lib/*.test.ts` |

**Achados da auditoria**

- **Não há shadcn/ui.** A especificação fala em “base shadcn/ui existente”, mas o projeto usa Tailwind v4 com componentes próprios (`ui.tsx`, receitas `.cartao`, `.chip`, `.botao`). Decisão: manter os componentes próprios e os tokens atuais; não introduzir shadcn só por introduzir (registrado em DEC-01).
- **Tabelas:** não há TanStack Table. Tabelas são HTML com ordenação por URL (`/politicos`) ou filtros no cliente (`VotosNominais`).
- **Tema:** os tokens escuros existem, mas não há botão para trocar o tema nem preferência salva.
- **Paginação:** cada lista resolve do seu jeito (“mostrar mais” em `VotosNominais`, cortes fixos em outras). Não há componente comum nem estado na URL.
- **Partido na época do voto:** a lista de votos de cada votação traz o partido registrado pela Casa naquele voto. Em 20.228 dos 110.872 votos guardados, esse partido é diferente do partido atual da pessoa. Ou seja, a fonte guarda o partido da época, e a interface deve usar esse, não o atual.
- **Totais oficiais e votos individuais:** nas 351 votações publicadas, a contagem de Sim e Não feita a partir dos votos individuais bate com o total oficial em todas as votações abertas. As 53 diferenças são todas votações secretas (a Casa publica o total, mas não o voto de cada pessoa).
- **Códigos de voto vistos nos dados reais:** Câmara: Sim, Não, Abstenção, Obstrução, Artigo 17, Participou (voto secreto). Senado: Sim, Não, Abstenção, AP, MIS, LS, LP, LAP, NCom, P-NRV, Presidente (art. 51 RISF).
- **Execução completa do TSE:** a execução com histórico e contas (run 38259518839) falhou com código 1 sem mensagem visível. Os erros do pipeline agora viram anotações da execução (DADOS-02), e uma nova execução completa foi disparada.

## 3. Lacunas

| Tema | Lacuna |
|---|---|
| Produto | Presidente da República sem página; empresas (CNPJ) sem página; emendas sem ciclo completo (empenho, liquidação, pagamento); sem grafo de relações |
| UX | Votação: os números do resultado não filtram a lista; não dá para esconder uma categoria; “sem voto registrado” se mistura com “ausente”; tema sem botão; paginação desigual |
| Dados | Histórico TSE e contas de campanha ainda não conferidos com dados reais; explicações por IA ainda não geradas (sem chave); partido por data só existe nos votos |
| Qualidade de dados | Falta registrar a data da coleta por voto individual (hoje vale a data da coleta geral, em `meta.json`) |
| Arquitetura | Sem primitivos de tabela e paginação compartilhados |
| Acessibilidade | Falta conferência sistemática (teclado, leitor de tela, zoom 200%) por página |
| Testes | Faltam testes de interface para filtros com estado na URL |
| Operação | Execuções longas falham sem mensagem (corrigido em DADOS-02); capturas de tela do README ausentes |

## 4. Itens por frente de trabalho

Formato de cada item: **ID**, situação, prioridade, o que é, critérios de aceite, depende de, prova.

### 4.1 Votações (adendo “Ficha do Político e votos para o cidadão”)

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| VOT-01 | VERIFIED | P0 | Definições das categorias de voto | Uma função pura transforma o código original da Casa em uma categoria (Sim, Não, Abstenção, Obstrução, Outro registro, Ausência registrada, Sem voto registrado), sem perder o código original. Testes cobrem cada código visto nos dados reais. “Sem voto registrado” nunca vira “Não” nem “ausente”. | |
| VOT-02 | VERIFIED | P0 | Contagens que filtram a lista | Tocar em Sim, Não ou outra categoria no resumo filtra a lista real de pessoas; o filtro ativo fica evidente; um toque desfaz; outra categoria pode ser escolhida direto. | VOT-01, PAG-01 |
| VOT-03 | VERIFIED | P0 | Esconder e mostrar categorias | “Esconder quem votou Sim”, “Mostrar todos de novo”, chips removíveis, “Limpar filtros”. Esconder não muda os totais oficiais. | VOT-02 |
| VOT-04 | VERIFIED | P0 | Totais oficiais separados do que está visível | O total oficial aparece sempre; a contagem da lista filtrada aparece como “mostrando X de Y”. | VOT-02 |
| VOT-05 | VERIFIED | P1 | Lista de votos (roster) | Cada linha: foto, nome, partido da época do voto, estado, voto com explicação, link para o perfil. Modo compacto e modo detalhado; no celular, lista legível sem rolagem lateral. | VOT-01 |
| VOT-06 | VERIFIED | P1 | Filtros combinados com estado na URL | Busca, partido, estado, categoria, ordem, visão e página vão para a URL; atualizar, compartilhar, voltar e avançar funcionam. Ordem determinística (critério + nome + id). | PAG-01 |
| VOT-07 | VERIFIED | P1 | Partidos sem ranking | Por partido, a distribuição de todos os tipos de voto, a orientação do partido separada do voto de cada membro, ordem alfabética declarada, tocar no partido filtra a lista; visão “por partido” com os membros. | VOT-05 |
| VOT-08 | IMPLEMENTED | P1 | Partido da época | Votos usam o partido gravado pela Casa no voto. Para quem não tem voto registrado, a interface diz que o partido mostrado é o atual. | VOT-05 |
| VOT-09 | VERIFIED | P1 | Contexto da votação | Pergunta votada, etapa, resultado desta votação separado do destino final do projeto; não dizer “virou lei” sem prova. | |
| VOT-10 | VERIFIED | P1 | Procedimento ou mérito | Cada votação marcada como “sobre o andamento” (pedido, requerimento) ou “sobre o conteúdo”, com regra pública e testada. Filtro no catálogo. | VOT-01 |
| VOT-11 | VERIFIED | P1 | Catálogo de votações | Busca por texto, filtros por casa, assunto, resultado, tipo (andamento ou conteúdo), período; estado na URL; paginação comum. | PAG-01, VOT-10 |
| VOT-12 | VERIFIED | P1 | Votos no perfil | No perfil, filtrar votos por voto, assunto, ano e casa, com link para cada votação. | VOT-01 |
| VOT-13 | IN_PROGRESS | P0 | Origem de cada voto | Identificador oficial da votação, casa, data, código original do voto e link oficial visíveis no detalhe; data da coleta mostrada. | VOT-05 |
| VOT-14 | IN_PROGRESS | P0 | Testes de votação | Testes para: Sim, Não, abstenção, obstrução, sem voto, presidindo, licença, voto secreto, Câmara e Senado, troca de partido, filtro vazio, combinação de filtros com URL e paginação. | VOT-01 a VOT-06 |
| VOT-15 | IN_PROGRESS | P1 | Conferência na tela | Página de votação conferida no navegador, claro e escuro, celular e computador, só com teclado. | VOT-02 a VOT-08, TEMA-01 |

### 4.2 Base de design e navegação

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| TEMA-01 | VERIFIED | P1 | Botão de tema | Botão visível (claro, escuro, do sistema), preferência salva, sem piscar na carga, nome acessível. | |
| PAG-01 | VERIFIED | P0 | Paginação comum | Uma função pura (`src/lib/paginacao.ts`) e um componente (`Paginacao`); página na URL; volta à página 1 quando um filtro muda; ordem estável. | |
| PAG-02 | VERIFIED | P1 | Paginação nas listas | Políticos, votações, falas e lista de votos usam PAG-01. | PAG-01 |
| TAB-01 | VERIFIED | P2 | Primitivos de tabela | Avaliar TanStack Table para `/politicos` e gastos: ordenar, esconder colunas, redimensionar, exportar CSV, preferências salvas. Decidir com base em peso e acessibilidade. | PAG-01 |
| NAV-01 | VERIFIED | P2 | Navegação | Presidente e empresas na navegação quando existirem; revisar menu do celular. | PRES-01 |
| DS-01 | VERIFIED | P1 | Tokens e movimento | Tokens em três camadas e animações contidas já existem. Falta conferir contraste AA de todos os pares no tema escuro. | |

### 4.3 Partidos

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| PART-01 | BLOCKED | P1 | Cor de cada partido com fonte | Cores tiradas do material oficial de cada partido, guardadas com a URL e a data da consulta; contraste conferido nos dois temas. Bloqueio: nenhuma fonte pública oficial e única publica as cores (o TSE não publica; cada partido tem seu manual, quando tem), e a decisão de produto (DEC-05) precisa ser fechada antes de pesquisar 30 partidos. | |
| PART-02 | IMPLEMENTED | P1 | Componentes de partido | `SiglaPartido` (`src/components/Partido.tsx`): sigla com o nome completo para leitor de tela e ao passar o mouse, link só para partidos com página. Nomes de partidos extintos ou renomeados (PMDB, PFL, DEM, PSL e outros) para a vida pública desde 1994. Em uso na lista de votos, na visão por partido e na Presidência. Falta: usar em todas as páginas. | |
| PART-03 | BLOCKED | P2 | Logos dos partidos | Logos são marcas registradas. Só guardar com licença ou permissão clara; até lá, sigla tipográfica. Motivo do bloqueio: falta revisão de licença. | PART-01 |
| PART-04 | IMPLEMENTED | P1 | Filiação ao longo do tempo | Partido por data a partir das candidaturas do TSE e dos votos; nunca supor o partido de uma data pelo partido atual. | DADOS-01 |

### 4.4 Perfis, história e Presidência

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| PERF-01 | VERIFIED | P1 | Cobertura por seção | Cada seção do perfil diz se o dado está completo, parcial, indisponível ou não se aplica. Já existe nas métricas (`ComoSabemos`); falta nas seções. | |
| PERF-02 | IMPLEMENTED | P1 | Vida pública desde 1994 | Linha do tempo, partidos, bens e contas. Falta conferir com dados reais. | DADOS-01 |
| PRES-01 | IMPLEMENTED | P0 | Presidente da República | Página do Presidente atual, encontrável na navegação; eleições, bens e contas de campanha pelo TSE; atos oficiais com fonte. Testes. | DADOS-01 |
| CONT-01 | VERIFIED | P1 | “Contato, redes e fontes” | Dividir em Contato, Redes sociais, Sites oficiais, Fontes e transparência, Sobre os dados; ícones iguais para cada rede. | |
| PL-01 | IMPLEMENTED | P1 | Projetos de lei | Autoria e coautoria separadas, situação, histórico, link oficial, filtros. | |

### 4.5 Dinheiro público, empresas e relações

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| EMD-01 | IMPLEMENTED | P1 | Ciclo da emenda | Indicação, empenho, liquidação e pagamento separados, com fonte de cada etapa. | |
| EMD-02 | IMPLEMENTED | P2 | Caminho pelo município | Ver todas as emendas que chegaram a uma cidade. | EMD-01 |
| CNPJ-01 | VERIFIED | P1 | CNPJ normalizado | Função pura com dígitos verificadores e testes. | |
| CNPJ-02 | IMPLEMENTED | P2 | Página da empresa | Gastos, doações e emendas ligados a um CNPJ, sem contar duas vezes. | CNPJ-01 |
| CNPJ-03 | VERIFIED | P2 | Ligação certa ou possível | Ligações confirmadas (mesmo CNPJ) separadas das possíveis (mesmo nome). | CNPJ-01 |
| GRAFO-01 | IMPLEMENTED | P2 | Grafo de relações | Grafo interativo real com tipos de ligação e prova de cada uma, busca, expandir um nó, filtros, painel lateral, visão em lista e uso pelo teclado. Teste: ligação sem prova não sai como confirmada. | CNPJ-03 |

### 4.6 Confiança, acessibilidade e operação

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| PROV-01 | IMPLEMENTED | P0 | “Como sabemos disso?” | Cartão de evidência por métrica. Falta estender a todas as seções. | |
| PROV-02 | VERIFIED | P1 | Fato, cálculo, inferência e IA | Marcas visuais e texto diferentes para cada tipo. | |
| PROV-03 | VERIFIED | P1 | Pedido de correção | Modelo de issue “erro nos dados” já existe; falta registro público das correções feitas. | |
| BAND-01 | NOT_STARTED | P3 | Bandeiras dos estados | Arquivos locais das fontes oficiais de cada estado, com fonte e licença. | |
| A11Y-01 | IN_PROGRESS | P1 | Conferência de acessibilidade | Teclado, leitor de tela, zoom 200%, contraste, nas páginas principais. | |
| DADOS-01 | IN_PROGRESS | P0 | Execução completa do TSE | Histórico desde 1994 e contas de campanha publicados e conferidos em perfis reais. | DADOS-02 |
| DADOS-02 | IMPLEMENTED | P0 | Erros visíveis na execução | Erros e verificações que falham viram anotações do GitHub Actions. | |
| IA-01 | BLOCKED | P1 | Explicações por IA | Gerar e validar as explicações dos projetos votados. Bloqueio: o ambiente não tem `ANTHROPIC_API_KEY`. Caminho: gerar fora e importar com `pipeline:explicar -- --importar`. | |
| DOC-01 | VERIFIED | P2 | Capturas de tela do README | `docs/telas/*.png` existem e mostram o site real. | VOT-15 |
| VAL-01 | NOT_STARTED | P1 | Oito casos nos dois temas | Político com muitos dados, com poucos, candidato histórico, empresa, identidade ambígua, emenda com pagamento, grafo, página sem registros. | vários |

### 4.7 Referências estudadas

| ID | Situação | P | O que é | Decisão |
|---|---|---|---|---|
| REF-01 | VERIFIED | P2 | EloSys (github.com/YuriRDev/elosys) | Python e SQLite, sem licença: só ideias, nenhum código copiado. Adotado: seguir a mesma pessoa pelas fontes por identificador forte. Rejeitado: pontuações de risco (juízo de valor). Detalhes em PRODUCT.md, “Referências estudadas”. |
| REF-02 | VERIFIED | P1 | Ficha do Político (fichadopolitico.com.br) | Astro, licença MIT, nenhum código copiado. Adotado: vida pública inteira e contas de campanha. Adaptado: lista de votos fácil de filtrar (aqui com contagens clicáveis e estado na URL). Rejeitado: qualquer nota ou selo de “ficha limpa” feito por nós; só mostramos o que a fonte oficial diz. Detalhes em PRODUCT.md. |
| REF-03 | VERIFIED | P1 | Licenças de reuso | Nenhum código de terceiros copiado; dados só de fontes oficiais com termos de uso abertos. |

### 4.9 Itens da especificação que ainda faltavam no rastreador

| ID | Situação | P | O que é | Critérios de aceite | Depende de |
|---|---|---|---|---|---|
| HIST-01 | IMPLEMENTED | P1 | Visões por eleição | Escolher uma eleição (ano e cargo) e ver quem disputou, quem foi eleito e por qual partido, com a data respeitada em tudo o que aparece | DADOS-01 |
| HIST-02 | NOT_STARTED | P2 | Reprodutibilidade | Cada publicação guarda versão dos dados e manifesto; dá para baixar o retrato de uma data | |
| CARD-01 | IMPLEMENTED | P1 | Cartões e listas de políticos mais ricos | Lista de políticos com foto, partido, estado, cargo, principais números e cobertura de dados, sem ranking | TAB-01 |
| LAY-01 | VERIFIED | P2 | Layout mais largo e navegação revista | Páginas de dados usam a largura da tela; menu com Presidência, Empresas, Emendas e Mapa de relações também no celular | |
| CNPJ-04 | NOT_STARTED | P2 | Dados cadastrais da Receita | Situação cadastral, atividade principal e data de abertura a partir dos dados abertos do CNPJ da Receita Federal, com data do arquivo | CNPJ-02 |
| VOT-16 | NOT_STARTED | P2 | Sessões do Congresso e vetos | Votações em sessão conjunta e de vetos, pela API do Congresso Nacional | |
| CORR-01 | VERIFIED | P1 | Registro público de correções | Página com cada correção feita: o que estava errado, o que mudou, quando e a fonte | PROV-03 |
| IAF-01 | BLOCKED | P2 | Recursos de IA | Perguntas em linguagem simples sobre os dados, sempre com citação. Bloqueio: sem chave de IA no ambiente | IA-01 |
| PERFM-01 | NOT_STARTED | P2 | Desempenho | Medir tamanho das páginas e do JavaScript, tempo de carga no celular; listas grandes paginadas no servidor | |
| SEG-01 | IMPLEMENTED | P2 | Segurança | Cabeçalhos de segurança (CSP e outros), revisão do `npm audit` (9 avisos em dependências de desenvolvimento), entradas validadas nas rotas de API | |
| CHAVE-01 | BLOCKED | P1 | Chave do Portal da Transparência | A pessoa enviou uma chave; ela deve ficar só no segredo `PORTAL_TRANSPARENCIA_API_KEY` do GitHub, nunca no código. Esperando autorização para gravar o segredo | |

### 4.8 Provas de cada item conferido

| ID | Prova |
|---|---|
| VOT-01 | `src/lib/votos.test.ts`, “normalizes every house code seen in real data and keeps the original” (16 códigos reais + código desconhecido) e “counts groups that match the official totals”. Código: `CATEGORIAS_VOTO` e `rotuloVoto` em `src/lib/linguagem.ts`. |
| VOT-02 | Teste “tapping a total shows only that group...”. Navegador (2026-10-12, Chromium sem interface): tocar em “Não” em `/votacao/cam-106701-223` leva a `?voto=nao` e “Mostrando 1 de 429 pessoas”; tecla Enter no primeiro total em `/votacao/sen-7016` leva a `?voto=sim` (“Mostrando 36 de 81”). Atalhos “Quem votou Sim/Não” no cartão do resultado. |
| VOT-03 | Teste “hides one group and brings it back”. Navegador: botão do olho “Mostrar quem teve Sim” leva a `?voto=sim,nao`; chips removíveis e “Mostrar todos de novo” na tela. A legenda do plenário usa a mesma função (`alternar`). |
| VOT-04 | Teste “never changes the totals when filtering”. Na tela, os totais ficam fixos com a linha “X com os filtros” e o texto “Mostrando X de Y pessoas”. |
| VOT-05 | Capturas de tela: lista (claro), detalhes (escuro), por partido, celular 390 px sem rolagem lateral (`scrollWidth` igual à largura). Linha com foto, nome com link, partido, estado, voto com explicação; modo detalhes mostra o código original quando é diferente do rótulo. |
| VOT-06 | Teste “round-trips through the address and ignores junk” e “sorts deterministically”. Navegador: voltar no histórico restaura `?voto=nao` e a lista. HTML estático da página já traz a lista completa (sem depender de JavaScript). |
| VOT-07 | Teste “groups by party alphabetically and keeps each person's vote”. Tela `?visao=partido&partido=PT`: barra com todos os tipos de voto, “Partido pediu: Sim” separado dos votos, botão “Ver só este partido”. |
| VOT-08 | Partido da época: teste “builds one row per person with the party of the vote day”. “Sem voto registrado” agora vem do histórico de exercício da Câmara (`marcarSemRegistro` em `pipeline/build.ts`, testes em `pipeline/tests/core.test.ts`). Falta: a próxima coleta publicar o campo `semRegistro` e conferir na tela. |
| TEMA-01 | `src/components/Tema.tsx` e `src/lib/tema.ts`. Navegador: o botão alterna “igual ao aparelho”, claro e escuro, com nome acessível que diz o estado e o próximo; depois de recarregar, `data-theme="dark"` já está no documento antes do React (script no `<head>`, antes do `<body>`). |
| VOT-10 | Regra pública `explicarEtapa` (testes “linguagem” em `src/lib/congresso.test.ts`); no catálogo, “Esconder pedidos sobre o andamento”; no perfil e na votação, a marca “sobre o andamento, não sobre o conteúdo”. |
| VOT-11 | Catálogo `/votacoes`: busca, casa, resultado, novo filtro “Quando” (30 dias, 3 meses, 12 meses, contados a partir da votação mais recente dos dados: 10, 27 e 213 projetos em 2026-10-12), assuntos, paginação comum com links. Critérios dos assuntos publicados em `/como-funciona#assuntos`, lidos da mesma lista que classifica (`termos` em `src/lib/assuntos.ts`). A troca para listas de palavras corrigiu 16 de 212 projetos que caíam em assuntos errados (“agricultura” contava como “cultura”; “partidos” como “direitos”). |
| VOT-12 | `src/components/ListaVotos.tsx` com `filtrarVotosDoPerfil` (testes “votos no perfil”). Navegador em `/politico/dep-104552`: “Não” leva a `?voto=nao` (67 de 262), “Diferente do partido” a `?voto=contra-partido` (16), assunto “Impostos” a `?assunto=impostos` (58); “Mostrar todos de novo” limpa. O link “Votou diferente do partido 16 vezes” abre a lista filtrada. |
| VOT-09 | `explicarSituacao` em `src/lib/linguagem.ts` (teste “says a bill became law only when the house says so”). Página `/votacao/cam-106701-223` conferida: “E o projeto, como está? Foi para o Senado”, com o texto original da Câmara, a data da conferência e o aviso “Ser aprovado nesta votação não quer dizer que já virou lei”. Autores do projeto levam ao perfil quando a pessoa é conhecida. |
| CONT-01 | Perfil dividido em Contato, Redes sociais, Sites oficiais e institucionais, Fontes e transparência, Sobre os dados. Ícones das redes do Simple Icons (licença CC0, versão fixa 16.32.0), em uma cor só; LinkedIn e Kwai usam ícone genérico porque o Simple Icons não publica a marca. Teste `src/lib/redes.test.ts` (ordem fixa e sem repetição; formulário de correção com a página preenchida). Conferido nos dois temas (`dep-104552` claro, `sen-5672` escuro). |
| PRES-01 | Implementado, falta dado real. Coleta: `coletarCandidaturasPresidente` lê só o arquivo nacional (`_BR`) de cada eleição geral; `agruparPresidenciaveis` junta a mesma pessoa entre anos por título, CPF ou nascimento e nome, mantém o perfil de quem já é acompanhado e cria um id `pres-` que não revela documento; a vida inteira dessas pessoas entra na mesma varredura do TSE, com bens e contas. Atos: medidas provisórias e projetos do Executivo dos arquivos anuais da Câmara. Página `/presidencia` e `/presidencia/[id]`, “Presidência” na navegação e nas perguntas. Testes: “TSE Presidency” em `pipeline/tests/fontes.test.ts` (arquivo nacional, 2º turno, união de chaves, id sem documento, ordem sem ranking) e “Presidência” em `src/lib/votos.test.ts` (quem está no cargo antes e depois da posse). Conferido no navegador com dados fictícios (`npm run demo`), claro e escuro, 1280 px e 390 px sem rolagem lateral; com os dados reais atuais a página mostra o aviso de dados ainda não coletados. Falta: execução completa do TSE publicar `presidencia.json`. |
| PL-01 | Primeiro autor e coautor pela ordem de assinatura dos arquivos da Câmara (teste de contrato atualizado), contagem por papel no perfil, lista com filtros (papel, tipo, texto), situação em palavras simples e paginação comum. Conferido em `/politico/dep-104552` (“Viraram lei” mostra 3 de 95). Falta: os dados reais ganharem o campo `papel` na próxima coleta; histórico de tramitação passo a passo (hoje há o link para a tramitação completa). |
| PERF-01 | `coberturaDoPerfil` (`src/lib/cobertura.ts`, testes em `src/lib/cobertura.test.ts`) e o cartão “O que encontramos sobre…” no resumo de cada perfil, com quatro estados (completo, parcial, sem dados, não se aplica) e o motivo de cada lacuna, reaproveitando os motivos de `metricas.ts`. Conferido em `dep-104552` e `est-ac-10001601427`. |
| CNPJ-01 | `src/lib/cnpj.ts` (normaliza, confere os dígitos, formata, aceita o CNPJ alfanumérico da IN RFB 2.229/2024 em vigor desde julho de 2026) com testes em `src/lib/cnpj.test.ts`, inclusive o exemplo oficial `12.ABC.345/01DE-35`. Usado pelo pipeline em gastos e contas de campanha. |
| PRIV-01 | Achado na auditoria: CPFs de fornecedores pessoas físicas da cota parlamentar eram publicados (167 em 4.976 fornecedores de 600 perfis). Corrigido: `documentoPublicavel` só deixa passar CNPJ válido, no pipeline (`metrics.ts`, `build.ts`, `tse-contas.ts`) e na tela (perfil e `/gastos`); o alerta de dígito inválido não mostra mais o CPF. Os arquivos atuais saem limpos na próxima coleta. |
| CNPJ-02 | Pipeline `pipeline/empresas.ts` (`montarEmpresas`): junta cota parlamentar (Câmara, Senado, assembleias) e contas de campanha completas por CNPJ (`registrosComCnpj` em `tse-contas.ts`, sem o corte dos 10 maiores), sem contar duas vezes (registros iguais de pessoa, ano e papel somados uma vez). Publica `empresas.json` e `empresas/{2 primeiros caracteres}.json`. Páginas `/empresas` (busca por nome, CNPJ inteiro ou pedaço, filtro por tipo de ligação, paginação comum) e `/empresa/[cnpj]`. Testes “companies by CNPJ” em `pipeline/tests/core.test.ts`. Conferido com dados fictícios. Falta: dados reais (próxima coleta completa). |
| CNPJ-03 | Só CNPJ válido e igual cria ligação; nome nunca liga. Testes: `montarEmpresas` ignora CPF e CNPJ inválido; `conferir` em `src/lib/grafo.ts` não confirma ligação sem prova nem com CNPJ inválido (“never confirms a link without evidence or with an invalid CNPJ”). Nomes de MEI publicados sem o CPF (`limparNomeEmpresa`, testado). “Ligações possíveis” por nome não são mostradas: decisão para não induzir acusação. |
| GRAFO-01 | `/relacoes` com `MapaRelacoes` (d3-force 3.0.0, licença ISC, posição inicial determinística): tipos de nó (pessoa, empresa, partido, destino de emenda) com formas diferentes, ligações com cor e tracejado por tipo, filtros por tipo, painel lateral com provas, “Mostrar as ligações” busca em `/api/relacoes`, busca por nome ou CNPJ, visão em lista (tabela com prova de cada ligação), nós focáveis por Tab e escolhidos com Enter, rótulos só nos itens principais quando o mapa está cheio, no máximo 40 ligações por item no mapa (todas na lista). Testes em `src/lib/grafo.test.ts`. Conferido no navegador com dados fictícios: 7 nós no início, 47 depois de abrir uma empresa, 275 linhas na lista, 4 sugestões na busca, sem erros no console. Falta: dados reais e conferência com leitor de tela. |
| EMD-01 | `pipeline/sources/emendas.ts`: plano de ação, empenho (`empenho_especial`), documento hábil (`documento_habil_especial`) e ordem bancária (`ordem_pagamento_ordem_bancaria_especial`) do Transferegov, ligados pelos ids que a própria fonte publica (`cicloPorPlano`); cancelados e estornados ficam fora; só conta como pago o documento com ordem bancária emitida. Se essas tabelas falharem, fica só o indicado, com aviso. Portal da Transparência (com chave) usa empenhado e pago publicados. Perfil mostra “Do indicado ao pago” (`CicloEmenda`) e o pago de cada destino. Testes: “Emendas Pix lifecycle” (contrato, inclusive falha) em `pipeline/tests/fontes.test.ts`. Conferido com dados fictícios. Falta: dados reais (nomes das tabelas e colunas conferidos na documentação OpenAPI do Transferegov em 2026-10-12). Liquidação não é mostrada à parte: a fonte não separa liquidação de pagamento nas transferências especiais. |
| EMD-02 | Índice de destinos (`destinosEmendas` em `pipeline/build.ts`, `emendas.json`), um por governo recebedor (CNPJ quando publicado, senão nome e estado: `chaveDestino` em `src/lib/emendas.ts`, usada pelo pipeline e pelos links). Página `/emendas` com busca por cidade, filtro por estado, soma das etapas, paginação comum e a página de cada destino com quem mandou. Teste “indexes each place with every author” (mesmo CNPJ com dois nomes vira um lugar). Correção de identidade: autor de emenda com nome igual ao de dois políticos não é ligado a nenhum (`vincularAutores`, testado). |
| DS-01 | Contraste medido no navegador para cada par de tokens nos dois temas (2026-10-12). Ajustes: `--ink-3` do tema claro mais escuro (`--neutro-550`), Sim e Não do tema claro mais escuros (#10704b e #b13a0a, 5,3:1 e 5,2:1 sobre o fundo suave), texto sobre as cores de voto passa a ser um token (`--on-voto`: branco no claro, quase preto no escuro, mínimo 6,1:1 e 6,0:1). |
| A11Y-01 | Automático: `npm run a11y` (`scripts/acessibilidade.mjs`, axe-core 4.10.2, regras WCAG 2.2 A e AA) em 12 páginas nos dois temas: 0 violações depois das correções (antes: contraste, `nested-interactive` no plenário, `aria-label` proibido na paginação, área de toque pequena nos links de redes). Falta: teste manual com leitor de tela (NVDA/VoiceOver) e zoom de 200%; o ambiente não tem leitor de tela. |
| DOC-01 | `docs/telas/{inicio,votacao,plenario,perfil,celular}.png` capturadas do site rodando com os dados reais publicados (2026-10-12), sem o indicador de desenvolvimento, e otimizadas. |
| PROV-02 | Quatro marcas (`NATUREZAS` em `src/lib/linguagem.ts`, `SeloNatureza`): Dado oficial, Cálculo do site, Ligação feita pelo site, Feito por IA. Em cada seção do perfil, na lista de votos, nos cartões de métrica, na explicação de cada projeto e nas ligações de empresas; explicadas em `/dados`. Varredura de acessibilidade continua sem violações. |
| TAB-01 | Decisão: adotar TanStack Table 8.21.3 (MIT, sem estilo próprio, cabe nos componentes do site). Primitivo `src/components/tabela/TabelaDados.tsx`: esconder e mostrar colunas, arrastar para mudar a largura (duplo clique volta ao tamanho original), ordenação pelo endereço (no servidor, `aria-sort` no cabeçalho), baixar a lista inteira em CSV, escolhas lembradas no aparelho (com proteção se o navegador bloquear), cartões no celular. Em uso em `/politicos` e nas páginas de estado. Colunas de métricas vêm de `metricas.ts`. Conferido no navegador: ordenar por gastos muda o endereço, ligar “Patrimônio declarado” acrescenta a coluna e ela continua depois de recarregar, CSV de `/api/politicos` traz as 11 linhas filtradas mais o cabeçalho; acessibilidade sem violações. |
| PAG-02 | `Paginacao` comum em votos da votação, votos do perfil, projetos do perfil, catálogo de votações, políticos, falas, empresas e emendas. Nenhuma paginação própria restante (`grep` por “Próxima” só acha o componente comum). |
| CARD-01 | Lista de políticos com busca por nome, foto, cargo, partido com nome completo, estado e todas as métricas disponíveis como colunas opcionais. Falta: cobertura de dados na própria lista. |
| PART-04 | `filiacoesNoTempo` em `src/lib/carreira.ts` junta os pontos em que um registro mostra o partido (candidaturas do TSE, partido gravado em cada voto, cadastro atual) e forma trechos; entre registros nada é suposto (teste “joins records with the same party and never fills gaps”). O pipeline agora grava o partido de cada voto no perfil (`VotoItem.partido`). Cartão “Partido ao longo do tempo” na vida pública. Falta: dados reais com o partido por voto (próxima coleta). |
| HIST-01 | `eleicoes.json` (`indiceDeCandidaturas` em `pipeline/build.ts`, testado) e página `/eleicoes`: escolher o ano, filtrar por cargo, estado, nome e resultado (contagens clicáveis), partido **daquela** eleição, resultado no gênero da pessoa, paginação comum. Diz com clareza que mostra só as pessoas acompanhadas e quem disputou a Presidência. Conferido com um índice gerado localmente a partir dos perfis publicados (2018, deputado federal, SP: 52 candidaturas, 40 eleitos, partidos de 2018 como PPS e DEM). O arquivo real sai na próxima coleta. |
| CORR-01 | `src/lib/correcoes.ts` e página `/correcoes` (no rodapé), com as 6 correções reais feitas em 2026-10-12, botão para avisar um erro (formulário com a página preenchida) e link para o histórico público. Regra nova no AGENTS.md: toda correção do que o site mostrou entra no registro. |
| NAV-01 | Presidência no menu principal; no celular, barra com Início, Votações, Presidência e “Mais”, que abre todas as seções agrupadas (Quem são, Dinheiro, Entender), fecha com Esc, com toque fora ou ao navegar; rodapé lista Mapa de relações, Empresas, Emendas por cidade, Eleições e Correções. Conferido a 390 px. |
| LAY-01 | Páginas até 1440 px (antes 1180), margens maiores no computador, textos corridos continuam com largura de leitura confortável; listas de cartões com 4 colunas a partir de 1280 px (votações, quem votou, perguntas, membros do partido, candidatos à Presidência, perfil). Conferido em 1440 e 1920 px (início, perfil, votação, votações). Menu do celular em LAY/NAV-01. |
| TAB-02 | Cabeçalhos de tabela refeitos a pedido (2026-10-12): uma receita só (`.tabela` e `.tabela-caixa` em `globals.css`) para as 10 tabelas do site. Cabeçalho fixo ao rolar, faixa mais escura, texto semibold que quebra em duas linhas em vez de esticar a tabela, números à direita no cabeçalho e nas células, primeira coluna fixa ao rolar para o lado, célula inteira como botão de ordenar com seta, coluna ordenada destacada, caixa de rolagem focável pelo teclado. Seletor de colunas refeito: painel que aplica na hora e fecha com Pronto, Esc ou clique fora; mostra “Colunas (11 de 15)”. Corrigido o defeito relatado: colunas ligadas sumiam para fora da tela porque todas tinham largura fixa; agora a largura só muda depois de arrastar. Conferido no navegador (3 colunas ligadas aparecem, painel fecha nos três jeitos) e `npm run a11y` sem violações nas páginas com tabela. |
| SEG-01 | Cabeçalhos de segurança no site publicado (CSP restrita ao próprio site, sem incorporar em outras páginas, nosniff, Referrer-Policy, Permissions-Policy), conferidos com `next start`. `npm audit`: 9 avisos, todos em ferramentas de desenvolvimento (drizzle-kit, eslint-config-next); a correção sugerida é rebaixar versões, então ficam registrados e não vão para o site. Falta: validar entradas das rotas de API com testes. |
| PAG-01 | Testes de `src/lib/paginacao.ts` (fatiar, limitar página fora do intervalo, números com reticências, leitura defensiva). Componente `src/components/Paginacao.tsx` em uso na lista de votos. |

## 5. Fontes, documentação e licenças

| Fonte | Uso | Documentação |
|---|---|---|
| Câmara dos Deputados | Deputados, votos, presença, gastos, proposições | https://dadosabertos.camara.leg.br/swagger/api.html |
| Senado Federal | Senadores, votos, gastos, matérias | https://legis.senado.leg.br/dadosabertos/docs/ |
| TSE | Candidaturas desde 1994, bens, contas, redes | https://dadosabertos.tse.jus.br |
| Transferegov | Emendas Pix | https://api.transferegov.gestao.gov.br/transferenciasespeciais/ |
| Portal da Transparência | Emendas parlamentares | https://portaldatransparencia.gov.br/api-de-dados |

Os dados públicos do governo federal seguem a Lei de Acesso à Informação (Lei 12.527/2011) e podem ser reutilizados citando a fonte.

## 6. Decisões

- **DEC-01 (2026-10-12):** sem shadcn/ui. Os componentes próprios e os tokens já cobrem o que a especificação pede; trocar a base agora geraria retrabalho sem ganho para quem usa.
- **DEC-02 (2026-10-12):** filtros da lista de votos vivem no navegador, com estado na URL. Uma votação tem no máximo 513 votos, então filtrar no cliente é rápido e não exige servidor. Listas grandes (todas as votações, todos os políticos) seguem com dados pré-calculados.
- **DEC-03 (2026-10-12):** “Sem voto registrado” é uma categoria própria: pessoas que a Câmara registra como em exercício no dia da votação e que não aparecem na lista oficial. A fonte não diz o motivo, então não chamamos de falta. Antes, a lista usava quem está no cargo hoje, o que incluía quem só assumiu depois (546 pessoas numa casa de 513). No Senado a lista oficial já nomeia cada senador com um código (licença, missão, ausência), então não acrescentamos ninguém.
- **DEC-04 (2026-10-12):** um só agrupamento de votos para tudo (`src/lib/votos.ts`): totais, lista, plenário, legenda e partidos usam as mesmas categorias. Isso corrigiu o plenário, que contava licenças e “presidindo” como “abstenção ou obstrução”.
- **DEC-05 (2026-10-12):** cores de partido. O PRODUCT.md decidiu não usar cor de partido nos gráficos, para nenhuma tela parecer favorecer um lado. A especificação pede cores oficiais. Proposta para PART-01: cor oficial só no selo do partido (pequeno, sempre com a sigla), nunca como cor de gráfico ou de plenário.

## 7. Resultados de testes

| Data | Comando | Resultado |
|---|---|---|
| 2026-10-12 | `npm run lint`, `tsc --noEmit`, `vitest run` | sem erros; 89 testes passando |
| 2026-10-12 | `npm run lint`, `tsc --noEmit`, `vitest run`, `npm run build` | sem erros; 107 testes passando; build com as 351 votações estáticas |
| 2026-10-12 | `npm run lint`, `tsc --noEmit`, `vitest run` | sem erros; 111 testes passando |

## 8. Registro de progresso

- **2026-10-12 (12):** redesenho pedido: páginas mais largas (LAY-01), cabeçalhos e seletor de colunas refeitos (TAB-02), menu “Mais” no celular (NAV-01), eleições (HIST-01), correções públicas (CORR-01), partido no tempo (PART-04), cabeçalhos de segurança (SEG-01). Execução de dados de 19:19 em andamento; a anterior “terminou” sem publicar e agora isso vira falha com o nome da etapa.
- **2026-10-12 (11):** acessibilidade automática zerada nas páginas principais (A11Y-01) e contraste dos tokens (DS-01). Execução de dados anterior bloqueada pela verificação “cada pessoa aparece uma vez” (deputado do AC repetido pelo SAPL): corrigido e testado; nova execução completa disparada.
- **2026-10-12 (10):** emendas do indicado ao pago (EMD-01) e por cidade (EMD-02).
- **2026-10-12 (9):** empresas por CNPJ (CNPJ-02/03) e mapa de relações (GRAFO-01). Fornecedores e doadores com CNPJ viram links para a página da empresa. Pergunta nova sobre empresas. `npm audit` aponta 9 vulnerabilidades em dependências de desenvolvimento já existentes (registrar em SEG-01).
- **2026-10-12 (8):** CNPJ-01 e correção de privacidade (PRIV-01).
- **2026-10-12 (7):** cobertura por seção no perfil (PERF-01). Achado: nomes de deputados estaduais vindos do TSE aparecem em maiúsculas (ex.: “PABLO BREGENSE”); registrar e corrigir na coleta das assembleias.
- **2026-10-12 (6):** identidade de partido sem cor (PART-02); cores ficam bloqueadas (PART-01).
- **2026-10-12 (5):** Presidência (PRES-01) e autoria (PL-01). Pergunta nova em `perguntas.ts`, README e PRODUCT.md. Próximo: PART-01/02, PERF-01, conferir a execução de dados.
- **2026-10-12 (4):** seção de contato refeita (CONT-01); situação do projeto depois da votação (VOT-09); endereços do projeto definidos uma vez (`src/lib/site.ts`).
- **2026-10-12 (3):** botão de tema; votos do perfil com filtros na URL e paginação; catálogo com período e paginação comum; critérios de assunto e tipos de voto publicados em “Como funciona”. O pipeline deixou de gravar “Ausente” para quem não tem registro (agora grava vazio, lido como “sem voto registrado”; arquivos antigos com “Ausente” são lidos do mesmo jeito). Próximo: CONT-01, PART-01/02, PRES-01, PERF-01.
- **2026-10-12 (2):** lista “Quem votou como” na página da votação (`src/components/PainelVotos.tsx`): totais que filtram, esconder e mostrar grupos, plenário aceso pelo filtro, busca, partido, estado, ordem, três visões, paginação e tudo na URL. Plenário corrigido (o filtro de destaque não apagava as cadeiras por causa da animação; agora usa `fill-opacity`). Código antigo `VotosNominais.tsx` removido. Próximo: TEMA-01, VOT-10/11 (catálogo), VOT-12 (votos no perfil).
- **2026-10-12:** rastreador criado a partir da auditoria do código e dos dados reais. Trabalho anterior enviado (vida pública, contas de campanha, “Como sabemos disso?”, “Quem resolve”). Erros do pipeline agora aparecem como anotações. Nova execução completa do TSE disparada. Próximo passo: VOT-01 a VOT-08.
