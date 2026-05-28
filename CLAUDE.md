@AGENTS.md

## Projeto: bemoo

Plataforma SaaS multi-módulo para gestão operacional de empresas.
GitHub: https://github.com/Rall73/bemoo.git
Stack: Next.js 16 + Prisma 6 + Auth.js v5 + MySQL + Tailwind 3

## Módulos previstos

- **Checklists** — listas de verificação com temperatura e ocorrências
- **Intercorrências** — registro e acompanhamento de eventos
- **Rastreabilidade** — controle de ativos e equipamentos
- **Planos de Ação** — gestão de ações corretivas/preventivas
- **Captura** — demandas, tarefas e ideias

## Identidade visual

- Paleta A (verde-petróleo): primary `#1F4E4A`, accent `#E07A35`
- Logo: conceito A "Olho atento" — "oo" como íris + pupila
- Typography: Manrope (institutional), Inter (body), JetBrains Mono (code)
- Tokens em `src/lib/tokens.ts`

## Convenções obrigatórias

### Banco de dados
- Provider: MySQL (`datasource db { provider = "mysql" }`)
- Schema alterado? Gere o SQL equivalente e entregue ao usuário antes de escrever código dependente.
- Soft delete em toda entidade de domínio: `deletedAt DateTime?` + `deletedBy Int?`
- Toda query filtra `deletedAt: null`
- Toda tabela de domínio carrega `companyId` (isolamento de tenant)

### Fuso horário
- Servidor roda em UTC; usuários estão em Brasília (UTC-3)
- Nunca `new Date()` cru em rota de API para "hoje" ou data relativa
- Usar helpers de `src/lib/date.ts`: `hojeNoBrasil()`, `inicioMesNoBrasil()`

### UI
- Ícones: sempre `lucide-react` (nunca emoji como ícone de navegação/ação)
- Todo `<input>` e `<select>` precisa de `text-gray-800 bg-white` nas classes
- Ícone: `size={20}` navegação, `strokeWidth={2}`
- Componentes base em `src/components/ui/`

### Módulos
- Novos módulos entram em `src/lib/modules.ts` (MODULES_CONFIG)
- Habilitar módulo para empresa: insert em `company_modules`
- Middleware verifica autenticação; acesso ao módulo é verificado no layout `(app)`

### Deploy
- Portão pré-push: `npx tsc --noEmit` → `npx next build` → `git push origin main`
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Sem segredos no repo
