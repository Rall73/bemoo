# bemoo — Pipeline de Desenvolvimento

> Ultima revisao: 2026-06-20
> Detalhe completo de cada fase: historico preservado abaixo em "Fases concluidas".

---

## Estado atual

**Em producao:** checklists completo (6.1) + Oficina (6.6) + Efetivo Fases 0-2 + controle de acesso por usuario por modulo

- CRUD de modelos (3 niveis: checklist → secao → campo)
- Execucao com foto/audio/anotacao por item (nao por campo), N/A, refs normativas
- Execucoes IN_PROGRESS preservadas; "Salvar e sair" com salvamento parcial
- Relatorios .docx (basico e com analise IA via GPT)
- Templates globais: ISO 9001:2015 (13 secoes, 72 campos, id=4)
- Painel de plataforma, auditoria, legal gate, onboarding self-service
- `user_module_access` — admin concede modulos especificos por usuario
- **Efetivo:** CRUD de apoio + colaboradores + escala automatica + dashboard + chamada de presenca
- **Efetivo escala:** cabecalho fixo, exportacao CSV/Excel, impressao, cadastro rapido de colaborador
- **Efetivo ancora historico:** alteracao de data-ancora com vigencia nao-retroativa
- **Auth:** cadastro publico bloqueado; fluxo de convite com verificacao global de e-mail

---

## Proximo

| # | O que | Notas |
|---|---|---|
| 1 | **Efetivo Fase 3 — Relatorios** | Frequencia por colaborador/area/turno; absenteismo; horas extras; exportacao |
| 2 | **Vinculo EXECUTOR→Area** | Campo `areaId` no User para filtro automatico na Chamada |
| 3 | **Dashboard de checklists** (6.1+) | KPIs: conformidade %, pendentes, atrasados |
| 4 | **Wizard de onboarding** (2.2) | Campo `onboarding_completed_at` em `companies` |
| 5 | **Rate limiting** (1.3) | Upstash Redis + `@upstash/ratelimit` |
| 6 | **Intercorrencias** (6.2) | Novo schema; aguarda definicao dos campos |

---

## Depois

- Efetivo Fase 4 (importacao XLSX de atualizacoes) · Fase 5 (integracao ponto eletronico)
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
EF0  Efetivo Fase 0: schema (14 modelos) + CRUD de apoio + listagem + ficha do colaborador
EF1  Efetivo Fase 1: escala automatica (FIXO_SEMANAL + ROTATIVO) + eventos + snapshot/publicacao
EFD  Efetivo Dashboard: headcount por turno, distribuicao por area, chamada rapida
EF2  Efetivo Fase 2: /efetivo/chamada — chamada diaria com atraso, saida antecipada,
     hora extra, troca de turno; campo hora_ajuste; visivel para EXECUTOR/GESTOR/ADMIN
EF2+ Efetivo escala melhorias: cabecalho fixo, exportacao CSV/Excel, impressao,
     modal de cadastro de colaborador direto na listagem
EF-ANCORA  Historico de data-ancora com vigencia nao-retroativa (efetivo_ancora_historico);
           resolveAncora() na API de escala; blocoAncoraHistorico na ficha do colaborador
SEC  Bloqueio de cadastro publico: /api/auth/register retorna 403, /cadastro fechada,
     Google OAuth bloqueia emails desconhecidos; convite verifica email globalmente;
     aceitar-convite redireciona para /login?novo=1 em caso de falha no auto-login
```

SQL ja rodado no phpMyAdmin: audit_logs, checklists, checklist_items,
checklist_item_fields, checklist_executions, execution_field_values,
companies.feature_audio, execution_item_notes, user_module_access,
efetivo_turnos, efetivo_padroes_escala, efetivo_areas, efetivo_cargos,
efetivo_colaboradores, efetivo_movimentacoes_vinculo, efetivo_tipos_ocorrencia,
efetivo_ocorrencias, efetivo_encarregados, efetivo_substitutos_encarregado,
efetivo_vinculos_colaborador, efetivo_eventos (+ enum EfetivoTipoEvento + coluna hora_ajuste),
efetivo_snapshots, efetivo_escala_publicada, efetivo_ancora_historico.
