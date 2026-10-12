# Raio-X Político: documento de produto

> Documento vivo. Toda mudança relevante de escopo, fonte de dados, métrica ou decisão de arquitetura entra aqui, com data, no [Registro de decisões](#registro-de-decisões).

## Visão

Ser o lugar onde qualquer pessoa no Brasil entende, em poucos segundos, o que fazem as pessoas que ela elegeu: se aparecem para trabalhar, como votam, o que propõem, quanto gastam, para onde mandam dinheiro e o que dizem. Com tudo verificável na fonte oficial, sem opinião e sem partido.

## O problema

Os dados existem e são públicos, mas estão espalhados em dezenas de sites (Câmara, Senado, TSE, Transferegov, Portal da Transparência, 27 assembleias), em formatos técnicos, com nomes de campos internos e sem comparação entre pessoas. Quem quer saber "meu deputado vai trabalhar?" desiste antes de chegar à resposta. Quem chega, raramente consegue comparar com os colegas ou conferir de onde veio o número.

## Para quem

| Pessoa | O que precisa | Como o produto atende |
|---|---|---|
| Cidadã no celular, pouco tempo, pouca familiaridade com política | Saber em 10 segundos quem a representa e se essa pessoa trabalha | Página inicial "Quem te representa?", mapa de estados, frase-resumo em linguagem simples no topo de cada perfil |
| Eleitor em período eleitoral | Comparar candidatos e ver coerência entre discurso e voto | Comparador lado a lado, votos em comum onde divergiram, "Diz e faz" nos resumos de IA |
| Jornalista, pesquisador, organização da sociedade civil | Ir fundo, baixar dados, auditar metodologia | Toda métrica com "Como calculamos", link para o registro oficial, JSON bruto por página, código aberto |
| Assessorias e os próprios parlamentares | Conferir e corrigir informações | Fontes visíveis e canal para reportar erros |

## Princípios (não negociáveis)

1. **Todo número tem fonte.** Cada valor exibido leva ao registro oficial e ao arquivo bruto. Se não dá para rastrear, não publicamos.
2. **Fatos, não notas.** Mostramos posição em relação aos colegas (mediana, faixa de 80%), nunca nota, selo de "bom" ou "ruim", ou ranking de "melhores". Faltar, gastar ou seguir o partido podem ter boas explicações.
3. **Comparação justa.** Só comparamos pessoas da mesma casa. Gastos são comparados com colegas do mesmo estado, porque o teto da cota muda conforme a distância até Brasília.
4. **Ausência de dado nunca vira zero.** Quando falta dado, mostramos "–" e explicamos por quê.
5. **IA com rédea curta.** A IA só resume registros públicos fornecidos a ela. Toda afirmação precisa citar um registro existente, senão é descartada automaticamente. Todo texto de IA vem rotulado.
6. **Sem raspagem de redes sociais.** Perfis vêm do que o próprio político declarou à Câmara ou ao TSE. Conteúdo só entra por API oficial da plataforma.
7. **Profundidade em camadas.** Primeiro a resposta simples (frase e números grandes), depois a explicação ("Como calculamos"), depois a fonte e o dado bruto. Ninguém é obrigado a descer, todos podem.
8. **Acessível de verdade.** Funciona em celular simples e sem JavaScript nos fluxos principais, cores de votos validadas para daltonismo e sempre acompanhadas de texto, navegação por teclado, contraste adequado e modo escuro.

## O que existe hoje

| Página | Pergunta que responde |
|---|---|
| `/` Início | Quem me representa (mapa do Brasil)? Como está dividido o Congresso hoje? O que foi votado e dito recentemente? |
| `/estado/[uf]` | Quem são os 3 senadores, os deputados federais e os estaduais do meu estado? |
| `/politico/[id]` | O que essa pessoa faz: presença, votos, gastos, projetos, emendas, falas, carreira, patrimônio, redes e fontes |
| `/politicos` | Lista de todos, filtrável por casa, estado e partido, ordenável por qualquer critério |
| `/votacoes` | O que foi votado, agrupado por projeto e por assunto, em linguagem simples |
| `/votacao/[id]` | Do que se trata o projeto, o que foi decidido nesta etapa, quantos votos eram precisos, como votaram os representantes do seu estado, todas as votações do mesmo projeto, o plenário, os partidos e cada voto |
| `/gastos` | Quanto se gasta da cota, em quê, com quais fornecedores, e o que merece um segundo olhar |
| `/falas` | O que disseram sobre um tema, com link para o registro original |
| `/comparar` | Até 4 pessoas lado a lado, incluindo votações em que divergiram |
| `/partidos` | Tamanho de cada partido nas duas casas, se costuma votar com o governo e se vota unido |
| `/partido/[sigla]` | Onde o partido senta no plenário, membros com foto, medianas comparadas com a casa e votações recentes |
| `/como-funciona` | Como uma ideia vira lei e quantos votos cada tipo de proposta precisa, desenhado no plenário |
| `/analises` | Cruzamentos simples (gasto x presença, experiência x presença, governo x unidade), sempre dizendo que relação não é causa |
| `/dados` | Fontes, situação da última coleta, metodologia, limites e salários |

## Métricas

A definição oficial de cada métrica mora em um único lugar do código, [`src/lib/metricas.ts`](src/lib/metricas.ts), e é a mesma explicação exibida nos cartões, nas listas e na página `/dados`. Resumo:

| Métrica | Casas | Regra |
|---|---|---|
| Presença | Câmara, Senado | Sessões deliberativas do Plenário com presença registrada desde o início do exercício atual (Câmara); dias com votação nominal com voto ou presença registrada (Senado). Últimos 12 meses |
| Votações nominais | Câmara, Senado | Votações nominais com voto registrado dividido pelas votações ocorridas em exercício |
| Segue o partido | Câmara, Senado | Método da aderência (Parlametria): seguiu / (seguiu + não seguiu), ignorando liberações e ausências, mínimo de 10 votos. Câmara usa a orientação oficial (partido, federação ou bloco); Senado usa a maioria da bancada |
| Vota com o governo | Câmara | Mesmo método, contra a orientação da liderança do Governo |
| Gastos da cota | Todas com dados | Reembolsos dos últimos 12 meses completos; os dois meses mais recentes só entram quando atingem 80% da mediana dos 12 anteriores (lançamentos atrasados) |
| Gastos para conferir | Todas com dados | Regras inspiradas na Operação Serenata de Amor: CNPJ/CPF inválido (fora códigos internos), refeição atípica, valor no 0,1% superior da categoria, mesmo documento fiscal reembolsado duas vezes, fornecedor com mais de 50% do gasto |
| Projetos e "viraram lei" | Câmara, Senado | PL, PLP, PEC e PDL como autor ou coautor; situação "Transformado em Norma Jurídica" |
| Emendas Pix | Câmara, Senado | Planos de ação de transferências especiais no Transferegov desde 2020 (ou todas as emendas pagas, com chave do Portal da Transparência) |
| Patrimônio e votos | Todas | Declaração de bens e votos nominais do TSE |
| Anos de mandato | Todas | Primeiro mandato encontrado no histórico da casa, mandatos externos declarados à Câmara e candidaturas eleitas no TSE |

## Fontes de dados

| Fonte | O que traz | Acesso | Situação |
|---|---|---|---|
| Câmara dos Deputados, API v2 | Deputados, histórico, mandatos externos, comissões, frentes, sessões e presença, votações, votos, orientações, proposições, discursos | API aberta | Em uso |
| Câmara, arquivos de cota (CEAP) | Todas as despesas reembolsadas | ZIP anual | Em uso, com a API por deputado como reserva |
| Senado Federal, dados abertos | Senadores, mandatos, comissões, votações com votos de todos, proposições, pronunciamentos | API aberta | Em uso |
| Senado, CEAPS | Despesas dos senadores | API aberta | Em uso |
| TSE, dados abertos | Candidaturas 2018, 2022 e 2026, bens declarados, redes sociais declaradas (2022 e 2026), votos de 2022 | Arquivos ZIP | Em uso |
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

## Design e experiência

Referências: a Política Nacional de Linguagem Simples (Lei 15.263/2025), as recomendações de usabilidade para pessoas com pouca leitura do guia Health Literacy Online (ODPHP), a escala de 12 passos do Radix Colors para papéis de cor, o Design Tokens Community Group para a organização dos tokens e os princípios táticos de hierarquia do Refactoring UI.

**Fluxos que guiam cada tela**

1. *Quem me representa?* Busca ou mapa na primeira tela. O estado escolhido fica salvo só neste aparelho e passa a abrir as respostas sobre "os seus".
2. *O que votaram?* As pessoas pensam em projetos, não em votações. A lista agrupa todas as votações de um projeto, mostra o assunto em palavras simples e o resultado do texto principal.
3. *O que essa votação significa?* Cada votação começa pelo "do que se trata" em linguagem simples, depois o que foi decidido nesta etapa (com o que significava votar Sim e votar Não), quantos votos eram precisos e como votaram os representantes do seu estado. Plenário, partidos e a lista completa vêm depois.
4. *Posso confiar?* O texto oficial fica sempre a um toque, junto da página oficial do projeto e do dado bruto.

**Regras de escrita**

- Frases curtas, ordem direta, voz ativa, palavras do dia a dia (Lei 15.263/2025).
- Termos técnicos aparecem como estão no texto oficial, sublinhados; um toque explica o termo. O glossário é um só (`src/lib/linguagem.ts`) e alimenta as explicações e a página "Como funciona".
- Votações sobre o andamento (pedidos de urgência, adiamento, retirada de pauta) são marcadas como tal, para ninguém ler um voto de procedimento como voto sobre o conteúdo.

**Tokens de design** (`src/app/globals.css`)

- Três camadas: primitivos (escalas em OKLCH, nunca usados direto), semânticos (papel: página, cartão, texto, borda, destaque, votos) e receitas de componente (`.cartao`, `.chip`, `.botao`).
- Neutros levemente azulados em vez de cinza puro. Cor saturada só com significado: azul para o que se pode tocar ou está selecionado, verde, laranja e roxo para Sim, Não e outros votos, amarelo para o fato principal da tela. Cores de partidos são evitadas de propósito.
- Movimento curto e calmo (120 a 480 ms): cartões que sobem ao entrar, barras e cadeiras que crescem, um ponto pulsando ao lado da última atualização. Tudo desliga com `prefers-reduced-motion`.

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

**Fase 1, fundação (feito):** pipeline com todas as fontes abertas, métricas, testes, banco, app completo, CI e coleta diária.

**Fase 2, dados reais em produção (agora):**
- Primeira coleta completa no GitHub Actions e correção do que as fontes reais revelarem.
- Deploy na Vercel, domínio, banco Postgres (Neon ou Supabase) e chaves opcionais (Portal da Transparência, YouTube, Anthropic).
- Revisão manual de uma amostra de perfis contra os sites oficiais.

**Fase 3, alcance:**
- Mais assembleias com dados abertos (Panóptico mapeou conectores para cerca de 20).
- Página de cada município com as emendas recebidas.
- Resumo semanal por e-mail ou WhatsApp: "o que seus representantes fizeram nesta semana".
- Imagens de compartilhamento por perfil (cartões para redes sociais).

**Fase 4, profundidade:**
- Diz e faz em escala, temas por votação, linha do tempo de posições.
- Doações de campanha (TSE) cruzadas com votos e fornecedores da cota.
- Sanções (CEIS/CNEP) e quadro societário de fornecedores.
- API pública e downloads em CSV.

## Indicadores de sucesso do produto

- Tempo até a primeira resposta útil (meta: menos de 10 segundos da página inicial até o perfil).
- Proporção de visitas em celular que chegam a um perfil.
- Erros de dados reportados e tempo para corrigir.
- Fontes com status "ok" em cada coleta.
- Cobertura: parlamentares com cada métrica disponível, por casa e estado.

## Riscos e como lidamos

| Risco | Mitigação |
|---|---|
| Dado errado atribuído a alguém (homônimos, mudanças de partido) | Ligações por data de nascimento e CPF parcial, testes automatizados, limites explicados, canal de correção |
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
