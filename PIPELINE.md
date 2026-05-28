# bemoo — Pipeline de Desenvolvimento

> Documento vivo. Atualizar a cada sprint concluída.
> Última revisão: 2026-05-28
>
> Documentação operacional separada:
> - **[LEGAL-VERSIONING.md](./LEGAL-VERSIONING.md)** — como publicar novas versões de Termos e Política

---

## Visão geral

O bemoo é uma plataforma SaaS multi-módulo para gestão operacional de empresas.
A base técnica está pronta (Next.js 16 + Prisma + Auth.js + MySQL na Hostinger).
Este documento organiza tudo o que precisa ser construído, na ordem certa.

**Princípio:** segurança e estrutura primeiro — funcionalidade depois.
Não portamos nenhum módulo antes de ter auth, acesso e compliance no lugar.

---

## Fase 0 — Fundação (concluída)

- [x] Projeto Next.js 16 + Prisma + Auth.js v5
- [x] Deploy na Hostinger (bemoo.net)
- [x] Banco MySQL + tabelas base (companies, users, company_modules)
- [x] Login por credenciais
- [x] Sistema de módulos por empresa (company_modules)
- [x] Identidade visual: Paleta A, Logo "Olho atento", componentes UI
- [x] Landing page
- [x] Dashboard base com módulos dinâmicos
- [x] AGENTS.md + CLAUDE.md + PIPELINE.md

---

## Fase 1 — Segurança e Infraestrutura

> Nada vai para usuários reais antes desta fase estar completa.

### 1.1 Middleware (concluído)

- [x] **Arquivo correto: `src/proxy.ts`** — no Next.js 16 o nome obrigatório é `proxy.ts`
  - Build confirma com `ƒ Proxy (Middleware)` no output
  - Atenção: versões anteriores usavam `middleware.ts` — Next.js 16 inverteu a convenção

### 1.2 Autenticação reforçada

- [ ] **Login com Google (OAuth)**
  - Configurar projeto em console.cloud.google.com
  - Env vars: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
  - Tabela `accounts` para vincular provedor à conta existente
  - Fluxo: e-mail já existe → vincula; e-mail novo → cria empresa + usuário
- [ ] **Bloqueio por tentativas**
  - Tabela `login_attempts (ip, email, attempts, blocked_until)`
  - Após 5 falhas: bloquear por 15 min
  - Middleware de rate limit na rota `/api/auth/callback/credentials`
- [ ] **Expiração de sessão** — JWT expira em 8h; renovação silenciosa
- [ ] **Logout global** — campo `tokenVersion INT` na tabela users;
  incrementar invalida todos os tokens ativos daquele usuário

### 1.3 Proteção de rotas e APIs

- [ ] **Rate limiting global** — máx 100 req/min por IP em rotas `/api/`
  - Solução recomendada: Upstash Redis + `@upstash/ratelimit` (free tier)
- [ ] **Headers de segurança** — adicionar em `next.config.mjs`:
  ```
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=()
  ```
- [ ] **Validação de entrada com Zod** — em todos os endpoints de API
  - Nunca confiar em dados do client; validar schema antes de qualquer query Prisma
- [ ] **Isolamento de tenant** — helper `assertSameCompany(session, resourceCompanyId)`
  - Lança 403 se o recurso não pertencer à empresa da sessão
  - Aplicar em TODAS as rotas que acessam dados

### 1.4 Auditoria

- [ ] Tabela `audit_logs`:
  ```sql
  id, company_id, user_id, action, entity, entity_id,
  payload_before JSON, payload_after JSON, ip, created_at
  ```
- [ ] Registrar: login, logout, criação, edição, exclusão, convite, alteração de role
- [ ] Helper `src/lib/audit.ts` — `logAction({ session, action, entity, ... })`

### 1.5 Upload de arquivos (Cloudinary)

- [ ] Env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] Rota `POST /api/upload`:
  - Autenticação obrigatória
  - Tipos permitidos: jpg, png, pdf, xlsx (lista branca)
  - Limite: 10 MB por arquivo
  - Pasta por empresa: `bemoo/{companyId}/`
- [ ] Nunca expor API key no client — upload sempre server-side

---

## Fase 2 — Onboarding e Gestão de Conta

### 2.1 Cadastro self-service

- [ ] Página `/cadastro`:
  - Campos: nome da empresa, e-mail, senha, aceite dos termos (obrigatório)
  - Validação: e-mail único, senha mínimo 8 chars com número
  - Cria Company (plano FREE) + User (role ADMIN)
  - Envia e-mail de boas-vindas
  - Redireciona para wizard de onboarding

### 2.2 Wizard de onboarding (pós-cadastro)

- [ ] Campo `onboarding_completed_at DATETIME` na tabela companies
- [ ] Passo 1 — Perfil: nome fantasia, segmento, tamanho da empresa
- [ ] Passo 2 — Módulos: quais deseja experimentar (FREE = 1 módulo)
- [ ] Passo 3 — Time: convidar colaboradores por e-mail (opcional, pode pular)
- [ ] Passo 4 — Concluído: tela de celebração + acesso ao dashboard

### 2.3 Convite de usuários

- [ ] Tabela `invites (id, company_id, email, role, token, expires_at, accepted_at)`
- [ ] Fluxo: ADMIN convida → e-mail com link tokenizado → convidado define senha
- [ ] Token expira em 48h; reenvio disponível; uso único

### 2.4 Gestão de usuários

- [ ] `/configuracoes/usuarios` — listar, convidar, editar role, desativar
- [ ] Papéis de acesso:

  | Role | O que pode fazer |
  |---|---|
  | ADMIN | Tudo: configurações, usuários, módulos |
  | GESTOR | Criar/editar registros; ver relatórios |
  | EXECUTOR | Criar/editar próprios registros |
  | AUDITOR | Somente leitura em tudo |

### 2.5 Configurações da empresa

- [ ] `/configuracoes/empresa` — nome, logo, CNPJ, e-mail de contato
- [ ] `/configuracoes/conta` — trocar senha, vincular Google, foto de perfil
- [ ] `/configuracoes/modulos` — ver módulos ativos (admin de plataforma ativa/desativa)

### 2.6 Redefinição de senha

- [ ] Tabela `password_resets (email, token, expires_at, used_at)`
- [ ] Página `/redefinir-senha` com formulário de e-mail
- [ ] Página `/redefinir-senha?token=xxx` para nova senha
- [ ] Token expira em 1h; uso único

---

## Fase 3 — Painel de Plataforma (super admin)

> Grupo de rota `(plataforma)`, protegido por `platformAdmin = true` no layout.
> Nunca depender só de ocultar o link — verificar no servidor.

- [ ] `/plataforma/empresas` — listar, buscar, filtrar por plano/status
- [ ] `/plataforma/empresas/[id]` — detalhes, editar plano, suspender/reativar
- [ ] `/plataforma/empresas/[id]/modulos` — toggles de módulos
- [ ] `/plataforma/empresas/nova` — criar empresa manualmente (vendas diretas)
- [ ] `/plataforma/usuarios` — todos os usuários da plataforma
- [ ] `/plataforma/logs` — audit_logs paginado com filtros
- [ ] `/plataforma/metricas` — empresas ativas, usuários, módulos mais usados

---

## Fase 4 — E-mail Transacional

> Nodemailer + SMTP Hostinger. Senha do mailbox: apenas alphanum + `_` (sem `#@!$`).

- [ ] Criar caixa: `noreply@bemoo.net` no painel Hostinger
- [ ] `src/lib/mailer.ts` — função `sendMail({ to, subject, html })`
  - Criar transporter dentro da função (nunca singleton de módulo)
  - `tls: { rejectUnauthorized: false }`
- [ ] Templates em `src/emails/`:

  | Template | Disparado quando |
  |---|---|
  | `boas-vindas` | Cadastro concluído |
  | `convite` | ADMIN convida colaborador |
  | `redefinir-senha` | Solicitação de reset |
  | `notificacao-intercorrencia` | Intercorrência aberta |
  | `checklist-atrasado` | Checklist não executado no prazo |
  | `acao-vencida` | Ação de plano com prazo ultrapassado |

---

## Fase 5 — Compliance e Legal

> Deve estar no ar antes de qualquer divulgação pública.

### 5.1 Páginas obrigatórias (concluída)

- [x] `/privacidade` — Política de Privacidade (LGPD):
  - Quais dados coletamos e por quê
  - Base legal de cada tratamento (tabela)
  - Tempo de retenção por categoria (tabela)
  - Direitos do titular: acesso, correção, exclusão, portabilidade (art. 18 LGPD)
  - Contato do encarregado (DPO): privacidade@bemoo.net
- [x] `/termos` — Termos de Uso (12 seções, lei brasileira)
- [x] Cookie consent — banner na primeira visita; aceite em `localStorage`

### 5.2 Versionamento de documentos legais (concluída)

> Documentação completa: [LEGAL-VERSIONING.md](./LEGAL-VERSIONING.md)

- [x] Tabela `legal_versions` — versões publicadas (type, versão, resumo, vigência)
- [x] Tabela `legal_acceptances` — registro imutável de cada aceite (userId, versionId, timestamp, IP)
- [x] `LegalGate` — bloqueio suave no app: exibe tela de aceite se houver versão pendente
- [x] `POST /api/legal/accept` — grava aceite(s) com validação de IDs ativos
- [x] `POST /api/legal/versions` — publica nova versão (platform admin)
- [x] `GET /api/legal/versions` — retorna versões ativas
- [x] Cadastro grava aceite das versões ativas no momento do registro
- [x] Badge de versão nas páginas `/termos` e `/privacidade`

### 5.3 Direitos do titular (LGPD)

- [ ] `/configuracoes/meus-dados` — exportar dados pessoais em JSON
- [ ] Solicitação de exclusão: soft delete + anonimização após 30 dias
- [ ] Logs de auditoria mantidos por 5 anos (obrigação legal)

---

## Fase 6 — Módulos (portagem do check-list)

> Cada módulo segue o fluxo: schema → SQL phpMyAdmin → aguardar confirmação → código.
> Referência: `C:\Users\Ricardo\Blog\check-list\`

### 6.1 Checklists (prioridade alta)

- [ ] Schema: `checklists`, `checklist_items`, `checklist_executions`, `execution_items`
- [ ] Funcionalidades:
  - Criação e gestão de modelos
  - Execução com registro de temperatura e conformidade
  - Registro de ocorrência inline durante execução
  - Histórico e relatório de execuções
  - Dashboard com KPIs (conformidade, pendentes, atrasados)
  - Export PDF e Excel
- [ ] Roles: ADMIN/GESTOR cria modelos; EXECUTOR executa; AUDITOR só lê

### 6.2 Intercorrências (prioridade alta)

- [ ] Schema: `intercorrencias`, `intercorrencia_acompanhamentos`, `intercorrencia_anexos`
- [ ] Funcionalidades:
  - Abertura manual ou automática via checklist
  - Classificação: tipo, gravidade, setor, responsável
  - Timeline de acompanhamentos com anexos
  - Encerramento com registro de resolução
  - Notificação por e-mail e WhatsApp ao abrir
  - Dashboard com KPIs (abertas, por gravidade, tempo médio de resolução)

### 6.3 Rastreabilidade (prioridade média)

- [ ] Schema: `ativos`, `ativo_movimentacoes`, `ativo_manutencoes`
- [ ] Funcionalidades:
  - Cadastro de ativos com QR code gerado
  - Movimentações entre locais e responsáveis
  - Histórico de manutenções preventivas e corretivas
  - Alertas de vencimento de calibração/manutenção

### 6.4 Planos de Ação (prioridade média)

- [ ] Schema: `planos`, `plano_acoes`, `acao_acompanhamentos`
- [ ] Funcionalidades:
  - Criação com metodologia 5W2H
  - Ações com responsável, prazo e evidência
  - Progresso visual por plano
  - Vinculação a intercorrências (causa raiz)

### 6.5 Captura (prioridade baixa — já existe no demandoo)

- [ ] Schema: `demandas` (tipo: DEMANDA | TAREFA | IDEIA)
- [ ] Referência completa: `C:\Users\Ricardo\Blog\demandoo\`
- [ ] Integração: captura pode gerar intercorrência ou plano de ação

---

## Fase 7 — Inteligência Artificial

> OpenAI já integrado no check-list. Centralizar em `src/lib/ai.ts`.

- [ ] `src/lib/ai.ts` — wrapper com timeout, retry (3x) e fallback gracioso
- [ ] Log de tokens consumidos por empresa (para billing futuro)
- [ ] Funcionalidades:

  | Funcionalidade | Módulo | Descrição |
  |---|---|---|
  | Classificação automática | Captura | Categorizar captura em Demanda/Tarefa/Ideia |
  | Sugestão de intercorrência | Checklists | Temperatura fora do range → sugerir abertura |
  | Resumo para WhatsApp | Intercorrências | Resumir intercorrência em mensagem curta |
  | Sugestão de causa raiz | Planos de Ação | Sugerir 5W2H baseado na intercorrência |

---

## Fase 8 — WhatsApp

> Z-API (brasileiro, WhatsApp Business API, ~R$97/mês).

- [ ] Conta Z-API: zapi.io
- [ ] Env vars: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`
- [ ] `src/lib/whatsapp.ts` — `sendWhatsApp({ phone, message })`
- [ ] Nunca enviar em dev — verificar `NODE_ENV !== 'production'`
- [ ] Notificações:
  - Intercorrência aberta → responsável + gestor
  - Checklist com atraso → executor responsável
  - Ação vencida → responsável pela ação
- [ ] Configuração por empresa: habilitar/desabilitar, número do responsável

---

## Fase 9 — Cron Jobs

> cron-job.org chama rotas protegidas por `CRON_SECRET`.

- [ ] Rota padrão: `GET /api/cron/[job]` com `Authorization: Bearer {CRON_SECRET}`
- [ ] Middleware deve ter exceção: `pathname.startsWith("/api/cron")`
- [ ] Jobs planejados:

  | Job | Frequência | Ação |
  |---|---|---|
  | `checklists-atrasados` | Diário 08h BRT | Notificar checklists não executados |
  | `acoes-vencidas` | Diário 08h BRT | Notificar ações de plano no prazo |
  | `limpar-tokens` | Semanal | Deletar tokens expirados (invites, resets) |
  | `relatorio-semanal` | Semanal | E-mail de resumo para gestores |

---

## Fase 10 — Monitoramento e Qualidade

- [ ] **Sentry** — `@sentry/nextjs` para rastrear erros em produção
- [ ] **UptimeRobot** (free) — alerta por e-mail se o site cair
- [ ] **npm audit** — rodar antes de cada merge; corrigir vulnerabilidades `high`
- [ ] **Testes smoke** — ao menos as rotas críticas: auth, upload, módulos principais

---

## Fase 11 — Planos e Billing (futuro)

> Estrutura para quando o produto estiver validado com usuários reais.

| Plano | Usuários | Módulos | Storage |
|---|---|---|---|
| FREE | 3 | 1 | 500 MB |
| STARTER | 10 | 3 | 5 GB |
| PROFESSIONAL | 50 | 5 | 20 GB |
| ENTERPRISE | ilimitado | 5 | ilimitado |

- [ ] Integração Stripe ou PagSeguro (pagamento em BRL)
- [ ] Webhooks de pagamento → atualizar `company.plan`
- [ ] E-mails de trial expirando, cobrança, cancelamento

---

## Serviços externos a contratar

| Serviço | Uso | Custo | Link |
|---|---|---|---|
| Google OAuth | Login social | Grátis | console.cloud.google.com |
| Cloudinary | Upload de arquivos | Free 25 GB | cloudinary.com |
| OpenAI | IA | ~$0.01/req | platform.openai.com |
| Z-API | WhatsApp Business | ~R$97/mês | zapi.io |
| Upstash Redis | Rate limiting | Free 10k req/dia | upstash.com |
| Sentry | Monitoramento de erros | Free 5k events/mês | sentry.io |
| UptimeRobot | Uptime | Grátis | uptimerobot.com |
| cron-job.org | Cron jobs | Grátis | cron-job.org |

---

## Ordem de execução recomendada

```
AGORA
  1.1  Renomear proxy.ts → middleware.ts
  1.3  Validação Zod + isolamento de tenant
  1.4  Auditoria (audit_logs)
  1.5  Cloudinary upload

SEMANA 1
  2.1  Cadastro self-service
  2.3  Convite de usuários
  2.6  Redefinição de senha
  4    E-mail transacional (mailer + templates)

SEMANA 2
  2.2  Wizard onboarding
  2.4  Gestão de usuários
  2.5  Configurações
  5    Páginas /privacidade + /termos + cookie consent

SEMANA 3
  1.2  Google OAuth
  3    Painel de plataforma (super admin)

SEMANAS 4-8 (módulos — nesta ordem)
  6.1  Checklists
  6.2  Intercorrências
  6.3  Rastreabilidade
  6.4  Planos de Ação
  6.5  Captura

APÓS MÓDULOS ESTÁVEIS
  7    IA
  8    WhatsApp
  9    Cron jobs
  10   Sentry + UptimeRobot

QUANDO PRODUTO VALIDADO
  11   Billing
```

---

## Checklist pré-lançamento público

- [ ] middleware.ts ativo (build mostra `ƒ Proxy (Middleware)`)
- [ ] Todas as rotas de API validam com Zod
- [ ] Todas as rotas verificam `companyId` da sessão
- [ ] Nenhum segredo no repositório
- [ ] `/privacidade` e `/termos` no ar
- [ ] Cookie consent ativo
- [ ] E-mail transacional funcionando
- [ ] Backup diário habilitado na Hostinger
- [ ] Sentry ou similar configurado
- [ ] UptimeRobot monitorando
- [ ] `npm audit` sem vulnerabilidades `high` ou `critical`
