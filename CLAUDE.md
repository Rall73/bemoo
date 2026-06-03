# bemoo — Contexto para o Claude

## Stack
Next.js 16 (App Router) + Prisma 6 + Auth.js v5 + MySQL + Tailwind 3 + TypeScript
Deploy: Hostinger Node.js gerenciado — `git push origin main` = rebuild automático.
Sem `prisma migrate`: toda mudança de schema = SQL manual no phpMyAdmin.

## Documentação de referência
Consulte antes de planejar qualquer feature:
- `_docs/ARCHITECTURE.md` — modelos, APIs, fluxos, armadilhas conhecidas
- `_docs/PIPELINE.md` — o que está feito e o que vem a seguir

---

## Regras críticas — todas obrigatórias

### 1. Deploy
Antes de qualquer `git push origin main`: `npx tsc --noEmit && npx next build`.
Commit sem acentos no here-string do PowerShell (usar `-m "..."` simples).
Variáveis de ambiente: apenas no painel da Hostinger, nunca no repo.
Sem `output: 'standalone'` no next.config — quebra o Passenger.

### 2. Banco de dados (MySQL)
Schema alterado? Sequência obrigatória:
1. Alterar `prisma/schema.prisma`
2. Gerar o SQL equivalente e entregar ao usuário
3. Aguardar "rodei o SQL"
4. `npx prisma generate`
5. Código que depende do campo novo

Soft delete em toda entidade de domínio: `deletedAt DateTime?` + `deletedBy Int?`.
Toda query filtra `deletedAt: null` + `companyId` da sessão (nunca da URL).

### 3. Fuso horário — duas regras, ambas obrigatórias

**Backend/API:** nunca `new Date()` cru. Usar `hojeNoBrasil()` / `inicioMesNoBrasil()` de `src/lib/date.ts`.

**Frontend (qualquer componente, inclusive Server Components e reportDocx):**
```tsx
// ✅ helpers prontos
import { formatarData, formatarDataHora } from "@/lib/date"

// ✅ inline correto
new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })

// ❌ ERRADO — exibe hora 3h adiantada (usa UTC do servidor)
new Date(iso).toLocaleDateString("pt-BR")
```
Já custou um fix em 13 arquivos. Não repetir.

### 4. Autenticação e segurança de API
Nunca chamar `auth()` diretamente em rotas. Usar os wrappers:
```typescript
// Rota simples
export const PATCH = withAuth(async (req, session) => { ... })

// Rota com params dinâmicos (Next.js 16: params é Promise)
export const GET = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const { id } = params  // já awaited pelo wrapper
})
```
- `validateBody(req, zSchema)` — validação Zod em toda rota com body
- `assertSameCompany(sessionCompanyId, resourceId)` — 403 se tenant divergir
- `assertMinRole(role, minRole)` — hierarquia: ADMIN > GESTOR > EXECUTOR > AUDITOR
- `withPlatformAdmin(handler)` — painel `/plataforma`

### 5. Foto e áudio (lições pagas — não repetir)
- **Foto:** rota `/api/upload` usa base64 data URI, nunca `upload_stream`. `photoUrls` = estado separado no client (`Record<string,string>`), não dentro dos valores do form.
- **Áudio:** nunca vai pro Cloudinary — só a transcrição é salva. MediaRecorder com `isTypeSupported()`.
- **`next.config.mjs` crítico:** `Permissions-Policy: camera=(self), microphone=(self)` (parênteses vazios = câmera nunca pede permissão). `serverExternalPackages: ["cloudinary", "openai"]` obrigatório.
- Clientes OpenAI/Cloudinary: lazy singleton, nunca `new OpenAI()` no topo do módulo.
- Testar credencial localmente com script Node antes de culpar deploy.

### 6. UI e componentes
- Ícones: sempre `lucide-react` — nunca emoji como ícone de navegação/ação
- Todo `<input>` e `<select>`: classes `text-gray-800 bg-white`
- Ícone de navegação: `size={20}`, `strokeWidth={2}`
- Componentes base em `src/components/ui/`
- **Nunca** event handlers (`onChange`, `onClick`, `onSubmit`) em Server Components — build passa mas Passenger crasha em runtime (ERROR 4093732788). Mover para arquivo filho com `"use client"`.

### 7. Novos módulos
Registrar em `src/lib/modules.ts` (MODULES_CONFIG). Habilitar por empresa: insert em `company_modules`.

### 8. Auditoria
`logAction(...)` de `src/lib/audit.ts` — fire-and-forget, nunca lança.
Logar `payloadBefore` + `payloadAfter` em toda mutação relevante.
`AuditAction` é union type — adicionar ao union ao criar nova ação.

---

## Identidade visual (resumo)
- Paleta: primary `#1F4E4A` (verde-petróleo), accent `#E07A35`
- Typography: Manrope (institucional), Inter (body), JetBrains Mono (código)
- Tokens em `src/lib/tokens.ts` · Referência completa: `_docs/IDENTIDADE-VISUAL.md`
