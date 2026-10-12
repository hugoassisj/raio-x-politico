# Raio-X Político: o que é, para quem é e como decidimos

## Em poucas palavras

O Raio-X Político é um site gratuito e sem partido que mostra o que fazem senadores, deputados federais e deputados estaduais: se vão trabalhar, como votam, o que propõem, quanto gastam e o que dizem. E também a vida pública inteira de cada um: todas as candidaturas desde 1994, os partidos por onde passou, os bens declarados em cada eleição e quem pagou cada campanha. Tudo em palavras simples, com o link do site oficial de onde cada número veio.

Este documento explica **por que** o site é como é. Ele começa simples (o problema, para quem é, que perguntas responde, nossos princípios) e vai ficando técnico no final (cálculos, fontes, arquitetura). Toda mudança importante entra, com data, no [Registro de decisões](#registro-de-decisões), no fim.

## Visão

Ser o lugar onde qualquer pessoa no Brasil entende, em poucos segundos, o que fazem as pessoas que ela elegeu e quem elas são ao longo da vida pública: se aparecem para trabalhar, como votam, o que propõem, quanto gastam, para onde mandam dinheiro, quem financiou suas campanhas e o que dizem. Com tudo verificável na fonte oficial, sem opinião e sem partido.

A ambição de longo prazo é cobrir **todas as pessoas que já disputaram uma eleição no Brasil**, de vereador a Presidente. Hoje o site acompanha os parlamentares em exercício e, para cada um deles, a vida pública completa. O caminho para chegar a todos está no [Roadmap](#roadmap).

## O problema

Os dados existem e são públicos, mas estão espalhados em dezenas de sites (Câmara, Senado, TSE, Transferegov, Portal da Transparência, 27 assembleias), em formatos técnicos, com nomes de campos internos e sem comparação entre pessoas. Quem quer saber "meu deputado vai trabalhar?" desiste antes de chegar à resposta. Quem chega, raramente consegue comparar com os colegas ou conferir de onde veio o número.

## Para quem

| Pessoa | O que precisa | Como o produto atende |
|---|---|---|
| Cidadã no celular, pouco tempo, pouca familiaridade com política | Saber em 10 segundos quem a representa e se essa pessoa trabalha | Página inicial "Quem te representa?", mapa de estados, frase-resumo em linguagem simples no topo de cada perfil |
| Eleitor em período eleitoral | Comparar candidatos e ver coerência entre discurso e voto | Comparador lado a lado, votos em comum onde divergiram, "Diz e faz" nos resumos de IA |
| Jornalista, pesquisador, organização da sociedade civil | Ir fundo, baixar dados, auditar metodologia | Toda métrica com "Como calculamos", link para o registro oficial, JSON bruto por página, código aberto |
| Assessorias e os próprios parlamentares | Conferir e corrigir informações | Fontes visíveis e canal para reportar erros |

## Perguntas que o site responde

A lista fica em um só lugar do código, [`src/lib/perguntas.ts`](src/lib/perguntas.ts), e aparece na página inicial, na página [“O que é o Raio-X Político”](src/app/sobre/page.tsx) e no README. Se o site deixar de responder uma delas, a lista está errada ou o site está.

| Pergunta | Onde o site responde |
|---|---|
| Quem me representa? | Mapa da página inicial e página de cada estado |
| O que foi votado e o que muda para mim? | Votações agrupadas por projeto e por assunto, explicadas em palavras simples; em cada votação, tocar em Sim ou Não mostra quem votou de cada jeito |
| Quem resolve o problema da minha rua? | “Quem resolve isso?” na página Como funciona: cidade, estado ou país, e quem cobrar |
| Meu deputado vai trabalhar? | Perfil: presença nas sessões e votos registrados, ao lado dos colegas |
| Quem pagou a campanha? | Perfil, seção Dinheiro das campanhas: quanto arrecadou, quanto foi dinheiro público, quem mais doou e com quem mais gastou |
| Que cargos já disputou e por quais partidos passou? | Perfil, seção Vida pública: todas as candidaturas desde 1994, com resultado, partido e bens declarados |
| Como votaram os representantes do meu estado? | Em cada votação, depois de escolher o estado uma vez |
| Quantos votos uma lei precisa para passar? | Cartão “Quantos votos precisava?” em cada votação e a página Como funciona |
| Quanto gastam da verba do mandato, e com o quê? | Página de gastos e cada perfil, com a nota fiscal de cada despesa |
| Quem a eleição colocou na Presidência? | Página da Presidência: todas as eleições para Presidente desde 1994, a vida pública de quem disputou e os atos que o Executivo mandou ao Congresso |
| Meu partido vota com o governo? Vota unido? | Página de partidos e de cada partido |
| Para onde mandam dinheiro do orçamento? | Emendas no perfil |
| Que empresas recebem dinheiro ligado a cada político? | Páginas de empresas (por CNPJ) e o Mapa de relações, com a prova de cada ligação |
| O que andam dizendo? | Página de falas, com busca por tema |
| Como um político se compara com outro? | Comparador de até 4 pessoas |

## Princípios (não negociáveis)

1. **Todo número tem fonte.** Cada valor exibido leva ao registro oficial e ao arquivo bruto. Se não dá para rastrear, não publicamos.
2. **Fatos, não notas.** Mostramos onde a pessoa fica em relação aos colegas (o valor típico da casa e a faixa onde está a maioria), nunca nota, selo de "bom" ou "ruim", ou ranking de "melhores". Faltar, gastar ou seguir o partido podem ter boas explicações.
3. **Comparação justa.** Só comparamos pessoas da mesma casa. Gastos são comparados com colegas do mesmo estado, porque o teto da cota muda conforme a distância até Brasília.
4. **Ausência de dado nunca vira zero.** Quando falta dado, mostramos "–" e explicamos por quê.
5. **IA com rédea curta.** A IA só resume registros públicos fornecidos a ela. Toda afirmação precisa citar um registro existente, senão é descartada automaticamente. Todo texto de IA vem rotulado.
6. **Sem raspagem de redes sociais.** Perfis vêm do que o próprio político declarou à Câmara ou ao TSE. Conteúdo só entra por API oficial da plataforma.
7. **Profundidade em camadas.** Primeiro a resposta simples (frase e números grandes), depois a explicação ("Como calculamos"), depois a fonte e o dado bruto. Ninguém é obrigado a descer, todos podem.
8. **Simples de verdade.** Escrevemos para quem lê pouco: frases curtas, palavras do dia a dia, nenhuma sigla sem explicação. Se uma pessoa sem estudo não entende uma tela, a tela está errada.
9. **Acessível de verdade.** Funciona em celular simples e sem JavaScript nos fluxos principais, cores de votos validadas para daltonismo e sempre acompanhadas de texto, navegação por teclado, contraste adequado e modo escuro.
10. **O mesmo padrão para todos.** As mesmas regras de coleta, cálculo, destaque e correção valem para qualquer pessoa, de qualquer partido. A neutralidade está no processo (código aberto e testado), não só nesta página.
11. **Melhor faltar do que errar de pessoa.** Ligar o registro de uma pessoa a outra é o erro mais grave possível. Quando a identidade é duvidosa, a informação fica de fora e o limite é explicado.
12. **Ligação não é acusação.** Uma doação, um fornecedor em comum ou um gasto fora do padrão são fatos para conferir, nunca prova de irregularidade. Toda relação mostra os registros que a sustentam, e a conclusão fica com quem lê.

## Design e experiência

Referências: a Política Nacional de Linguagem Simples (Lei 15.263/2025), as recomendações de usabilidade para pessoas com pouca leitura do guia Health Literacy Online (ODPHP), a escala de 12 passos do Radix Colors para papéis de cor, o Design Tokens Community Group para a organização dos tokens e os princípios táticos de hierarquia do Refactoring UI.

**Fluxos que guiam cada tela**

1. *Quem me representa?* Busca ou mapa na primeira tela. O estado escolhido fica salvo só neste aparelho e passa a abrir as respostas sobre "os seus".
2. *O que votaram?* As pessoas pensam em projetos, não em votações. A lista agrupa todas as votações de um projeto, mostra o assunto em palavras simples e o resultado do texto principal.
3. *O que essa votação significa?* Cada votação começa pelo "do que se trata" em linguagem simples, depois o que foi decidido nesta etapa (com o que significava votar Sim e votar Não), quantos votos eram precisos e como votaram os representantes do seu estado. Plenário, partidos e a lista completa vêm depois.
4. *Quem é essa pessoa, de verdade?* O perfil começa pelo resumo e pelos números do mandato, e desce para a vida pública inteira: cada candidatura desde 1994, cada troca de partido, os bens de cada eleição e o dinheiro de cada campanha.
5. *Quem resolve o meu problema?* A pessoa digita o problema (buraco, polícia, aposentadoria) e descobre se é da cidade, do estado ou do país, e quem cobrar.
6. *Posso confiar?* Todo número tem o mesmo cartão “Como sabemos disso?”: o que é, o período, como calculamos, o que o número não diz, a fonte oficial, quando os dados foram coletados e se estão completos, parciais ou indisponíveis. O texto oficial fica sempre a um toque.

**Regras de escrita**

- Frases curtas, ordem direta, voz ativa, palavras do dia a dia (Lei 15.263/2025).
- Termos técnicos aparecem como estão no texto oficial, sublinhados; um toque explica o termo. O glossário é um só (`src/lib/linguagem.ts`) e alimenta as explicações e a página "Como funciona".
- Votações sobre o andamento (pedidos de urgência, adiamento, retirada de pauta) são marcadas como tal, para ninguém ler um voto de procedimento como voto sobre o conteúdo.
- Códigos das casas viram palavras: "Artigo 17" é "Presidindo" (quem preside a sessão da Câmara não vota), "P-NRV" é "Presente, não votou", "LS" é "Licença de saúde". Uma ausência justificada nunca aparece como falta comum.
- Cobertura dita em voz alta: quando um dado não existe para uma casa (por exemplo, a presença nas assembleias), o cartão diz isso e por quê, em vez de mostrar um espaço vazio.

**Tokens de design** (`src/app/globals.css`)

- Três camadas: primitivos (escalas em OKLCH, nunca usados direto), semânticos (papel: página, cartão, texto, borda, destaque, votos) e receitas de componente (`.cartao`, `.chip`, `.botao`).
- Neutros levemente azulados em vez de cinza puro. Cor saturada só com significado: azul para o que se pode tocar ou está selecionado, verde, laranja e roxo para Sim, Não e outros votos, amarelo para o fato principal da tela. Cores de partidos são evitadas de propósito.
- Movimento curto e calmo (120 a 480 ms): cartões que sobem ao entrar, barras e cadeiras que crescem, um ponto pulsando ao lado da última atualização. Tudo desliga com `prefers-reduced-motion`.

## O que existe hoje

| Página | O que a pessoa encontra |
|---|---|
| O que é o Raio-X Político (`/sobre`) | O que o site faz, por que existe, que perguntas responde, o que ele não é e por que dá para confiar |
| Página inicial (`/`) | Quem me representa (mapa do Brasil)? Como está dividido o Congresso hoje? O que foi votado e dito recentemente? |
| Cada estado (`/estado/mg`) | Quem são os 3 senadores, os deputados federais e os estaduais do meu estado? |
| Perfil de cada político (`/politico/...`) | O que essa pessoa faz: presença, votos, gastos, projetos, emendas e falas; a vida pública inteira (todas as candidaturas desde 1994, trocas de partido, bens de cada eleição); o dinheiro de cada campanha; redes e fontes |
| Presidência (`/presidencia`) | Quem a última eleição colocou no cargo, todas as eleições para Presidente desde 1994, a vida pública de cada candidato (`/presidencia/...` para quem não tem perfil no site) e as medidas provisórias e projetos que o Executivo mandou à Câmara |
| Empresas (`/empresas` e `/empresa/...`) | Empresas e entidades pagas com a cota parlamentar ou ligadas a campanhas, sempre pelo CNPJ válido; quem pagou, quanto, quando, e a nota fiscal mais recente |
| Mapa de relações (`/relacoes`) | Pessoas, empresas, partidos e cidades ligados só por registros oficiais; tocar mostra a prova de cada ligação, “Mostrar as ligações” vai mais longe; também em forma de lista |
| Lista de políticos (`/politicos`) | Lista de todos, filtrável por casa, estado e partido, ordenável por qualquer critério |
| Votações (`/votacoes`) | O que foi votado, agrupado por projeto e por assunto, em linguagem simples |
| Cada votação (`/votacao/...`) | Do que se trata o projeto, o que foi decidido nesta etapa, como o projeto está agora (sem dizer que virou lei antes da hora), quantos votos eram precisos, como votaram os representantes do seu estado, todas as votações do mesmo projeto, e “Quem votou como”: totais que filtram a lista e acendem as cadeiras do plenário, grupos que dá para esconder, busca, partido, estado, visão por partido, tudo guardado no endereço da página |
| Gastos (`/gastos`) | Quanto se gasta da cota, em quê, com quais fornecedores, e o que merece um segundo olhar |
| Falas (`/falas`) | O que disseram sobre um tema, com link para o registro original |
| Comparar (`/comparar`) | Até 4 pessoas lado a lado, incluindo votações em que divergiram |
| Partidos (`/partidos`) | Tamanho de cada partido nas duas casas, se costuma votar com o governo e se vota unido |
| Cada partido (`/partido/PL`) | Onde o partido senta no plenário, membros com foto, medianas comparadas com a casa e votações recentes |
| Como funciona (`/como-funciona`) | Quem resolve cada problema do dia a dia, o que faz cada cargo (de vereador a Presidente), como uma ideia vira lei e quantos votos cada proposta precisa, desenhado no plenário |
| Cruzamentos de dados (`/analises`) | Cruzamentos simples (gasto x presença, experiência x presença, governo x unidade), sempre dizendo que relação não é causa |
| Sobre os dados (`/dados`) | Fontes, situação da última coleta, verificações feitas antes de publicar, arquivos oficiais usados com a impressão digital (SHA-256) de cada um, metodologia, limites e salários |

## Métricas

_Daqui para baixo o documento fica técnico: é para quem quer conferir os cálculos ou ajudar no código._

A definição oficial de cada métrica mora em um único lugar do código, [`src/lib/metricas.ts`](src/lib/metricas.ts), e é a mesma explicação exibida nos cartões, nas listas e na página `/dados`. Resumo:

| Métrica | Casas | Regra |
|---|---|---|
| Presença | Câmara, Senado | Sessões deliberativas do Plenário com presença registrada desde o início do exercício atual (Câmara); dias com votação nominal com voto ou presença registrada (Senado). Últimos 12 meses |
| Votações nominais | Câmara, Senado | Votações nominais com voto registrado dividido pelas votações ocorridas em exercício |
| Segue o partido | Câmara, Senado | Método da aderência (Parlametria): seguiu / (seguiu + não seguiu), ignorando liberações e ausências, mínimo de 10 votos. Câmara usa a orientação oficial (partido, federação ou bloco); Senado usa a maioria da bancada |
| Vota com o governo | Câmara | Mesmo método, contra a orientação da liderança do Governo |
| Gastos da cota | Todas com dados | Reembolsos dos últimos 12 meses completos; os dois meses mais recentes só entram quando atingem 80% da mediana dos 12 anteriores (lançamentos atrasados) |
| Gastos para conferir | Todas com dados | Regras inspiradas na Operação Serenata de Amor: CNPJ/CPF inválido (fora códigos internos), refeição atípica, valor no 0,1% superior da categoria, mesmo documento fiscal reembolsado duas vezes, fornecedor com mais de 50% do gasto |
| Projetos e "viraram lei" | Câmara, Senado | PL, PLP, PEC e PDL como autor ou coautor proponente em toda a carreira (Câmara: arquivos anuais oficiais de proposições e de autores desde 1988); situação "Transformado em Norma Jurídica" |
| Emendas Pix | Câmara, Senado | Planos de ação de transferências especiais no Transferegov desde 2020 (ou todas as emendas pagas, com chave do Portal da Transparência) |
| Patrimônio e votos | Todas | Declaração de bens da candidatura mais recente (a Vida pública mostra todas desde 2006) e votos nominais do TSE em 2022 |
| Anos de mandato | Todas | Primeiro mandato encontrado no histórico da casa, mandatos externos declarados à Câmara e candidaturas eleitas no TSE desde 1994 |
| Dinheiro de campanha | Todas | Receitas e despesas contratadas da prestação de contas de cada candidatura (TSE, desde 2018). Dinheiro público = Fundo Especial de Financiamento de Campanha + Fundo Partidário. Doadores pessoas físicas aparecem só pelo nome |

**Identidade entre fontes.** Uma pessoa é ligada a uma candidatura recente do TSE (2018, 2022 ou 2026) por data de nascimento, nome e, na Câmara, os dígitos visíveis do CPF. A partir daí seguimos o título de eleitor, que nunca muda, e depois o CPF completo, por todas as eleições desde 1994. Nos arquivos antigos sem título nem CPF, só aceitamos nome e data de nascimento idênticos. Um título ou CPF que aponta para duas pessoas é descartado, e uma pessoa cujas candidaturas recentes têm datas de nascimento diferentes não é seguida. Testes em [`pipeline/tests`](pipeline/tests) cobrem esses casos.

## Fontes de dados

| Fonte | O que traz | Acesso | Situação |
|---|---|---|---|
| Câmara dos Deputados, API v2 | Deputados, histórico, mandatos externos, comissões, frentes, sessões e presença, votações, votos, orientações, proposições, discursos | API aberta | Em uso |
| Câmara, arquivos de cota (CEAP) | Todas as despesas reembolsadas | ZIP anual | Em uso, com a API por deputado como reserva |
| Senado Federal, dados abertos | Senadores, mandatos, comissões, votações com votos de todos, proposições, pronunciamentos | API aberta | Em uso |
| Senado, CEAPS | Despesas dos senadores | API aberta | Em uso |
| TSE, candidaturas (`consulta_cand`) | Todas as candidaturas de todos os cargos desde 1994, usadas para a vida pública de quem acompanhamos e de todos que disputaram a Presidência | Arquivos ZIP por eleição | Em uso (refeito toda semana) |
| TSE, bens (`bem_candidato`) | Bens declarados em cada eleição desde 2006 | Arquivos ZIP por eleição | Em uso (refeito toda semana) |
| TSE, prestação de contas (`prestacao_de_contas_eleitorais_candidatos`) | Receitas, doadores e despesas de cada campanha desde 2018 | Arquivos ZIP de vários gigabytes | Em uso (refeito toda semana) |
| TSE, redes e votos | Redes sociais declaradas (2022 e 2026) e votos de 2022 por candidato | Arquivos ZIP | Em uso |
| Câmara, arquivos de proposições e autores | Todos os projetos desde 1988, com situação atual, primeiro autor e coautores; medidas provisórias e projetos do Poder Executivo | JSON anual | Em uso |
| Câmara e Senado, detalhes das matérias votadas | Ementa detalhada, explicação do Senado, temas, autores e texto completo | API aberta | Em uso |
| Transferegov | Emendas Pix (transferências especiais) | API aberta (PostgREST) | Em uso |
| Portal da Transparência | Todas as emendas parlamentares | API com chave gratuita | Pronto, liga com `PORTAL_TRANSPARENCIA_API_KEY` |
| ALMG (MG) | Deputados em exercício e verbas indenizatórias | API aberta | Em uso |
| ALESP (SP) | Deputados e despesas de gabinete | XML aberto | Em uso |
| Assembleias com SAPL (AC, TO, AM) | Parlamentares | API aberta | Em uso; novas casas entram em `SAPL_HOSTS` |
| Demais assembleias | Lista de eleitos via TSE | TSE | Parcial: sem presença e votos |
| YouTube Data API | Vídeos dos canais declarados | API oficial com chave | Pronto, liga com `YOUTUBE_API_KEY` |
| X, Instagram, TikTok | Publicações | APIs oficiais pagas ou restritas | Conectores prontos, ligam com credencial |

## Arquitetura

```
 Fontes oficiais                     Pipeline (GitHub Actions, diário)              Publicação
 ─────────────────                   ─────────────────────────────────              ──────────
 Câmara, Senado, TSE,      ──▶  coletar (cache HTTP, limites por servidor,   ──▶  data/ (JSON versionado no git,
 Transferegov, Portal,          novas tentativas, cada fonte isolada)              público e baixável)
 Assembleias, YouTube...        consolidar (vincula pessoas entre fontes)              │
                                calcular métricas e alertas                             ├──▶ Next.js (páginas estáticas
                                resumos de IA com citações validadas                    │     + busca e filtros sob demanda)
                                                                                        └──▶ Postgres (histórico de falas,
                                                                                              resumos de IA, busca textual)
```

- **Snapshot em JSON no repositório:** cada atualização vira um commit, então qualquer número publicado pode ser auditado e comparado no tempo pelo histórico do git.
- **Postgres opcional e complementar:** guarda o histórico que não cabe no snapshot (transcrições completas, resumos de IA de todos os períodos) e faz a busca textual em português. O schema está em [`src/db/schema.ts`](src/db/schema.ts), com tabelas de retrato (substituídas a cada execução) e tabelas de histórico (só acrescentam).
- **Falha isolada:** se uma fonte cai, as outras continuam e a página `/dados` mostra o que falhou.
- **Verificação antes de publicar** ([`pipeline/qualidade.ts`](pipeline/qualidade.ts)): número de parlamentares em exercício, identificadores únicos, Câmara e Senado respondendo, queda brusca no número de votações, datas no futuro, porcentagens impossíveis. Uma falha grave interrompe a publicação e a versão anterior continua no ar; o resultado de cada verificação aparece em `/dados`.
- **Impressão digital dos arquivos:** cada arquivo oficial grande processado entra no `meta.json` com endereço, tamanho, data e SHA-256.
- **Arquivos gigantes em fluxo:** os arquivos do TSE (alguns com vários gigabytes) são baixados direto para o disco e lidos linha a linha, guardando só as linhas das pessoas acompanhadas, e apagados depois do uso. Essas etapas são refeitas aos domingos (ou a pedido); nos outros dias, o resultado anterior é reaproveitado.

## IA

**Explicações em linguagem simples dos projetos votados** (`pipeline/explicar.ts`)

- Entrada: só os textos oficiais do projeto (ementa, ementa detalhada, explicação do Senado, palavras-chave e temas oficiais).
- Saída: resumo curto, até três mudanças práticas, quem é afetado (quando o texto diz) e de um a três trechos copiados do texto oficial.
- Validação automática: os trechos precisam aparecer exatamente no texto oficial; todo número da explicação precisa existir no texto oficial; palavras de juízo de valor descartam a explicação; travessões são removidos.
- Regenerada só quando o texto oficial muda (hash). Na página, sempre rotulada, com os trechos de origem e o texto oficial a um toque.

**Resumos do que cada parlamentar disse**

- Entrada: discursos e publicações do período mais os votos nominais do mesmo período, com identificadores.
- Saída obrigatória em JSON: resumo, posições por tema, mudanças de discurso (período anterior x atual) e pontos onde fala e voto não batem, cada item com citações.
- Validação: citações que não apontam para um registro enviado são removidas; afirmações sem citação válida são descartadas; contradições precisam de pelo menos duas citações.
- Períodos: semana, mês e trimestre, regenerados só quando as fontes mudam (hash). O histórico de resumos permite ver a evolução do discurso no tempo.
- Rótulo sempre visível com modelo, data e número de fontes.

## Roadmap

O roadmap segue uma regra simples: **confiança antes de volume**. Uma informação a mais só entra quando a anterior pode ser conferida e entendida sem esforço.

**Fase 1, fundação (feito):** pipeline com as fontes abertas, métricas, testes, banco, app completo, CI e coleta diária.

**Fase 2, confiança e vida pública (feito em outubro de 2026):**
- Verificação antes de publicar, impressão digital dos arquivos oficiais e cartão “Como sabemos disso?” com período, cálculo, limites, fonte, data e cobertura em todo número.
- Vida pública completa de quem acompanhamos (todas as candidaturas desde 1994, bens desde 2006) e dinheiro das campanhas desde 2018.
- Linguagem simples nas votações, guia “Quem resolve isso?” e “O que faz cada cargo”.

**Fase 3, provar com gente e com dados reais (agora):**
- Auditoria manual de uma amostra estratificada de perfis (Câmara, Senado e assembleias; estados com e sem dados; homônimos, trocas de partido, suplentes) contra os sites oficiais, com o relatório publicado.
- Teste com pessoas que não acompanham política, com 5 tarefas: achar quem as representa, ver como alguém votou, entender o que o voto significava, conferir um gasto na fonte e comparar com outro parlamentar. Medir conclusão, tempo e dúvidas.
- Histórico legível de correções: o que mudou, quando, por quê e em qual fonte, sem apagar a versão anterior.
- Compartilhamento que preserva o contexto: links e imagens com a métrica, o período, a data e a fonte.
- Deploy na Vercel, domínio e chaves opcionais (Anthropic, Portal da Transparência, YouTube, Postgres).

**Fase 4, todo mundo que já se candidatou:**
- Todas as pessoas que disputaram eleições desde 1994 (mais de um milhão), de vereador a Presidente, cada uma com a sua vida pública, bens e campanhas.
- Arquitetura: as candidaturas vão para o Postgres com a identidade por título de eleitor; a página `/pessoa/...` é montada sob demanda a partir do banco, com o mesmo cartão de evidência; a busca nacional mostra quando há nomes parecidos (estado, ano de nascimento, cargo) para ninguém confundir duas pessoas.
- Prefeitos e vereadores dos 5.570 municípios, começando pelo que o TSE já publica (candidaturas, bens, campanhas).
- Emendas pelo arquivo completo da Controladoria-Geral da União (sem chave): área (saúde, educação), município de destino e quem recebeu; página de cada município com o dinheiro que chegou.
- Mais assembleias com dados abertos (o projeto Panóptico mapeou conectores para cerca de 20).

**Fase 5, conexões com evidência:**
- Fornecedores: dados cadastrais e sócios das empresas (Receita Federal) para fornecedores da cota e das campanhas; sanções federais (CEIS/CNEP).
- Relações documentadas, como “fornecedor da cota que também doou para a campanha”, sempre com os registros que as comprovam e sem sugerir favorecimento.
- O que diz e o que faz: falas e votos sobre o mesmo tema, mostrando também quando a relação é ambígua.
- “Pergunte aos dados” em linguagem natural, só depois das fases anteriores e sempre mostrando os dados usados, o período, o cálculo e quando não há evidência suficiente.
- API pública e downloads em CSV.

**O que decidimos não fazer:** nota ou selo de “bom político”, ranking de quem mais enriqueceu, IA dando veredito sobre irregularidades, raspagem de redes sociais e listas de palavras ofensivas para classificar discursos. Cada um desses itens transforma um fato em juízo e contraria os princípios 2, 5, 6 e 12.

## Referências estudadas

- **[Ficha do Político](https://github.com/ficha-do-politico/fichadopolitico)** (licença MIT): nota sobre o custo histórico dos bens, “dados coletados em” em cada seção, critérios públicos para escolher votações, guia de cargos com o que cada um pode e não pode fazer, a busca por problema do dia a dia e a publicação das próprias auditorias de dados. Adotamos as ideias; não copiamos código.
- **[elosys](https://github.com/YuriRDev/elosys)** (sem licença declarada, então só ideias): identidade pelo título de eleitor antes do CPF, preferindo separar a juntar errado; arquivos do TSE de todas as eleições; prestação de contas de campanha; impressão digital (SHA-256) de cada arquivo oficial; alertas sempre acompanhados das evidências; a regra de não acusar.
- **Análise de produto de outubro de 2026**: ficha de evidência reutilizável (“Como sabemos disso?”), estados de cobertura visíveis, verificação antes de publicar, contagem de “viraram lei” sem limite escondido, e indicadores de confiabilidade.

## Indicadores de sucesso do produto

- **Tempo até a primeira resposta útil:** da página inicial a entender ao menos um número de quem a representa, em menos de 10 segundos.
- **Taxa de sucesso das tarefas** no teste com pessoas que não acompanham política (as 5 tarefas da Fase 3).
- **Taxa de verificação:** quem precisa conferir uma informação consegue chegar à fonte original.
- **Cobertura verificável:** porcentagem dos números publicados com fonte, período, cálculo e data identificáveis (meta: todos).
- **Erros críticos de identidade ou cálculo** encontrados nas auditorias por amostra (tolerância zero para casos já conhecidos) e tempo até a correção.
- **Fontes em dia:** fontes com status "ok" e dentro do prazo de atualização em cada coleta.
- **Uso no celular:** proporção de visitas em celular que chegam a um perfil ou a uma votação.

## Riscos e como lidamos

| Risco | Mitigação |
|---|---|
| Dado errado atribuído a alguém (homônimos, mudanças de partido) | Identidade pelo título de eleitor e CPF completo, chaves ambíguas descartadas, data de nascimento conferida, testes automatizados, limites explicados, canal de correção |
| Uma relação (doação, fornecedor) lida como acusação | Linguagem factual, aviso de que ligação não é prova, registros de origem sempre visíveis |
| Privacidade de quem doou para campanhas | Pessoas físicas aparecem só pelo nome, sem CPF; empresas e partidos com CNPJ, como publicado pelo TSE |
| Coleta parcial publicada como se fosse completa | Verificação antes de publicar; falhas graves mantêm a versão anterior no ar |
| Leitura enviesada | Linguagem neutra, nenhuma nota, comparação com pares, explicação de limites em todo cartão |
| Erro da IA | Citações obrigatórias e validadas, rótulo de IA, link para a fonte em cada afirmação |
| Instabilidade das APIs oficiais | Cache, novas tentativas, fontes isoladas, status público por fonte |
| Bloqueio de acesso a sites do governo fora do Brasil | Pipeline pode rodar em runner próprio no Brasil sem mudar código |
| Termos de uso de redes sociais | Apenas APIs oficiais, nenhuma raspagem |

## Registro de decisões

| Data | Decisão | Motivo |
|---|---|---|
| 2026-10-11 | App em Next.js com páginas estáticas geradas a partir de um snapshot JSON versionado | Rápido para o público, barato de hospedar, auditável pelo histórico do git |
| 2026-10-11 | Postgres como complemento, não como dependência para o site funcionar | O site continua de pé mesmo sem banco; o banco guarda histórico e busca textual |
| 2026-10-11 | Nenhuma nota ou ranking de "melhores"; sempre comparação com pares | Credibilidade e neutralidade |
| 2026-10-11 | Fidelidade partidária pelo método de aderência da Parlametria, ausências fora do denominador | Método público, testado e que não mistura ausência com discordância |
| 2026-10-11 | Gastos comparados só com colegas do mesmo estado | Teto da cota varia por estado |
| 2026-10-11 | Redes sociais só por API oficial; perfis a partir de declarações à Câmara e ao TSE | Rastreabilidade e respeito aos termos das plataformas |
| 2026-10-11 | IA só com citações validadas e descarte automático do que não tem fonte | Evitar afirmações inventadas |
| 2026-10-11 | Fontes tipográficas e ícones hospedados no próprio site | Privacidade dos visitantes e independência de terceiros |
| 2026-10-11 | Cores de voto validadas para daltonismo e sempre acompanhadas do texto | Acessibilidade |
| 2026-10-12 | Alertas de gastos recalibrados com a primeira coleta real | Códigos internos das casas eram contados como CNPJ inválido e compras repetidas como duplicidade; agora duplicidade exige o mesmo documento fiscal e o limiar de valor atípico passou para 0,1% |
| 2026-10-12 | Janela de 12 meses de gastos só descarta até dois meses finais incompletos | Em ano eleitoral o gasto cai legitimamente e não pode ser confundido com dado faltante |
| 2026-10-12 | Votos de 2022 vêm do arquivo consolidado do TSE | O JSON de resultados sai do ar depois de cada eleição |
| 2026-10-12 | Plenários desenhados como semicírculo com corredor central, uma bolinha por cadeira | É a forma da sala real da Câmara e do Senado; ver cada cadeira torna 513 e 81 pessoas concretas |
| 2026-10-12 | No plenário, partidos ordenados pelo quanto votam com o governo, não por "esquerda" ou "direita" | É um número medido nas votações; rótulos ideológicos seriam opinião |
| 2026-10-12 | Toda votação mostra a regra de aprovação (PEC 3/5, lei complementar maioria absoluta, demais maioria simples) com o artigo da Constituição | Muita gente não sabe por que uma votação com mais Sim que Não pode não aprovar uma PEC |
| 2026-10-12 | Votações secretas usam o total oficial publicado e mostram só quem participou | O voto individual não é divulgado; mostrar "outros" para todos dava uma leitura errada |
| 2026-10-12 | Fotos oficiais servidas pelo próprio site em WebP; deputados estaduais com a foto de candidatura do TSE | Páginas mais rápidas e independentes dos servidores do governo; o link da foto original segue como fonte |
| 2026-10-12 | Mapa do Brasil gerado em tempo de build a partir de GeoJSON aberto, sem biblioteca de mapas no navegador | Carrega rápido em celular simples e funciona sem JavaScript para os links de cada estado |
| 2026-10-12 | Código formatado com Prettier, verificado no CI | Estilo uniforme para quem contribui |
| 2026-10-12 | Detalhes oficiais de cada projeto votado (ementa detalhada, explicação do Senado, temas, autores, texto completo) | A ementa sozinha raramente explica o que estava em jogo |
| 2026-10-12 | Etapas de votação traduzidas por regras fixas e públicas, não por IA | Pedidos e destaques se repetem e têm significado conhecido; regras são auditáveis e não alucinam |
| 2026-10-12 | Explicações de projetos por IA só com trechos copiados do texto oficial e sem números novos | Linguagem simples sem perder a rastreabilidade |
| 2026-10-12 | Lista de votações agrupada por projeto e por assunto | As pessoas procuram "o que votaram sobre saúde", não a votação nº 2611313-34 |
| 2026-10-12 | Estado do visitante guardado só no aparelho (localStorage) | Personaliza sem cadastro e sem enviar dado pessoal a ninguém |
| 2026-10-12 | Tokens de design em três camadas, com neutros azulados e cor só com significado | Hierarquia mais clara e uma interface que parece viva sem ficar barulhenta |
| 2026-10-12 | README, PRODUCT.md e a página “O que é o Raio-X Político” escritos para qualquer pessoa, com a mesma lista de perguntas que o site responde | Quem chega ao site ou ao repositório precisa entender em segundos o que é, para quem é e o que dá para descobrir |
| 2026-10-12 | Vida pública completa pelos arquivos do TSE desde 1994, seguindo o título de eleitor | “Entender a vida inteira de quem está na política”, com identidade segura: melhor faltar uma candidatura do que mostrar a de outra pessoa |
| 2026-10-12 | Dinheiro das campanhas (TSE, desde 2018) com o dinheiro público em destaque e doadores pessoas físicas só pelo nome | Quem pagou a campanha é uma das perguntas mais comuns; o CPF de quem doou não acrescenta nada para o cidadão |
| 2026-10-12 | Cartão “Como sabemos disso?” igual para todo número, com cobertura (completa, parcial, indisponível) | Uma única forma de conferir qualquer número; ausência de dado dita em voz alta, nunca como zero |
| 2026-10-12 | Verificação antes de publicar, com bloqueio | Uma coleta quebrada nunca deve parecer uma atualização |
| 2026-10-12 | Projetos contados em toda a carreira pelos arquivos anuais da Câmara | O limite anterior (100 projetos mais recentes) escondia parte da atuação e podia ser lido como total |
| 2026-10-12 | Códigos de voto das casas traduzidos (Artigo 17, P-NRV, licenças) | Quem preside a sessão ou está de licença não pode parecer ausente sem motivo |
| 2026-10-12 | Guia “Quem resolve isso?” e “O que faz cada cargo” | Muita gente cobra a pessoa errada; saber o nível de governo é o primeiro passo para entender política |
| 2026-10-12 | Arquivos gigantes do TSE lidos em fluxo, apagados depois do uso e refeitos aos domingos | Cabe no runner gratuito do GitHub e mantém a atualização diária rápida |
| 2026-10-12 | Na votação, tocar em Sim ou Não filtra a lista e acende só essas cadeiras no plenário; grupos podem ser escondidos; tudo fica no endereço da página | Ver quem votou como é a pergunta mais comum; um link deve abrir exatamente a mesma visão para quem recebe |
| 2026-10-12 | “Sem voto registrado” separado de ausência, e só para quem a Câmara diz que estava no cargo naquele dia | A fonte não diz o motivo; chamar de falta seria acusar, e contar quem assumiu depois seria errar a pessoa |
| 2026-10-12 | Um único agrupamento de votos para totais, lista, plenário e partidos | O mesmo filtro precisa significar a mesma coisa em todo lugar |
| 2026-10-12 | Plano de implementação em `docs/IMPLEMENTATION_ROADMAP.md` | Um registro único do que falta, do que foi feito e de como foi conferido |
| 2026-10-12 | Página da Presidência feita só com resultados do TSE e atos registrados na Câmara | Responde quem a eleição colocou no cargo sem inventar a lista de quem governou: impeachments e substituições não estão nesses arquivos, e a página diz isso |
| 2026-10-12 | Projetos separados entre primeiro autor e coautor | Assinar um projeto de outra pessoa é diferente de escrevê-lo; os dois contam, mas não do mesmo jeito |
| 2026-10-12 | Empresas ligadas só pelo CNPJ válido, nunca pelo nome; CPF de pessoa nunca publicado, nem dentro do nome de microempreendedor | Ligação errada entre uma empresa e um político é uma acusação injusta; nome parecido não prova nada |
| 2026-10-12 | Mapa de relações com prova em cada ligação e a mesma informação em lista | Um grafo bonito sem prova vira boato; a lista garante acesso para quem usa leitor de tela ou teclado |
