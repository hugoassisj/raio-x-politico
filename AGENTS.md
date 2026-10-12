# Guia para quem contribui (pessoas e agentes)

Leia [PRODUCT.md](PRODUCT.md) antes de mudar qualquer coisa: os princípios lá são requisitos.

## Regras do projeto

- Todo número exibido precisa de fonte rastreável. Ao adicionar um dado, inclua a URL oficial no registro e um caminho até ela na interface.
- Definições de métricas ficam só em `src/lib/metricas.ts`. Interface, listas e página de metodologia leem de lá.
- Tipos compartilhados entre pipeline e app ficam em `src/lib/types.ts`. O pipeline nunca importa código de interface; o app nunca importa de `pipeline/`. Lógica usada pelos dois vai para `src/lib/` (exemplo: `orientacao.ts`).
- Linguagem da interface: português simples, neutro, sem juízo de valor e sem travessão longo (em dash). Valor ausente usa `VAZIO` de `src/lib/format.ts`.
- Coletores tratam respostas das APIs como não confiáveis: leitura defensiva, normalização para os tipos, falha isolada por fonte.
- Antes de enviar: `npm run lint && npm run typecheck && npm test`. Mudou um coletor? Atualize o teste de contrato em `pipeline/tests/fontes.test.ts`.
- Mudou o schema do banco? `npm run db:generate` e inclua a migração.
- Decisões de produto ou arquitetura entram no Registro de decisões do PRODUCT.md.

## Next.js

Este projeto usa Next.js 16. Antes de escrever código do app, consulte a documentação da versão instalada em `node_modules/next/dist/docs/`, porque APIs e convenções mudaram em relação a versões anteriores.
