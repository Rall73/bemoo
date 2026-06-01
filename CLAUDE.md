@AGENTS.md

## Documentação do projeto

Antes de planejar ou implementar qualquer feature, consulte:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — como o sistema funciona hoje: modelos, APIs, fluxos, padrões, armadilhas
- **[PIPELINE.md](./PIPELINE.md)** — o que está feito e o que está planejado

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

### APIs e segurança

**Wrappers obrigatórios** — nunca chame `auth()` diretamente em rotas:
- `withAuth(handler, minRole?)` — rotas simples sem `params` dinâmicos
- `withAuthCtx<P>(handler, minRole?)` — rotas com `params` dinâmicos (Next.js 16: `params` é Promise)

```typescript
// Rota simples
export const PATCH = withAuth(async (req, session) => { ... })

// Rota dinâmica
export const GET = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const { id } = params  // já awaited pelo wrapper
})
```

- `validateBody(req, zSchema)` — validação Zod; retorna `{ data }` ou `{ error: NextResponse }`
- `assertSameCompany(sessionCompanyId, resourceCompanyId)` — retorna 403 se divergir
- `assertMinRole(userRole, minRole)` — hierarquia: ADMIN > GESTOR > EXECUTOR > AUDITOR

**Tenant isolation:** toda query de domínio filtra por `companyId` da sessão — **nunca** da URL.

**Auditoria** (`src/lib/audit.ts`):
- `logAction({ companyId, userId, action, entity?, entityId?, payloadBefore?, payloadAfter?, ip? })` — fire-and-forget, nunca lança
- `getIp(req)` — extrai IP do header `x-forwarded-for` ou `x-real-ip`
- Tipo `AuditAction` — usar sempre para type safety (ex.: `"empresa.editada"`, `"modulo.habilitado"`)
- Logar **antes e depois** em mutações relevantes (campo `payloadBefore` / `payloadAfter`)

### Mídia: câmera, microfone, upload (lições já pagas — NÃO repetir)

> Detalhe completo na skill `hostinger-nextjs-playbook` §13 e na memória `project_bemoo.md`.

- **`next.config.mjs` é crítico para mídia:**
  - `Permissions-Policy: camera=(self), microphone=(self)` — com `()` vazio o microfone/câmera **nunca pedem permissão** (popup não aparece)
  - `serverExternalPackages: ["cloudinary", "openai"]` — sem isso o upload/transcrição quebra em runtime
- **Foto:** rota `/api/upload` usa **base64 data URI** (`cloudinary.uploader.upload(dataUri)`), nunca `upload_stream`+preset. No client, `photoUrls` é estado **separado** (`Record<string,string>`), não dentro dos valores do form. Input: `<input type="file" accept="image/*" capture="environment">`.
- **Áudio:** `MediaRecorder` com `isTypeSupported()` + `streamRef` separado + `mr.start(1000)` → `/api/transcribe` → Whisper (`whisper-1`, `language:"pt"`) → texto. **Áudio nunca vai pro Cloudinary** — só a transcrição é salva.
- **Clientes externos (OpenAI/Cloudinary):** lazy singleton, nunca `new OpenAI()` no topo do módulo (falha no build).
- **OpenAI key:** permissão **All** (Whisper não tem toggle em "Restricted").
- **Credencial suspeita:** teste **localmente** com script Node lendo `.env.local` antes de culpar deploy/config (um typo no `CLOUDINARY_CLOUD_NAME` derrubou tudo). Nunca hardcode secret no comando.
- **Antes de portar foto/áudio do check-list:** leia o código que funciona lá primeiro.

### Deploy
- Portão pré-push: `npx tsc --noEmit` → `npx next build` → `git push origin main`
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Sem segredos no repo
- ⚠️ **PowerShell + acentos:** `git commit -m @'...'@` (here-string) falha com caracteres acentuados.
  Use `-m "..."` simples, ou escreva mensagem sem acento no here-string.
