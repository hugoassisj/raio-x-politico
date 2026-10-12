# Guia para quem contribui (pessoas e agentes)

Leia [PRODUCT.md](PRODUCT.md) antes de mudar qualquer coisa: os princípios lá são requisitos.

## Regras do projeto

- Todo número exibido precisa de fonte rastreável. Ao adicionar um dado, inclua a URL oficial no registro e um caminho até ela na interface.
- Definições de métricas ficam só em `src/lib/metricas.ts`. Interface, listas e página de metodologia leem de lá.
- Tipos compartilhados entre pipeline e app ficam em `src/lib/types.ts`. O pipeline nunca importa código de interface; o app nunca importa de `pipeline/`. Lógica usada pelos dois vai para `src/lib/` (exemplo: `orientacao.ts`).
- Linguagem da interface: português simples (Lei 15.263/2025: frases curtas, ordem direta, palavras do dia a dia), neutro, sem juízo de valor e sem travessão longo (em dash). Escreva para quem lê pouco. Valor ausente usa `VAZIO` de `src/lib/format.ts`.
- Termos técnicos e etapas de votação são explicados só por `src/lib/linguagem.ts` (glossário e regras públicas). As perguntas que o site responde ficam só em `src/lib/perguntas.ts`; o README espelha essa lista.
- README e PRODUCT.md são em português simples e começam pelo que qualquer pessoa precisa saber; detalhes técnicos vêm no fim.
- Coletores tratam respostas das APIs como não confiáveis: leitura defensiva, normalização para os tipos, falha isolada por fonte.
- Antes de enviar: `npm run format && npm run lint && npm run typecheck && npm test`. Mudou um coletor? Atualize o teste de contrato em `pipeline/tests/fontes.test.ts`.
- Mudou o schema do banco? `npm run db:generate` e inclua a migração.
- Decisões de produto ou arquitetura entram no Registro de decisões do PRODUCT.md.
- Corrigiu algo que o site mostrou errado? Registre em `src/lib/correcoes.ts` (página `/correcoes`).
- O plano e o andamento ficam em `docs/IMPLEMENTATION_ROADMAP.md`: atualize a situação e a prova de cada item que mexer.

## Next.js

Este projeto usa Next.js 16. Antes de escrever código do app, consulte a documentação da versão instalada em `node_modules/next/dist/docs/`, porque APIs e convenções mudaram em relação a versões anteriores.
