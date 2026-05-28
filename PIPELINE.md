# bemoo — Pipeline de Desenvolvimento

> Documento vivo. Atualizar a cada sprint concluída.
> Última revisão: 2026-05-28
>
> Documentação operacional separada:
> - **[LEGAL-VERSIONING.md](./LEGAL-VERSIONING.md)** — como publicar novas versões de Termos e Política

---

## Visão geral

O bemoo é uma plataforma SaaS multi-módulo para gestão operacional de empresas.
Stack: Next.js 16 + Prisma 6 + Auth.js v5 + MySQL + Tailwind 3.
Deploy: Hostinger Node.js gerenciado — `git push origin main` = rebuild automático.

**Princípio:** segurança e estrutura primeiro — funcionalidade depois.
Não portamos nenhum módulo antes de ter auth, acesso e compliance no lugar.

---

## Fase 0 — Fundação ✅

- [x] Projeto Next.js 16 + Prisma 6 + Auth.js v5
- [x] Deploy na Hostinger (bemoo.net)
- [x] Banco MySQL + tabelas base (`companies`, `users`, `company_modules`)
- [x] Login por credenciais (e-mail + senha)
- [x] Sistema de módulos por empresa (`company_modules`)
- [x] Identidade visual: Paleta verde-petróleo, Logo "Olho atento", componentes UI base
- [x] Landing page (`/`)
- [x] Dashboard base com módulos dinâmicos
- [x] `AGENTS.md` + `CLAUDE.md` + `PIPELINE.md`

---

## Fase 1 — Segurança e Infraestrutura

### 1.1 Middleware ✅
- [x] `src/proxy.ts` — nome correto no Next.js 16 (build confirma `ƒ Proxy (Middleware)`)

### 1.2 Autenticação ✅
- [x] Login com Google OAuth — provider em `auth.ts`, botão nas telas de login e cadastro
  - Fluxo: e-mail já existe → vincula; e-mail novo → cria empresa + usuário automaticamente
  - Credenciais `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` configuradas na Hostinger
  - App publicado no Google Cloud Console (não em modo teste)
- [x] Redefinição de senha — token 1h, uso único, tabela `password_resets`
- [ ] Bloqueio por tentativas — tabela `login_attempts`, 5 falhas → 15 min bloqueado
- [ ] Logout global — campo `tokenVersion` em users; incrementar invalida todos os JWTs

### 1.3 Proteção de rotas e APIs ✅ (parcial)
- [x] `validateBody(req, schema)` — helper Zod em `src/lib/api.ts`; usado em todas as rotas com body
- [x] `withAuth(handler, minRole?)` — wrapper para rotas simples; injeta sessão, trata erros
- [x] `withAuthCtx<P>(handler, minRole?)` — wrapper para rotas dinâmicas com `params`
- [x] `assertSameCompany(sessionCompanyId, resourceCompanyId)` — retorna 403 se divergir
- [x] `assertMinRole(userRole, minRole)` — hierarquia ADMIN > GESTOR > EXECUTOR > AUDITOR
- [x] Isolamento de tenant em todas as rotas: queries sempre filtradas por `companyId` da sessão
- [ ] Rate limiting global — Upstash Redis + `@upstash/ratelimit` (máx 100 req/min por IP)
- [ ] Headers de segurança em `next.config.mjs` (`X-Frame-Options`, `X-Content-Type-Options`, etc.)

### 1.4 Auditoria ✅
- [x] Modelo `AuditLog` no schema Prisma com relações para `Company` e `User`
- [x] `src/lib/audit.ts` — `logAction()` (nunca lança) + `getIp()` + tipo `AuditAction`
- [x] Log plugado em: role change, desativar usuário, convites, empresa editar/suspender/reativar, módulo habilitar/desabilitar, configurações de empresa e conta
- [x] `/plataforma/logs` — tabela paginada com filtros por empresa e ação
- ⚠️ **SQL pendente:** tabela `audit_logs` precisa ser criada no phpMyAdmin (SQL abaixo)

### 1.5 Upload de arquivos (Cloudinary)
- [ ] Conta gratuita em cloudinary.com
- [ ] Env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Rota `POST /api/upload` — autenticada, lista branca de tipos, max 10 MB, pasta por empresa
- [ ] Nunca expor API key no client — upload sempre server-side

---

## Fase 2 — Onboarding e Gestão de Conta

### 2.1 Cadastro self-service ✅
- [x] Página `/cadastro` — nome da empresa, e-mail, senha, aceite dos termos
- [x] Cria `Company` (plano FREE) + `User` (role ADMIN) em `$transaction`
- [x] Grava aceite das versões legais ativas no registro
- [x] Envia e-mail de boas-vindas

### 2.2 Wizard de onboarding — pendente
- [ ] Campo `onboarding_completed_at DATETIME` na tabela `companies`
- [ ] Passo 1 — Perfil da empresa (segmento, tamanho)
- [ ] Passo 2 — Escolha de módulos (FREE = 1 módulo)
- [ ] Passo 3 — Convidar time (opcional, pode pular)
- [ ] Passo 4 — Tela de conclusão com acesso ao dashboard

### 2.3 Convite de usuários ✅
- [x] Tabela `invites` — token hex 32 bytes, expira em 48h, uso único
- [x] Página pública `/aceitar-convite?token=xxx` com formulário de nome + senha
- [x] `POST /api/aceitar-convite` — cria usuário + marca invite + grava aceite legal em `$transaction`
- [x] Reenvio de convite gera novo token + novo prazo (48h)

### 2.4 Gestão de usuários ✅
- [x] `/configuracoes/usuarios` — listar membros ativos e convites pendentes
- [x] Convidar com role; cancelar/reenviar convite; alterar role; desativar com soft delete
- [x] Guards: não pode desativar a si mesmo; deve restar ≥ 1 ADMIN ativo

### 2.5 Configurações ✅
- [x] `/configuracoes/empresa` — editar nome, CNPJ, e-mail de contato (ADMIN only) com badge de plano
- [x] `/configuracoes/conta` — editar nome de exibição; alterar senha com verificação da atual; badge Google para usuários sem senha
- [ ] `/configuracoes/modulos` — ver módulos ativos da empresa (informativo)
- [ ] `/configuracoes/meus-dados` — exportar dados pessoais (LGPD 5.3)

### 2.6 Redefinição de senha ✅
- [x] Tabela `password_resets` — token 1h, uso único
- [x] `/redefinir-senha` — formulário de e-mail → envia link
- [x] `/redefinir-senha?token=xxx` — formulário de nova senha

---

## Fase 3 — Painel de Plataforma (super admin) ✅

> Guard em `(app)/plataforma/layout.tsx` verifica `platformAdmin` server-side.

- [x] `/plataforma/empresas` — listagem com busca + filtros por plano/status + toggle de suspensão inline
- [x] `/plataforma/empresas/nova` — criar empresa + admin + módulos iniciais + envia e-mail de reset
- [x] `/plataforma/empresas/[id]` — editar dados, suspender/reativar, lista de usuários
- [x] `/plataforma/empresas/[id]/modulos` — toggles individuais por módulo com switch animado
- [x] `/plataforma/usuarios` — todos os usuários de todas as empresas
- [x] `/plataforma/metricas` — totais, distribuição por plano, módulos mais usados
- [x] `/plataforma/logs` — audit logs paginados com filtros por empresa e ação

---

## Fase 4 — E-mail Transacional ✅

> Nodemailer + SMTP Hostinger. `noreply@bemoo.net` configurado.
> Transporter criado dentro da função (nunca singleton). `tls: { rejectUnauthorized: false }`.

| Template | Disparado quando | Status |
|---|---|---|
| `boas-vindas` | Cadastro self-service concluído | ✅ |
| `convite` | ADMIN convida colaborador | ✅ |
| `redefinir-senha` | Reset de senha / nova empresa pelo admin | ✅ |
| `notificacao-intercorrencia` | Intercorrência aberta | ⏳ Fase 6.2 |
| `checklist-atrasado` | Checklist não executado no prazo | ⏳ Fase 9 |
| `acao-vencida` | Ação de plano com prazo ultrapassado | ⏳ Fase 9 |

---

## Fase 5 — Compliance e Legal

### 5.1 Páginas obrigatórias ✅
- [x] `/privacidade` — Política de Privacidade LGPD (bases legais, retenção, direitos do titular)
- [x] `/termos` — Termos de Uso (12 seções, lei brasileira)
- [x] Cookie consent — banner na primeira visita; aceite em `localStorage`

### 5.2 Versionamento de documentos legais ✅

> Documentação completa: [LEGAL-VERSIONING.md](./LEGAL-VERSIONING.md)

- [x] `legal_versions` — versões publicadas com data de vigência
- [x] `legal_acceptances` — registro imutável por usuário (userId + versionId + IP + timestamp)
- [x] `LegalGate` — bloqueia o app até o usuário aceitar versões pendentes
- [x] `POST /api/legal/accept` — valida IDs contra versões ativas antes de gravar
- [x] `POST /api/legal/versions` — publica nova versão (platform admin only)
- [x] Cadastro e convite aceitam automaticamente versões ativas no momento

### 5.3 Direitos do titular (LGPD) — pendente
- [ ] `/configuracoes/meus-dados` — exportar dados pessoais em JSON
- [ ] Anonimização 30 dias após solicitação de exclusão
- [ ] Logs de auditoria retidos por 5 anos

---

## Fase 6 — Módulos

> Fluxo obrigatório: schema → SQL phpMyAdmin → aguardar confirmação → código.
> Referência: `C:\Users\Ricardo\Blog\check-list\`

### 6.1 Checklists — próximo
- [ ] Schema: `checklists`, `checklist_items`, `checklist_executions`, `execution_items`
- [ ] Criação e gestão de modelos de checklist
- [ ] Execução com registro de temperatura e conformidade por item
- [ ] Registro de ocorrência inline durante execução
- [ ] Histórico de execuções com filtros
- [ ] Dashboard com KPIs (conformidade %, pendentes, atrasados)
- [ ] Export PDF e Excel
- [ ] Roles: ADMIN/GESTOR cria modelos; EXECUTOR executa; AUDITOR só lê

### 6.2 Intercorrências
- [ ] Schema: `intercorrencias`, `intercorrencia_acompanhamentos`, `intercorrencia_anexos`
- [ ] Abertura manual ou automática via checklist
- [ ] Classificação: tipo, gravidade, setor, responsável
- [ ] Timeline de acompanhamentos com anexos
- [ ] Notificação por e-mail ao abrir
- [ ] Dashboard com KPIs

### 6.3 Rastreabilidade
- [ ] Schema: `ativos`, `ativo_movimentacoes`, `ativo_manutencoes`
- [ ] Cadastro de ativos com QR code
- [ ] Movimentações e histórico de manutenções

### 6.4 Planos de Ação
- [ ] Schema: `planos`, `plano_acoes`, `acao_acompanhamentos`
- [ ] Metodologia 5W2H, progresso visual, vinculação a intercorrências

### 6.5 Captura
- [ ] Schema: `demandas` (tipo: DEMANDA | TAREFA | IDEIA)
- [ ] Referência: `C:\Users\Ricardo\Blog\demandoo\`

---

## Fase 7 — Inteligência Artificial
- [ ] `src/lib/ai.ts` — wrapper OpenAI com timeout, retry (3x) e fallback
- [ ] Sugestão de intercorrência em checklist; classificação em captura; resumo para WhatsApp

## Fase 8 — WhatsApp
- [ ] Z-API (zapi.io, ~R$97/mês) — `src/lib/whatsapp.ts`
- [ ] Notificações: intercorrência aberta, checklist atrasado, ação vencida

## Fase 9 — Cron Jobs
- [ ] cron-job.org + rotas `GET /api/cron/[job]` protegidas por `CRON_SECRET`
- [ ] Jobs: checklists atrasados, ações vencidas, limpar tokens expirados, relatório semanal

## Fase 10 — Monitoramento
- [ ] Sentry (`@sentry/nextjs`) — erros em produção
- [ ] UptimeRobot — alerta se o site cair
- [ ] `npm audit` antes de cada merge

## Fase 11 — Billing (quando produto validado)
- [ ] Stripe ou PagSeguro, webhooks de pagamento, e-mails de cobrança

---

## SQL pendente — rodar no phpMyAdmin

```sql
-- audit_logs (necessário para /plataforma/logs funcionar)
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INT          NOT NULL AUTO_INCREMENT,
  company_id    INT          NOT NULL,
  user_id       INT          NOT NULL,
  action        VARCHAR(100) NOT NULL,
  entity        VARCHAR(100) NULL,
  entity_id     INT          NULL,
  payload_before TEXT         NULL,
  payload_after  TEXT         NULL,
  ip            VARCHAR(45)  NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_audit_company (company_id),
  INDEX idx_audit_user    (user_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Serviços externos

| Serviço | Uso | Custo | Status |
|---|---|---|---|
| Google OAuth | Login social | Grátis | ✅ Ativo |
| Hostinger SMTP | E-mail transacional | Incluso | ✅ Ativo |
| Cloudinary | Upload imagens/PDFs | Free 25 GB | ⏳ Pendente |
| OpenAI | IA | ~$0.01/req | ⏳ Fase 7 |
| Z-API | WhatsApp Business | ~R$97/mês | ⏳ Fase 8 |
| Upstash Redis | Rate limiting | Free 10k req/dia | ⏳ Fase 1.3 |
| Sentry | Monitoramento de erros | Free 5k events/mês | ⏳ Fase 10 |
| UptimeRobot | Uptime | Grátis | ⏳ Fase 10 |
| cron-job.org | Cron jobs | Grátis | ⏳ Fase 9 |

---

## Resumo do estado atual

```
✅ CONCLUÍDO
  0    Fundação (Next.js 16, Prisma, Auth, deploy)
  1.1  Middleware (proxy.ts)
  1.2  Auth: login Google + OAuth publicado + redefinição de senha
  1.3  APIs: withAuth, withAuthCtx, validateBody, assertSameCompany, assertMinRole
  1.4  Auditoria: audit_logs schema + logAction + /plataforma/logs
  2.1  Cadastro self-service
  2.3  Convite de usuários (envio, reenvio, cancelamento, aceite)
  2.4  Gestão de usuários (/configuracoes/usuarios)
  2.5  Configurações: /configuracoes/empresa + /configuracoes/conta
  2.6  Redefinição de senha
  3    Painel de plataforma completo (empresas, módulos, usuários, métricas, logs)
  4    E-mail transacional (boas-vindas, convite, reset)
  5.1  /privacidade + /termos + cookie consent
  5.2  Versionamento legal + LegalGate

⏳ PRÓXIMO (em ordem de prioridade)
  ⚠️  SQL audit_logs no phpMyAdmin (pendente)
  6.1  Checklists — primeiro módulo (schema → SQL → código)
  1.5  Cloudinary upload (requer conta gratuita)
  2.2  Wizard de onboarding
  1.3  Rate limiting (Upstash) + headers de segurança

🔮 DEPOIS
  6.2–6.5  Demais módulos
  7  IA · 8  WhatsApp · 9  Cron · 10  Sentry · 11  Billing
```

---

## Checklist pré-lançamento público

- [x] Middleware ativo (build mostra `ƒ Proxy (Middleware)`)
- [x] Validação Zod em todas as rotas com body
- [x] Todas as rotas verificam `companyId` da sessão
- [x] Login com Google funcionando em produção
- [x] Nenhum segredo no repositório
- [x] `/privacidade` e `/termos` no ar
- [x] Cookie consent ativo
- [x] E-mail transacional funcionando
- [ ] SQL audit_logs rodado no phpMyAdmin
- [ ] Rate limiting (Upstash)
- [ ] Backup diário habilitado na Hostinger
- [ ] Sentry configurado
- [ ] UptimeRobot monitorando
- [ ] `npm audit` sem vulnerabilidades `high` ou `critical`
