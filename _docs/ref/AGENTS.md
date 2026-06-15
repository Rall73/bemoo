# This is NOT the framework you know

Esta versão pode ter breaking changes — APIs, convenções e estrutura de
arquivos podem diferir do seu conhecimento de treino. Leia o guia relevante
em `node_modules/<framework>/dist/docs/` antes de escrever código.
Respeite avisos de depreciação.

## Ambiente de deploy: Hostinger (Node.js gerenciado)

- Não roda `prisma migrate`. Toda mudança de schema = SQL manual no phpMyAdmin.
- Push na `main` = deploy em produção. Rode `npx tsc --noEmit && npx next build` antes.
- Banco: MySQL/MariaDB. `DATABASE_URL` aponta para IP do servidor, não `localhost`.
- Sem `output: 'standalone'` no next.config — quebra o Passenger.
- Variáveis de ambiente: painel da Hostinger, nunca no repo.
