# bemoo — Estado atual (leia no inicio de cada sessao)

> Complementa o `CLAUDE.md` (raiz). Nao substitui — leia os dois.
> Detalhes de arquitetura: `_docs/ARCHITECTURE.md`. Backlog: `_docs/PIPELINE.md`.

---

## Em producao hoje

**Modulos ativos:**
- `checklists` — execucao com foto/audio/anotacao por item, historico IN_PROGRESS/COMPLETED, relatorio .docx + IA
- `oficina` — ordens de servico, estoque, indicadores ESG

**Infraestrutura adicionada nas ultimas sprints:**
- `execution_item_notes` — foto/audio/anotacao por item (nao por campo). Tabela upsert com chave `(execution_id, item_id)`.
- `user_module_access` — controle de acesso por usuario por modulo (interseccao com `company_modules`). Permite que o admin conceda modulos especificos a cada usuario.
- Execucoes `IN_PROGRESS` preservadas no historico; botao "Salvar e sair" salva parcialmente via `POST /api/execucoes/[id]/salvar`.
- Modal de gerenciamento de modulos por usuario em Configuracoes > Usuarios.

---

## Trabalho em andamento

### Modulo Controle de Efetivo (`/efetivo`)

- Registrado em `src/lib/modules.ts` como `"efetivo"`, icone `Users2`.
- Acesso atual: somente `ricardo.luize@viracopos.com` (unico registro em `user_module_access`).
- Rota de entrada futura: `/efetivo`.
- **Nenhum codigo de UI ou API** foi criado ainda — so a infraestrutura de acesso.

#### Fase 0 — o que falta construir (nesta ordem)

```
1. Schema Prisma + SQL (entregar SQL ao usuario, aguardar confirmacao antes do push)
   Entidades: Turno, PadraoEscala, Area, Cargo, Colaborador,
              MovimentacaoVinculo, TipoOcorrencia, Ocorrencia,
              Encarregado, SubstitutoEncarregado, VinculoColaborador

2. CRUD das tabelas de apoio
   Tela: /efetivo/cadastros  (turnos, padroes, areas, cargos)

3. Listagem de colaboradores + Ficha do Colaborador
   Rota: /efetivo/colaboradores e /efetivo/colaboradores/[matricula]
   Blocos: dados cadastrais | vinculo (entradas/saidas) | ocorrencias

4. Importador XLSX
   Rota: /efetivo/colaboradores/importar
   Carga inicial de ~505 colaboradores da planilha efetivo-teca.xlsx
```

#### Contexto do negocio (TECA / Viracopos)
- ~505 colaboradores, escalas 4x2 e 5x2 rotativos + ADM (fixo seg-sex)
- 9 turnos reais (A–H e ADM); "AFASTADO" e evento, nao turno
- Arquitetura central: Planejado x Realizado (Fase 1 futura, modelar banco desde ja)
- LGPD: ocorrencias disciplinares restritas por perfil; acesso a ficha auditado

---

## Mapa de documentacao

| O que preciso | Onde esta |
|---|---|
| Regras criticas de codigo | `CLAUDE.md` (raiz — sempre carregado) |
| Arquitetura, modelos DB, mapa de APIs | `_docs/ARCHITECTURE.md` |
| Backlog e proximos passos | `_docs/PIPELINE.md` |
| Spec completa Efetivo Fase 0 | `_docs/controle-efetivo/controle-efetivo-bemoo-fase0.md` |
| Tela Ficha do Colaborador | `_docs/controle-efetivo/ficha-colaborador-spec.md` |
| Spec Importador XLSX | `_docs/controle-efetivo/importador-spec.md` |
| Decisoes ja tomadas (efetivo) | `_docs/controle-efetivo/handoff-cowork-controle-efetivo.md` |
| Identidade visual (paleta, tipografia) | `_docs/ref/IDENTIDADE-VISUAL.md` |
| Versionamento legal (Termos/Privacidade) | `_docs/ref/LEGAL-VERSIONING.md` |
| Notas de deploy (Hostinger/Passenger) | `_docs/ref/AGENTS.md` |

---

## Tabelas no banco que o Prisma conhece mas ainda nao existem no MySQL

Nenhuma no momento — o ultimo `prisma generate` esta sincronizado com o banco apos o SQL desta sprint.

---

## Controle de Efetivo — progresso Fase 0

**SQL rodado no phpMyAdmin em 2026-06-15 (11 tabelas criadas):**
`efetivo_turnos`, `efetivo_padroes_escala`, `efetivo_areas`, `efetivo_cargos`,
`efetivo_colaboradores`, `efetivo_movimentacoes_vinculo`, `efetivo_tipos_ocorrencia`,
`efetivo_ocorrencias`, `efetivo_encarregados`, `efetivo_substitutos_encarregado`,
`efetivo_vinculos_colaborador`

**`prisma generate` rodado — client sincronizado.**

**Seed rodado com sucesso em 2026-06-15:**
- 9 turnos, 3 padroes, 5 areas, 16 cargos, 505 colaboradores, 505 movimentacoes
- 487 colaboradores com data_ancora inferida da Planilha1; 18 com NULL (ferias/afastamento em junho inteiro)
- data_admissao = 2001-01-01 (placeholder — usuario confirmara depois)
- Script gerador salvo em `_docs/gen_seed.py`

**Proximos passos (Fase 0):**
```
2. CRUD das tabelas de apoio → /efetivo/cadastros
   (Turnos, Padroes de Escala, Areas, Cargos)
3. Listagem de colaboradores + Ficha do Colaborador
   (tela fundadora — dados, vinculo, ocorrencias)
```
