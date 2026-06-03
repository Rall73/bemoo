# bemoo — Pipeline de Desenvolvimento

> Última revisão: 2026-06-02
> Detalhe completo de cada fase: histórico preservado abaixo em "Fases concluídas".

---

## Estado atual

**Em produção:** sistema de checklists completo (módulo 6.1)
- CRUD de modelos (3 níveis: checklist → seção → campo)
- Execução com foto, áudio (Whisper), N/A, refs normativas
- Relatórios .docx (básico e com análise IA via GPT)
- Templates globais: ISO 9001:2015 (13 seções, 72 campos, id=4)
- Painel de plataforma, auditoria, legal gate, onboarding self-service

---

## Próximo (em ordem de prioridade)

| # | O que | Notas |
|---|---|---|
| 1 | **Dashboard de checklists** (6.1+) | KPIs: conformidade %, pendentes, atrasados |
| 2 | **Wizard de onboarding** (2.2) | Campo `onboarding_completed_at` em `companies` |
| 3 | **Rate limiting** (1.3) | Upstash Redis + `@upstash/ratelimit` |
| 4 | **Intercorrências** (6.2) | Novo schema; aguarda definição dos campos |

---

## Depois

- 6.3 Rastreabilidade · 6.4 Planos de Ação · 6.5 Captura
- 7 IA avançada · 8 WhatsApp (Z-API) · 9 Cron jobs · 10 Sentry · 11 Billing

---

## Checklist pré-lançamento público

- [x] Middleware, Zod, companyId em todas as rotas, Google OAuth, segredos fora do repo
- [x] `/privacidade`, `/termos`, cookie consent, e-mail transacional
- [ ] Rate limiting (Upstash)
- [ ] Backup diário habilitado na Hostinger
- [ ] Sentry + UptimeRobot
- [ ] `npm audit` sem vulnerabilidades high/critical

---

## Serviços externos ativos

| Serviço | Uso | Status |
|---|---|---|
| Hostinger SMTP | E-mail `noreply@bemoo.net` | ✅ |
| Cloudinary `dxuofvx3i` | Fotos + relatórios .docx | ✅ |
| OpenAI (chave All) | Whisper + GPT-4o-mini | ✅ |
| Google OAuth | Login social | ✅ |

---

## Fases concluídas (referência rápida)

```
0    Fundação: Next.js 16, Prisma, Auth.js v5, deploy Hostinger
1.1  Middleware (src/proxy.ts)
1.2  Login Google + redefinição de senha
1.3  withAuth, withAuthCtx, validateBody, assertSameCompany, assertMinRole
1.4  Auditoria: audit_logs + logAction + /plataforma/logs
1.5  Cloudinary: upload base64, server-side, pasta por empresa
1.6  Whisper: transcrição de áudio (/api/transcribe)
2.1  Cadastro self-service (Company FREE + User ADMIN em $transaction)
2.3  Convites: limite por plano, reenvio, audit de e-mail
2.4  Gestão de usuários (roles, soft delete, contador de slots)
2.5  Configurações empresa + conta
2.6  Redefinição de senha
3    Painel plataforma: empresas, usuários, métricas, logs, templates
4    E-mail transacional: boas-vindas, convite, reset
5.1  /privacidade + /termos + cookie consent
5.2  Versionamento legal + LegalGate
6.1  Checklists completo (ver estado atual acima)
```

SQL já rodado no phpMyAdmin: audit_logs, checklists, checklist_items,
checklist_item_fields, checklist_executions, execution_field_values,
companies.feature_audio (TINYINT).
