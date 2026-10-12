# Raio-X Político

**O que fazem os políticos que você elegeu, explicado em palavras simples e com a fonte oficial de cada número.**

O Raio-X Político é um site gratuito, sem partido e sem cadastro. Ele mostra o que fazem os 81 senadores, os 513 deputados federais e os mais de mil deputados estaduais do Brasil: se vão trabalhar, como votam, o que propõem, quanto gastam, para onde mandam dinheiro e o que dizem.

![Página inicial: “Quem te representa?”, com busca e mapa do Brasil](docs/telas/inicio.png)

## Por que ele existe

Tudo o que um político faz no Congresso fica registrado: cada presença, cada voto, cada nota fiscal. Esses dados já são públicos. O problema é que estão espalhados em dezenas de sites do governo, em linguagem técnica e cheios de siglas. Quem quer saber algo simples, como _“meu deputado vai trabalhar?”_, costuma desistir antes de achar a resposta.

O Raio-X Político junta esses dados todos os dias, traduz para o português do dia a dia e mostra cada pessoa ao lado dos colegas. Você tira suas próprias conclusões.

## Perguntas que você pode responder

| Pergunta | Onde o site responde |
|---|---|
| Quem me representa? | Toque no seu estado no mapa e veja os 3 senadores, os deputados federais e os estaduais, com foto e partido. |
| Meu deputado vai trabalhar? | Cada perfil mostra quantas sessões a pessoa compareceu e em quantas votações registrou voto, comparado com os colegas. |
| O que foi votado e o que muda para mim? | Cada projeto explicado em palavras simples, com o resultado e o que significava votar Sim ou Não. |
| Como votaram os representantes do meu estado? | Em toda votação, escolha seu estado uma vez e veja o voto de cada um, com foto. |
| Quantos votos uma lei precisa para passar? | Mudar a Constituição exige 308 deputados; uma lei comum, mais Sim do que Não. Cada regra aparece desenhada no plenário. |
| Quanto gastam da verba do mandato, e com o quê? | Gastos da cota parlamentar mês a mês, por tipo de despesa e por fornecedor, com o link de cada nota fiscal. |
| Meu partido vota com o governo? Vota unido? | Cada partido no plenário, quantas vezes vota junto com o governo e o quanto seus membros votam iguais. |
| Para onde mandam dinheiro do orçamento? | As emendas que cada parlamentar indicou para cidades e estados. |
| O que andam dizendo? | Discursos oficiais com busca por tema e link para o registro original. |
| Como um político se compara com outro? | Até 4 pessoas lado a lado, incluindo as votações em que discordaram. |

<table>
<tr>
<td><img src="docs/telas/votacao.png" alt="Página de uma votação: do que se trata, o que foi decidido, quantos votos eram precisos e o resultado"></td>
<td><img src="docs/telas/plenario.png" alt="Plenário da Câmara e do Senado, uma bolinha por cadeira"></td>
</tr>
<tr>
<td><img src="docs/telas/perfil.png" alt="Perfil de um deputado com foto, resumo e números principais"></td>
<td><img src="docs/telas/celular.png" alt="O site no celular"></td>
</tr>
</table>

## Para quem é

- **Para qualquer pessoa**, no celular, com pouco tempo. Nada de siglas sem explicação: palavras difíceis ficam sublinhadas e se explicam com um toque.
- **Para quem quer ir fundo**, como jornalistas, pesquisadores e organizações. Todo número tem a explicação de como foi calculado, o link para o registro oficial e o arquivo de dados para baixar.
- **Para os próprios políticos e suas equipes**, que podem conferir e pedir correções.

## O que ele não é

- **Não é de nenhum partido.** Todos são mostrados do mesmo jeito, com as mesmas regras.
- **Não dá nota.** Não existe “melhor” ou “pior”. Faltar ou gastar pode ter boas explicações; mostramos os fatos e a comparação com os colegas.
- **Não diz em quem votar.** A decisão é sua.
- **Não é site do governo.** É um projeto independente que usa os dados que o governo publica.

## Por que você pode confiar

- **Todo número tem endereço.** Ao lado de cada dado há o link para o registro oficial de onde ele veio: Câmara, Senado, Tribunal Superior Eleitoral (TSE), Transferegov, Portal da Transparência e assembleias estaduais.
- **Atualizado todo dia.** Um programa visita os sites oficiais toda madrugada e publica os dados novos.
- **Inteligência artificial com regras duras.** Quando usamos IA para explicar um projeto em palavras simples, ela só pode usar o texto oficial, precisa copiar os trechos em que se baseou e não pode inventar números. Se quebrar uma regra, a explicação é descartada automaticamente. Tudo o que foi feito por IA vem marcado no site.
- **Tudo aberto.** Este código e todos os dados ficam públicos aqui. Qualquer pessoa pode conferir como cada conta é feita.

## Como os dados chegam ao site

1. **Coletar.** Toda madrugada, um programa (o _pipeline_, na pasta `pipeline/`) baixa os dados dos sites oficiais. Se um site estiver fora do ar, os outros continuam e o problema fica registrado.
2. **Organizar e calcular.** O programa junta a mesma pessoa em fontes diferentes (por exemplo, a deputada na Câmara e a candidata no TSE), calcula presença, gastos e votos, e explica cada votação em palavras simples.
3. **Publicar.** Os dados vão para a pasta [`data/`](data/README.md), que qualquer pessoa pode baixar, e o site é atualizado a partir deles.

Os detalhes de cada decisão, cada fonte e cada cálculo estão no [documento de produto (PRODUCT.md)](PRODUCT.md).

## Achou um erro?

Dados públicos também têm erros, e nós também. [Avise aqui](../../issues/new?template=erro-nos-dados.yml) com o link da página do site e, se puder, o link da fonte oficial. Toda correção fica registrada no histórico.

---

## Para quem programa

O site é feito com [Next.js](https://nextjs.org) e TypeScript. Os dados são arquivos JSON gerados pelo pipeline; um banco Postgres é opcional e guarda o histórico de falas e a busca por texto.

### Rodar no seu computador

Precisa do Node 22.

```bash
npm ci

# Opção A: dados de exemplo (rápido, não acessa os sites oficiais)
npm run demo
DATA_DIR=data-demo npm run dev

# Opção B: dados reais (de 1 a 3 horas na primeira vez; depois usa o que já baixou)
npm run pipeline
npm run dev
```

Abra http://localhost:3000.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run pipeline` | Coleta tudo e grava a pasta `data/` |
| `npm run pipeline -- --only=senado,camara` | Coleta de novo só algumas fontes, reaproveitando as outras |
| `npm run pipeline -- --dias=90` | Janela menor para votos, presença e discursos |
| `npm run pipeline:explicar` | Explica os projetos votados em palavras simples (precisa de `ANTHROPIC_API_KEY`) |
| `npm run pipeline:ai` | Resume o que cada parlamentar disse, com citações (precisa de `ANTHROPIC_API_KEY`) |
| `npm run db:migrate` e `npm run pipeline:db` | Cria as tabelas e carrega os dados no Postgres (precisa de `DATABASE_URL`) |
| `npm test` | Testes de cálculos, coletores, banco e interface |
| `npm run format`, `npm run lint` e `npm run typecheck` | Formatação e qualidade do código |
| `npx tsx scripts/gerar-mapa.ts` | Gera de novo o mapa do Brasil a partir do arquivo em `scripts/dados/` |

### Chaves opcionais

Nenhuma é obrigatória. Cada uma liga um recurso a mais. Veja o modelo em [.env.example](.env.example).

| Variável | Liga |
|---|---|
| `ANTHROPIC_API_KEY` | Explicações em palavras simples e resumos de falas feitos por IA |
| `PORTAL_TRANSPARENCIA_API_KEY` | Todas as emendas parlamentares (chave gratuita em portaldatransparencia.gov.br/api-de-dados) |
| `DATABASE_URL` | Banco Postgres (busca por texto e histórico) |
| `YOUTUBE_API_KEY` | Vídeos dos canais oficiais |
| `X_BEARER_TOKEN`, `IG_ACCESS_TOKEN` + `IG_USER_ID`, `TIKTOK_RESEARCH_TOKEN` | Publicações pelas APIs oficiais dessas redes |
| `NEXT_PUBLIC_SITE_URL` | Endereço público do site |

### Colocar no ar

1. Importe este repositório na [Vercel](https://vercel.com). Não precisa configurar nada.
2. No GitHub, em **Settings > Secrets and variables > Actions**, adicione as chaves que quiser usar.
3. Rode uma vez, à mão, o fluxo **Atualizar dados** (aba Actions). Depois ele roda sozinho toda madrugada, e cada atualização publica o site de novo.

### Onde fica cada coisa

```
pipeline/            coleta, ligação entre fontes, cálculos, IA e carga no banco
  sources/           um coletor para cada fonte oficial
  tests/             testes dos cálculos, dos coletores, da IA e do banco
src/
  app/               páginas do site
  components/        peças da interface
  lib/               tipos, cálculos, linguagem simples, formatação e leitura dos dados
  db/                estrutura do banco Postgres
drizzle/             mudanças do banco
data/                dados publicados (gerados pelo pipeline)
public/fotos/        fotos oficiais otimizadas (geradas pelo pipeline)
scripts/             geração do mapa do Brasil
docs/telas/          imagens das telas usadas neste README
```

### Contribuir

Leia o [AGENTS.md](AGENTS.md) (regras do projeto) e o [PRODUCT.md](PRODUCT.md) (por que cada coisa é como é). Antes de enviar, rode `npm run format && npm run lint && npm run typecheck && npm test`.

## Licença

Código sob licença MIT. Os dados em `data/` vêm de bases públicas oficiais e podem ser reutilizados citando o Raio-X Político e as fontes originais.
