# bemoo — Pipeline de Desenvolvimento

> Ultima revisao: 2026-06-15
> Detalhe completo de cada fase: historico preservado abaixo em "Fases concluidas".

---

## Estado atual

**Em producao:** checklists completo (6.1) + Oficina (6.6) + controle de acesso por usuario por modulo

- CRUD de modelos (3 niveis: checklist → secao → campo)
- Execucao com foto/audio/anotacao por item (nao por campo), N/A, refs normativas
- Execucoes IN_PROGRESS preservadas; "Salvar e sair" com salvamento parcial
- Relatorios .docx (basico e com analise IA via GPT)
- Templates globais: ISO 9001:2015 (13 secoes, 72 campos, id=4)
- Painel de plataforma, auditoria, legal gate, onboarding self-service
- `user_module_access` — admin concede modulos especificos por usuario

---

## Em desenvolvimento agora

### Controle de Efetivo — Fase 0

Modulo registrado como `"efetivo"` em `src/lib/modules.ts`.
Acesso atual: somente `ricardo.luize@viracopos.com`.
Nenhum codigo de UI/API criado ainda.

| # | O que | Status |
|---|---|---|
| 1 | Schema Prisma + SQL das tabelas de apoio e colaboradores | ⏳ Proximo |
| 2 | CRUD tabelas de apoio (turnos, padroes, areas, cargos) | ⏳ |
| 3 | Listagem de colaboradores + Ficha do Colaborador | ⏳ |
| 4 | Importador XLSX (carga inicial ~505 colaboradores) | ⏳ |

Specs completas: `_docs/controle-efetivo/`

---

## Proximo (depois do efetivo Fase 0)

| # | O que | Notas |
|---|---|---|
| 1 | **Dashboard de checklists** (6.1+) | KPIs: conformidade %, pendentes, atrasados |
| 2 | **Wizard de onboarding** (2.2) | Campo `onboarding_completed_at` em `companies` |
| 3 | **Rate limiting** (1.3) | Upstash Redis + `@upstash/ratelimit` |
| 4 | **Intercorrencias** (6.2) | Novo schema; aguarda definicao dos campos |

---

## Depois

- Efetivo Fase 1 (geracao de escala) · Fase 2 (chamada diaria) · Fase 3 (relatorios)
- 6.3 Rastreabilidade · 6.4 Planos de Acao · 6.5 Captura
- 7 IA avancada · 8 WhatsApp (Z-API) · 9 Cron jobs · 10 Sentry · 11 Billing

---

## Checklist pre-lancamento publico

- [x] Middleware, Zod, companyId em todas as rotas, Google OAuth, segredos fora do repo
- [x] `/privacidade`, `/termos`, cookie consent, e-mail transacional
- [ ] Rate limiting (Upstash)
- [ ] Backup diario habilitado na Hostinger
- [ ] Sentry + UptimeRobot
- [ ] `npm audit` sem vulnerabilidades high/critical

---

## Servicos externos ativos

| Servico | Uso | Status |
|---|---|---|
| Hostinger SMTP | E-mail `noreply@bemoo.com.br` | ok |
| Cloudinary `dxuofvx3i` | Fotos + relatorios .docx | ok |
| OpenAI (chave All) | Whisper + GPT-4o-mini | ok |
| Google OAuth | Login social | ok |

---

## Fases concluidas (referencia rapida)

```
0    Fundacao: Next.js 16, Prisma, Auth.js v5, deploy Hostinger
1.1  Middleware (src/proxy.ts)
1.2  Login Google + redefinicao de senha
1.3  withAuth, withAuthCtx, validateBody, assertSameCompany, assertMinRole
1.4  Auditoria: audit_logs + logAction + /plataforma/logs
1.5  Cloudinary: upload base64, server-side, pasta por empresa
1.6  Whisper: transcricao de audio (/api/transcribe)
2.1  Cadastro self-service (Company FREE + User ADMIN em $transaction)
2.3  Convites: limite por plano, reenvio, audit de e-mail
2.4  Gestao de usuarios (roles, soft delete, contador de slots)
2.5  Configuracoes empresa + conta
2.6  Redefinicao de senha
3    Painel plataforma: empresas, usuarios, metricas, logs, templates
4    E-mail transacional: boas-vindas, convite, reset
5.1  /privacidade + /termos + cookie consent
5.2  Versionamento legal + LegalGate
6.1  Checklists completo (foto/audio/anotacao por item, IN_PROGRESS, salvar parcial)
6.6  Oficina (ordens de servico, estoque, ESG)
UM   user_module_access: controle de acesso por usuario por modulo
```

SQL ja rodado no phpMyAdmin: audit_logs, checklists, checklist_items,
checklist_item_fields, checklist_executions, execution_field_values,
companies.feature_audio, execution_item_notes, user_module_access.
