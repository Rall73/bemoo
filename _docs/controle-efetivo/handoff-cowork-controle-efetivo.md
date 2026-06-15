# Handoff — Controle de Efetivo (Fase 0)

> Estado da implementacao em 2026-06-15.
> Leia este arquivo + `_docs/SESSION-CONTEXT.md` antes de qualquer tarefa neste modulo.

---

## Arquivos de referencia

| Arquivo | Conteudo |
|---------|----------|
| `controle-efetivo-bemoo-fase0.md` | Spec principal: conceito, modelo de dados completo, faseamento |
| `ficha-colaborador-spec.md` | Mini-spec da tela Ficha do Colaborador (Fase 0, secao 5.5) |
| `importador-spec.md` | Spec do importador XLSX (carga inicial dos ~505 colaboradores) |

---

## Stack real do projeto (IMPORTANTE — ignorar mencoes a Postgres nos docs antigos)

- **Next.js 16** (App Router) + **Prisma 6** + **MySQL** (nao Postgres)
- Auth.js v5 — o modulo efetivo usa a mesma autenticacao do Bemoo (`withAuth` / `withAuthCtx`)
- Nao ha "usuarios" proprios no efetivo — usa os mesmos `User` do Bemoo
- Perfis do efetivo (gestor/encarregado/substituto) serao implementados como campo no colaborador OU via `role` do Bemoo — decidir na implementacao
- Deploy: Hostinger Node.js; sem `prisma migrate`; toda mudanca de schema = SQL manual no phpMyAdmin

---

## O que ja existe no codigo (nao repetir)

- `src/lib/modules.ts` — `"efetivo"` ja esta no `ModuleKey` e em `MODULES_CONFIG`
- `src/components/NavSidebar.tsx` — icone `Users2` ja mapeado para `efetivo`
- `src/app/(app)/layout.tsx` e `dashboard/page.tsx` — ja intersectam `company_modules` x `user_module_access`
- `prisma/schema.prisma` — `UserModuleAccess` model ja existe e foi gerado
- Banco: tabela `user_module_access` criada; `ricardo.luize@viracopos.com` ja tem acesso ao modulo `efetivo`

---

## O que NAO existe ainda

- Nenhuma rota em `src/app/(app)/efetivo/` — pasta nao criada
- Nenhuma API em `src/app/api/efetivo/` — pasta nao criada
- Nenhuma tabela do modulo no MySQL (Turno, PadraoEscala, Area, Cargo, Colaborador, etc.)
- Nenhum model Prisma para as entidades do efetivo

---

## Decisoes ja tomadas (nao reabrir sem motivo)

- **Arquitetura central: Planejado x Realizado.** Regras geram escala, eventos sobrescrevem, publicacao congela snapshot, presenca real registrada contra o snapshot.
- **Escalas:** apenas `4x2` e `5x2` rotativos. ADM e turno fixo (seg-sex), nao um padrao de escala separado.
- **Turno e fixo por colaborador** (A-H ou ADM). O gerador decide so *se* a pessoa trabalha no dia.
- **9 turnos reais** (tabela abaixo). "AFASTADO" e evento, nao turno.
- **Gestao de colaborador vem antes de qualquer funcionalidade.** A Ficha (dados + entradas/saidas + ocorrencias) e o nucleo da Fase 0.
- **Entradas/saidas != ocorrencias.** Movimentacao de Vinculo alimenta turnover (estruturado); Ocorrencias sao o dossie qualitativo (texto livre, tipos configuraveis).
- **Nada de sobrescrita silenciosa.** Mudar cargo/area/turno/escala exige confirmacao via modal, que cria uma Ocorrencia automatica antes de atualizar o campo.
- **Data-ancora por colaborador**, inferivel a partir das celulas da planilha.

### Tabela de turnos

| Codigo | Inicio | Fim   | Cruza meia-noite |
|--------|--------|-------|-----------------|
| A      | 07:00  | 15:10 | Nao |
| B      | 15:00  | 23:00 | Nao |
| C      | 23:00  | 07:10 | Sim |
| D      | 07:00  | 15:00 | Nao |
| E      | 10:00  | 18:00 | Nao |
| F      | 23:00  | 07:00 | Sim |
| G      | 12:00  | 20:00 | Nao |
| H      | 11:00  | 19:00 | Nao |
| ADM    | 08:00  | 17:00 | Nao — seg a sex |

---

## Ordem de construcao da Fase 0

```
1. Schema Prisma das entidades [F0] + SQL para phpMyAdmin
2. CRUD das tabelas de apoio (Turnos, Padroes, Areas, Cargos) — /efetivo/cadastros
3. Colaboradores: listagem com filtros + Ficha (dados, vinculo, ocorrencias)
4. Importador XLSX (carga inicial ~505 colaboradores)
```

---

## Pendencias abertas (nao bloqueiam Fase 0)

- [ ] Tolerancia de atraso em minutos (relevante na Fase 2 — chamada diaria)
- [ ] Necessidade de uso offline / PWA (relevante na Fase 2)
- [ ] Definicoes de LGPD: retencao de dados apos desligamento, perfis de acesso a ocorrencias disciplinares

---

## Instrucoes para o Claude Code

```
Modulo "Controle de Efetivo" do Bemoo (Next.js 16 + Prisma 6 + MySQL + Auth.js v5).
Stack igual ao resto do Bemoo — NAO usar Postgres, NAO criar sistema de auth proprio.

Antes de qualquer tarefa, ler:
  _docs/SESSION-CONTEXT.md             → estado atual do projeto
  _docs/controle-efetivo/handoff-cowork-controle-efetivo.md  → este arquivo
  _docs/controle-efetivo/controle-efetivo-bemoo-fase0.md     → spec completa

Regras de codigo: CLAUDE.md (raiz) — obrigatorio.

Como trabalhar:
- Schema alterado: gerar SQL, entregar ao usuario, aguardar "rodei o SQL", entao prisma generate, entao codigo.
- Mostrar plano curto antes de criar ou editar arquivos.
- Nao apagar nada sem aprovacao.
- Portugues do Brasil. Sem travessoes. Tom direto e pratico.
- LGPD: dados de ~505 colaboradores, incluindo ocorrencias sensiveis — logar acesso a fichas.
- Auditoria: logAction() em toda mutacao; AuditAction e union type (adicionar ao union).
```
