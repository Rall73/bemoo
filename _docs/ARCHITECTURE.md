# bemoo — Arquitetura do Sistema

> Documento vivo. Atualizar sempre que um módulo, rota ou padrão novo for adicionado.
> Última revisão: 2026-06-20 (rev 7)
>
> Complementa o [PIPELINE.md](./PIPELINE.md) (o quê está feito/planejado) com
> o **como** o sistema funciona hoje.

---

## Stack e infraestrutura

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 16 (App Router) | `params` e `searchParams` são `Promise` — sempre `await` |
| ORM | Prisma 6 + MySQL | Sem `prisma migrate`. Schema alterado = SQL manual no phpMyAdmin |
| Auth | Auth.js v5 — JWT (sem tabela de sessão) | Arquivo de middleware: `src/proxy.ts` (não `middleware.ts`) |
| UI | Tailwind 3 + lucide-react | Ícones sempre `lucide-react`. Inputs: `text-gray-800 bg-white` |
| Deploy | Hostinger Node.js → GitHub push na `main` = rebuild | `npx tsc --noEmit && npx next build` antes de todo push |
| Storage | Cloudinary (fotos, relatórios .docx) | `serverExternalPackages: ["cloudinary","openai"]` obrigatório |
| E-mail | Nodemailer + SMTP Hostinger (`noreply@bemoo.com.br`) | Transporter criado dentro da função, nunca singleton |
| IA | OpenAI Whisper (áudio→texto) + GPT-4o-mini (análise) | Lazy singleton. Chave com permissão **All** |

---

## Estrutura de pastas

```
src/
  app/
    (app)/              → layout autenticado (AppShell + NavSidebar + LegalGate)
      checklists/       → CRUD de modelos de checklist
      execucoes/        → histórico + execução + resultado
      configuracoes/    → empresa, conta, usuários
      plataforma/       → painel super-admin (guard: platformAdmin=true)
        empresas/       → CRUD empresas, plano, módulos, suspensão
        templates/      → gestão de templates globais de checklist
        usuarios/       → todos os usuários da plataforma
        metricas/       → KPIs globais
        logs/           → audit logs paginados
      oficina/          → módulo de ordens de serviço, estoque e indicadores ESG
      dashboard/        → página inicial do usuário
    (auth)/             → login (LoginForm.tsx client), cadastro (fechado), aceitar-convite, redefinir-senha
    (legal)/            → /privacidade, /termos
    api/                → rotas de API (todas autenticadas exceto /api/auth e /api/setup)

  components/
    NavSidebar.tsx      → sidebar desktop + drawer mobile. Sub-links com prop `indent`
    ui/                 → Button, Input, Card, Badge

  lib/
    api.ts              → withAuth, withAuthCtx, withPlatformAdmin, assertSameCompany,
                          assertMinRole, validateBody, respostas padronizadas
    audit.ts            → logAction() (fire-and-forget), getIp(), AuditAction (union type)
    cloudinary.ts       → upload, delete por URL, delete em lote
    date.ts             → hojeNoBrasil(), inicioMesNoBrasil() — fuso UTC→BRT
    mailer.ts           → sendMail() via Nodemailer
    modules.ts          → MODULES_CONFIG (key, label, href, icon)
    planLimits.ts       → PLAN_LIMITS (FREE=3, STARTER=10, PROFESSIONAL=30, ENTERPRISE=∞)
                          getUserLimit(plan, maxUsersOverride)
    prisma.ts           → singleton do cliente Prisma
    reportDocx.ts       → gerarRelatorioDocx(data, analise?) → Buffer
    senha.ts            → gerarSenhaTemporaria() — senha aleatória usada em criação direta e reset admin
    validators.ts       → schemas Zod reutilizáveis (zNome, zEmail, zConviteSchema, zCriarUsuarioDiretoSchema, ...)

  emails/
    boas-vindas.ts      → e-mail de boas-vindas ao cadastro
    convite.ts          → e-mail de convite de colaborador (link /aceitar-convite?token=)
    redefinir-senha.ts  → e-mail de reset de senha

  proxy.ts              → middleware Next.js (protege rotas, redireciona não-autenticados)
  auth.ts               → configuração Auth.js v5 (Credentials + Google OAuth, callbacks JWT)
  types/next-auth.d.ts  → extensão dos tipos de sessão (id, role, companyId, platformAdmin)
```

---

## Banco de dados — modelos principais

### `companies`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int PK | |
| `name` | String | |
| `email` | String unique | |
| `document` | String? | CNPJ/CPF |
| `plan` | Enum | FREE \| STARTER \| PROFESSIONAL \| ENTERPRISE |
| `max_users` | Int? | Override de limite; null = usa padrão do plano |
| `feature_audio` | Boolean | Habilita gravação de áudio por empresa |
| `suspended_at` | DateTime? | Empresa suspensa bloqueia todos os usuários |
| `deleted_at` | DateTime? | Soft delete |

### `users`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Int PK | |
| `company_id` | Int FK | Isolamento de tenant |
| `name`, `email`, `password` | String | password = bcrypt hash |
| `role` | Enum | ADMIN \| GESTOR \| EXECUTOR \| AUDITOR |
| `platform_admin` | Boolean | Acesso ao painel `/plataforma` |
| `must_change_password` | Boolean | `true` quando senha temporária foi gerada pelo admin — força troca no próximo login |
| `deleted_at`, `deleted_by` | DateTime?, Int? | Soft delete |

**Hierarquia de roles:** ADMIN > GESTOR > EXECUTOR > AUDITOR

### `invites`
| Campo | Tipo | Notas |
|---|---|---|
| `company_id` | Int FK | |
| `email` | String | E-mail do convidado |
| `role` | Enum | Papel pré-atribuído |
| `token` | String unique | hex 32 bytes (64 chars) |
| `expires_at` | DateTime | +48h da criação |
| `accepted_at` | DateTime? | null = pendente |

### `checklists`
| Campo | Tipo | Notas |
|---|---|---|
| `company_id` | Int? | null = template de plataforma |
| `is_template` | Boolean | Template global importável |
| `template_source` | String? | Ex: "ISO 9001:2015" |
| `active` | Boolean | |
| `deleted_at`, `deleted_by` | Soft delete | |

### `checklist_item_fields`
| Campo | Tipo | Notas |
|---|---|---|
| `type` | Enum | OK_NOK \| SIM_NAO \| NUMERIC \| TEXT |
| `description` | Text? | Evidência esperada (dica 💡 na execução) |
| `reference` | String? | Ex: "5.1.1" |
| `reference_source` | String? | Ex: "ISO 9001:2015" |
| `allow_na` | Boolean | Habilita botão N/A na execução |
| `require_photo` | Boolean | |

### `execution_field_values`
| Campo | Tipo | Notas |
|---|---|---|
| `value_ok_nok` | Boolean? | OK/NOK ou Sim/Não |
| `value_numeric` | Decimal? | |
| `value_text` | Text? | |
| `value_na` | Boolean | Campo marcado como N/A |
| `photo_url` | String? | URL Cloudinary |
| `annotation` | Text? | Anotação manual |
| `transcription` | Text? | Texto transcrito pelo Whisper |

### `checklist_executions`
| Campo | Tipo | Notas |
|---|---|---|
| `status` | Enum | IN_PROGRESS \| COMPLETED \| CANCELLED |
| `report_url` | String? | URL do relatório básico (.docx no Cloudinary) |
| `report_ia_url` | String? | URL do relatório com análise IA |
| `report_generated_at` | DateTime? | Data da última geração |
| `conclusion_note` | Text? | Observação final do executor |

### `execution_item_notes`
Foto, áudio e anotação por **item** de checklist (não por campo). Chave única `(execution_id, item_id)`.
| Campo | Tipo | Notas |
|---|---|---|
| `execution_id` | Int FK | |
| `item_id` | Int FK | |
| `photo_url` | String? | URL Cloudinary |
| `annotation` | Text? | Anotação manual |
| `transcription` | Text? | Texto transcrito pelo Whisper |

### `user_module_access`
Controla acesso de cada usuário a módulos específicos dentro da empresa. A tela de módulos habilitados
é a **intersecção** entre `company_modules` (módulos da empresa) e `user_module_access` (módulos do usuário).
| Campo | Tipo | Notas |
|---|---|---|
| `user_id` | Int FK | |
| `company_id` | Int FK | |
| `module_key` | VarChar(50) | Mesma chave de `MODULES_CONFIG` |
| `granted_at` | DateTime | |
| `granted_by` | Int? FK | Id do admin que concedeu |
Chave única: `(user_id, module_key)`.

### Módulo Efetivo (`efetivo_*`)

Controle de efetivo para ~500 colaboradores com turnos rotativos e fixos.

**Modelos principais:**

| Modelo | Tabela | Descrição |
|---|---|---|
| `EfetivoTurno` | `efetivo_turnos` | Turno de trabalho (código, horaInicio, horaFim, cruzaMeiaNoite) |
| `EfetivoPadraoEscala` | `efetivo_padroes_escala` | Padrão FIXO_SEMANAL (diasSemana) ou ROTATIVO (diasTrabalho+diasFolga) |
| `EfetivoArea` | `efetivo_areas` | Área / setor do colaborador |
| `EfetivoCargo` | `efetivo_cargos` | Cargo / função |
| `EfetivoColaborador` | `efetivo_colaboradores` | Entidade principal; soft delete; vínculo com User opcional |
| `EfetivoEvento` | `efetivo_eventos` | Override de escala: ausências, ajustes de ponto, trocas de turno |
| `EfetivoSnapshot` + `EfetivoEscalaPublicada` | `efetivo_snapshots` + `efetivo_escala_publicada` | Escala mensal "congelada" para registro histórico |
| `EfetivoAncoraHistorico` | `efetivo_ancora_historico` | Histórico de alterações de data-âncora com data de vigência |

**`EfetivoTipoEvento` (enum):**
```
FERIAS | FOLGA_FERIADO | FOLGA_DOMINICAL | ATESTADO | AFASTAMENTO_INSS
FALTA_JUSTIFICADA | FALTA_INJUSTIFICADA
ATRASO | SAIDA_ANTECIPADA | HORA_EXTRA
TROCA_TURNO_SAIDA | TROCA_TURNO_ENTRADA
```

**`EfetivoEvento` — campos relevantes:**
| Campo | Tipo | Notas |
|---|---|---|
| `tipo` | EfetivoTipoEvento | Enum acima |
| `dataInicio` / `dataFim` | Date (`@db.Date`) | UTC midnight — usar `parseDataLocal()` |
| `horaAjuste` | VarChar(5)? | Hora "HH:MM" p/ ATRASO, SAIDA_ANTECIPADA, HORA_EXTRA, TROCA_TURNO_ENTRADA |
| `observacao` | Text? | Motivo, CID, protocolo |
| `criadoPor` | Int FK → User | Quem registrou o evento |

**Libs centrais do Efetivo:**

| Arquivo | O que exporta |
|---|---|
| `src/lib/efetivo-escala.ts` | `calculaDia()` — cálculo puro FIXO_SEMANAL/ROTATIVO; eventos têm prioridade sobre padrão |
| `src/lib/efetivo-status.ts` | `STATUS_CFG` (cores/labels por status); `STATUS_GRUPO` (agrupa em trabalha/ausencia/folga); `HORA_AJUSTE_LABEL`; `TIPOS_EVENTO_CHAMADA` |

**Algoritmo `calculaDia(padrao, dataAncora, data, eventos)`:**
1. Itera eventos — se algum cobre `data` → retorna `ev.tipo` como status
2. FIXO_SEMANAL: checa se dia da semana está em `diasSemana` (string "seg,ter,qua…")
3. ROTATIVO: `ciclo = diasTrabalho + diasFolga`; `pos = ((diff % ciclo) + ciclo) % ciclo`; `pos < diasTrabalho` → TRABALHA

**Histórico de âncora (`EfetivoAncoraHistorico`) — não-retroativo:**
Colaboradores ROTATIVO podem ter a data-âncora alterada com uma `dataVigencia`.
A função `resolveAncora(base, historico, d)` em `/api/efetivo/escala/route.ts` itera o histórico ordenado por `dataVigencia` ASC e retorna a âncora mais recente onde `dataVigencia <= d`. Dias anteriores à vigência continuam usando a âncora antiga automaticamente.

```typescript
// Histórico carregado uma vez por request, indexado por colaboradorId
const ancoraMap = Map<colaboradorId, { dataAncora, dataVigencia }[]>
// Escala usa: resolveAncora(c.dataAncora, ancoraMap.get(c.id) ?? [], d)
```

**Página `/efetivo/escala` — funcionalidades:**
- Cabeçalho da tabela fixo (`sticky top-0 z-30`) com scroll vertical do grid
- Exportação CSV com BOM UTF-8 e separador `;` (compatível com Excel Brasil)
- Impressão via `@media print` em orientação paisagem (apenas `#escala-print-area`)

**Datas UTC obrigatório:** campos `@db.Date` chegam como UTC midnight. Usar `getUTCDay()` e aritmética em ms. Nunca `getDay()` ou `toLocaleDateString()` sem timezone.

**Snapshot/publicação:**
`POST /api/efetivo/escala/publicar` computa todos os colabs × todos os dias do mês em memória, depois grava com `createMany` dentro de `$transaction` (timeout 30s). Apaga snapshot anterior antes de criar novo (constraint `@@unique([companyId, mes])`).

### Módulo Oficina (`workshop_*`)

| Modelo | Tabela | Descrição |
|---|---|---|
| `WorkshopArea` | `workshop_areas` | Setor/área de produção (ex: Corte, Solda) |
| `WorkshopProduct` | `workshop_products` | Catálogo de produtos/serviços executados |
| `WorkshopMaterial` | `workshop_materials` | Estoque de insumos com quantidade e custo unitário |
| `WorkshopPauseReason` | `workshop_pause_reasons` | Motivos padronizados de pausa de pedido |
| `WorkshopServiceOrder` | `workshop_service_orders` | Ordem de serviço — entidade principal (status: NOVO→EM_PRODUCAO→PAUSADO→CONCLUIDO→CANCELADO) |
| `WorkshopOrderLog` | `workshop_order_logs` | Histórico de mudanças de status e negociações |
| `WorkshopOrderDelivery` | `workshop_order_deliveries` | Entregas parciais de um pedido |
| `WorkshopOrderAttachment` | `workshop_order_attachments` | Fotos e anexos do pedido |
| `WorkshopMaterialConsumption` | `workshop_material_consumptions` | Baixa de material por pedido (rastreabilidade ESG) |

`WorkshopMaterial` tem `unitCost` para cálculo de economia ESG.
`WorkshopMaterialConsumption.source` = `COMPRADO | REAPROVEITADO` — base para indicadores de reuso.

### Outras tabelas
- `company_modules` — módulos habilitados por empresa (chave: string)
- `user_module_access` — módulos acessíveis por usuário (intersecta com company_modules)
- `audit_logs` — registro imutável de todas as ações com payload before/after
- `legal_versions` + `legal_acceptances` — versionamento de termos/privacidade
- `password_resets` — tokens de reset (1h, uso único)

---

## Autenticação e segurança

### Sessão JWT (Auth.js v5)
Campos disponíveis em `session.user`:
```typescript
{
  id:            string   // "1" (string — usar Number() para Prisma)
  name:          string
  email:         string
  role:          "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR"
  companyId:     number
  platformAdmin: boolean
}
```
> ⚠️ Campo novo no JWT requer atualização em 4 lugares: `authorize`, callback `jwt`, callback `session`, `next-auth.d.ts`. Usuário precisa fazer logout+login para renovar o token.

### Middleware (`src/proxy.ts`)
- Redireciona não-autenticados para `/login`
- Redireciona autenticados de `/login` para `/dashboard`
- Rotas públicas: `/`, `/login`, `/cadastro`, `/redefinir-senha`, `/aceitar-convite`, `/privacidade`, `/termos`, `/api/auth`, `/api/setup`

### Bloqueio de cadastro público (desde 2026-06-20)
Cadastros de novas empresas estão desativados. Três vetores bloqueados:
- **`/api/auth/register`** → retorna 403 imediatamente
- **`/cadastro`** → exibe aviso "Cadastros fechados — solicite convite ao admin"
- **Google OAuth** → callback `signIn` bloqueia e-mails desconhecidos (não existem no banco) e redireciona para `/login?error=CadastroFechado`

Único caminho de entrada: convite enviado pelo ADMIN da empresa (Fluxo 2 abaixo).
Para reabrir cadastros: restaurar `POST /api/auth/register` e remover o bloco no `signIn` callback em `src/auth.ts`.

### Helpers de API (`src/lib/api.ts`)
```typescript
withAuth(handler, minRole?)           // rotas simples
withAuthCtx<P>(handler, minRole?)     // rotas dinâmicas com params
withPlatformAdmin(handler)            // exclusivo para platformAdmin
assertSameCompany(sessionId, resourceId)  // 403 se tenant divergir; aceita null → 403
assertMinRole(role, minRole)          // 403 se role insuficiente
validateBody(req, schema)             // Zod; retorna { data } ou { error: NextResponse }
```

### Painel da plataforma
Guard duplo: middleware **e** layout server-side verificam `platformAdmin`.
Nunca proteger apenas ocultando links no client.

---

## Fluxos principais

### 1. Cadastro self-service
```
⛔ BLOQUEADO desde 2026-06-20
POST /api/auth/register → 403 "Cadastros temporariamente fechados"
Página /cadastro exibe aviso. Novos usuários entram apenas pelo Fluxo 2 (convite).
```

### 2. Convite de colaborador
```
ADMIN → POST /api/usuarios/convite { email, role }
  → verifica limite do plano (planLimits.ts + companies.max_users)
  → verifica e-mail globalmente (não apenas na empresa):
      mesmo companyId → "já é membro"
      outro companyId → "vinculado a outra conta — contate suporte"
  → verifica convite pendente não expirado
  → cria Invite (token hex 32, expira 48h)
  → envia e-mail com link /aceitar-convite?token=...

Convidado → GET /aceitar-convite?token=...
  → valida token (existe, não aceito, não expirado)
  → renderiza AceitarConviteForm com e-mail e nome da empresa pré-preenchidos

Convidado → POST /api/aceitar-convite { token, name, password, confirm }
  → verifica e-mail globalmente antes de criar (evita unique constraint error)
  → em $transaction: cria User + marca Invite.acceptedAt
  → registra aceite legal
  → tenta signIn("credentials") automático:
      OK  → router.push("/dashboard") → LegalGate se houver termos pendentes
      FAIL → router.push("/login?novo=1") → LoginForm exibe banner verde de sucesso
```

### 3. Limites de usuários por plano
```
planLimits.ts:
  FREE=3, STARTER=10, PROFESSIONAL=30, ENTERPRISE=null(∞)

Override por empresa: companies.max_users (configurável em /plataforma/empresas/[id])

Validação em POST /api/usuarios/convite:
  activeCount = users com deletedAt=null na empresa
  limit = getUserLimit(company.plan, company.maxUsers)
  if limit !== null && activeCount >= limit → 400 com mensagem de upgrade
```

### 4. Reset de senha
```
POST /api/auth/redefinir-senha { email }
  → cria PasswordReset (token, expira 1h)
  → envia e-mail com link /redefinir-senha?token=...

POST /api/auth/redefinir-senha/confirmar { token, password }
  → valida token (existe, não usado, não expirado)
  → atualiza password (bcrypt) + marca token como usado
```

### 5. Execução de checklist
```
POST /api/execucoes { checklistId }
  → cria ChecklistExecution (IN_PROGRESS)
  → redireciona para /execucoes/[id]

ExecutionForm (client):
  → campos OK/NOK/N/A, numérico, texto
  → foto: POST /api/upload → Cloudinary → photoUrl em estado separado
  → áudio: MediaRecorder → POST /api/transcribe → Whisper → transcrição editável

POST /api/execucoes/[id]/finalizar { fieldValues, conclusionNote }
  → valida campos obrigatórios (N/A satisfaz se allowNa=true)
  → upsert ExecutionFieldValues em $transaction
  → atualiza status=COMPLETED, finishedAt

Resultado: /execucoes/[id]/resultado
  → exibe todas as respostas por seção com foto, anotação, transcrição
  → código EXE-XXXXX
  → RelatorioPanel: gerar/baixar .docx básico ou com análise IA
```

### 6. Relatórios .docx
```
POST /api/execucoes/[id]/relatorio { tipo: "basico"|"ia", analise? }
  → gerarRelatorioDocx(data, analise?) → Buffer
  → upload Cloudinary (resource_type: "raw", fl_attachment:nome.docx)
  → salva URL: tipo=basico → report_url; tipo=ia → report_ia_url
  → retorna { url, filename }

URLs com fl_attachment garantem extensão .docx no download (cross-origin).
Relatórios ficam salvos e recuperáveis — RelatorioPanel exibe se já existem.
```

### 7. Templates de checklist
```
Templates: checklists com is_template=true + company_id=null
Gerenciados em /plataforma/templates (super-admin)

POST /api/templates/[id]/importar
  → clona Checklist + ChecklistItems + ChecklistItemFields para a empresa
  → mantém reference, reference_source, allow_na, description
  → redireciona para /checklists/[novoId]

ISO 9001:2015: template em produção, id=4, 13 seções, 72 campos
  Seed: GET /api/setup/seed-iso9001?secret=SEED_SECRET (rota temporária)
```

---

## APIs — mapa completo

### Autenticação (públicas)
| Rota | Método | Descrição |
|---|---|---|
| `/api/auth/[...nextauth]` | * | Auth.js handlers |
| `/api/auth/register` | POST | ⛔ Retorna 403 — cadastro público desativado |
| `/api/auth/redefinir-senha` | POST | Solicitar reset |
| `/api/auth/redefinir-senha/confirmar` | POST | Confirmar novo password |
| `/api/aceitar-convite` | POST | Aceitar convite e criar conta |

### Usuários e convites
| Rota | Método | Role mínimo | Descrição |
|---|---|---|---|
| `/api/usuarios/convite` | POST | ADMIN | Enviar convite (verifica limite) |
| `/api/usuarios/convite/[id]` | POST | ADMIN | Reenviar (novo token + prazo) |
| `/api/usuarios/convite/[id]` | DELETE | ADMIN | Cancelar convite |
| `/api/usuarios/[id]` | PATCH | ADMIN | Alterar role |
| `/api/usuarios/[id]` | DELETE | ADMIN | Desativar (soft delete) |
| `/api/usuarios/direto` | POST | ADMIN | Criar usuário com senha temporária (reativa soft-deleted da mesma empresa) |
| `/api/usuarios/[id]/resetar-senha` | POST | ADMIN | Resetar senha de membro — gera senha temporária, seta `mustChangePassword=true` |
| `/api/usuarios/[id]/modulos` | GET | ADMIN | Listar módulos acessíveis do usuário |
| `/api/usuarios/[id]/modulos` | PUT | ADMIN | Substituir conjunto de módulos do usuário (valida contra company_modules) |

### Configurações
| Rota | Método | Descrição |
|---|---|---|
| `/api/configuracoes/empresa` | PATCH | Editar dados da empresa (ADMIN) |
| `/api/configuracoes/conta` | PATCH | Editar perfil + senha |

### Checklists
| Rota | Método | Descrição |
|---|---|---|
| `/api/checklists` | GET, POST | Listar / criar checklist |
| `/api/checklists/[id]` | PATCH, DELETE | Editar / arquivar |
| `/api/checklists/[id]/items` | GET, POST | Seções |
| `/api/checklists/[id]/items/[itemId]` | PATCH, DELETE | Editar / remover seção |
| `/api/checklists/[id]/items/[itemId]/fields` | GET, POST | Campos |
| `/api/checklists/[id]/items/[itemId]/fields/[fieldId]` | PATCH, DELETE | Editar / remover campo |
| `/api/checklists/[id]/items/reorder` | PATCH | Reordenar seções |

### Execuções
| Rota | Método | Descrição |
|---|---|---|
| `/api/execucoes` | GET, POST | Histórico / iniciar execução |
| `/api/execucoes/[id]` | GET | Dados completos da execução (inclui `itemNotes`) |
| `/api/execucoes/[id]` | DELETE | Soft-delete de execução IN_PROGRESS |
| `/api/execucoes/[id]/salvar` | POST | Salvar parcialmente (sem validação obrigatória) — mantém IN_PROGRESS |
| `/api/execucoes/[id]/finalizar` | POST | Gravar respostas + notas por item + COMPLETED |
| `/api/execucoes/[id]/relatorio` | POST | Gerar .docx (básico ou IA) |
| `/api/execucoes/[id]/relatorio/analise` | POST | Gerar análise via GPT |

### Templates
| Rota | Método | Acesso | Descrição |
|---|---|---|---|
| `/api/templates` | GET | Autenticado | Listar templates ativos |
| `/api/templates/[id]/importar` | POST | GESTOR+ | Clonar template para empresa |
| `/api/plataforma/templates` | GET, POST | platformAdmin | Listar / criar template |
| `/api/plataforma/templates/[id]` | PATCH, DELETE | platformAdmin | Editar / arquivar |

### Oficina

| Rota | Método | Descrição |
|---|---|---|
| `/api/oficina/areas` | GET, POST | Listar / criar áreas |
| `/api/oficina/areas/[id]` | PATCH, DELETE | Editar / arquivar área |
| `/api/oficina/produtos` | GET, POST | Listar / criar produtos |
| `/api/oficina/produtos/[id]` | PATCH, DELETE | Editar / arquivar produto |
| `/api/oficina/materiais` | GET, POST | Listar / criar materiais |
| `/api/oficina/materiais/[id]` | PATCH, DELETE | Editar / ajustar estoque |
| `/api/oficina/motivos-pausa` | GET, POST | Listar / criar motivos de pausa |
| `/api/oficina/motivos-pausa/[id]` | PATCH, DELETE | Editar / arquivar motivo |
| `/api/oficina/pedidos` | GET, POST | Listar / abrir ordem de serviço |
| `/api/oficina/pedidos/[id]` | GET, PATCH | Detalhe / atualizar status |
| `/api/oficina/pedidos/[id]/logs` | GET, POST | Histórico / adicionar log |
| `/api/oficina/pedidos/[id]/entregas` | POST | Registrar entrega parcial |
| `/api/oficina/pedidos/[id]/consumos` | GET, POST | Listar / registrar consumo de material |
| `/api/oficina/pedidos/[id]/consumos/[consumoId]` | DELETE | Estornar consumo |
| `/api/oficina/dashboard` | GET | KPIs e indicadores ESG da oficina |

### Efetivo

| Rota | Método | Role mínimo | Descrição |
|---|---|---|---|
| `/api/efetivo/turnos` | GET, POST | GESTOR | Listar / criar turno |
| `/api/efetivo/turnos/[id]` | PATCH, DELETE | GESTOR | Editar / arquivar turno |
| `/api/efetivo/padroes` | GET, POST | GESTOR | Padrões de escala |
| `/api/efetivo/padroes/[id]` | PATCH, DELETE | GESTOR | Editar / remover padrão |
| `/api/efetivo/areas` | GET, POST | GESTOR | Áreas |
| `/api/efetivo/areas/[id]` | PATCH, DELETE | GESTOR | Editar / arquivar área |
| `/api/efetivo/cargos` | GET, POST | GESTOR | Cargos |
| `/api/efetivo/cargos/[id]` | PATCH, DELETE | GESTOR | Editar / arquivar cargo |
| `/api/efetivo/colaboradores` | GET, POST | GESTOR | Listar / criar colaborador |
| `/api/efetivo/colaboradores/[matricula]` | GET, PATCH | GESTOR | Ficha + editar colaborador |
| `/api/efetivo/colaboradores/[matricula]/ancora` | POST | GESTOR | Registrar alteração de data-âncora com vigência |
| `/api/efetivo/colaboradores/[matricula]/ancora` | GET | GESTOR | Histórico de âncoras do colaborador |
| `/api/efetivo/colaboradores/[matricula]/movimentacoes` | POST | GESTOR | Desligamento / readmissão |
| `/api/efetivo/colaboradores/[matricula]/ocorrencias` | POST | GESTOR | Registrar ocorrência |
| `/api/efetivo/ocorrencias/[id]` | DELETE | GESTOR | Remover ocorrência (soft) |
| `/api/efetivo/tipos-ocorrencia` | GET, POST | GESTOR | Tipos de ocorrência |
| `/api/efetivo/escala` | GET | EXECUTOR | Matriz mensal calculada ao vivo (`?mes=YYYY-MM&turnoId=&areaId=`) |
| `/api/efetivo/escala/publicar` | POST | GESTOR | Gera/republica snapshot mensal |
| `/api/efetivo/eventos` | POST | EXECUTOR | Criar evento (ausência, ajuste, troca de turno) |
| `/api/efetivo/eventos/[id]` | DELETE | GESTOR | Remover evento (soft delete) |
| `/api/efetivo/chamada` | GET | EXECUTOR | Chamada do dia (`?data=YYYY-MM-DD&turnoId=&areaId=`) — colabs + status calculado |
| `/api/efetivo/dashboard` | GET | EXECUTOR | KPIs de hoje: contagens, turnos ativos, colaboradores |

### Upload e IA
| Rota | Método | Descrição |
|---|---|---|
| `/api/upload` | POST | Upload de foto (base64 → Cloudinary image) |
| `/api/transcribe` | POST | Áudio → Whisper → texto |

### Painel de plataforma
| Rota | Método | Descrição |
|---|---|---|
| `/api/plataforma/empresas` | GET, POST | Listar / criar empresa |
| `/api/plataforma/empresas/[id]` | PATCH, DELETE | Editar / suspender / deletar |
| `/api/plataforma/empresas/[id]/modulos` | PATCH | Toggle de módulo |

### Legal
| Rota | Método | Descrição |
|---|---|---|
| `/api/legal/accept` | POST | Registrar aceite de versões legais |
| `/api/legal/versions` | POST | Publicar nova versão (platformAdmin) |

### Setup (temporário — desativar após uso)
| Rota | Descrição |
|---|---|
| `/api/setup/seed-iso9001?secret=SEED_SECRET` | Cria template ISO 9001 no banco |

---

## Módulos habilitados por empresa

Módulo habilitado = registro em `company_modules`.
Verificado no layout do grupo de rotas correspondente.

| Key | Rota principal | Status |
|---|---|---|
| `checklists` | `/checklists` | ✅ Em produção |
| `oficina` | `/oficina` (pedidos, estoque, cadastros, dashboard ESG) | ✅ Em produção |
| `efetivo` | `/efetivo` (dashboard), `/efetivo/chamada`, `/efetivo/escala`, `/efetivo/colaboradores` | ✅ Fases 0-2 em produção |
| `intercorrencias` | `/intercorrencias` | ⏳ Fase 6.2 |
| `rastreabilidade` | `/rastreabilidade` | ⏳ Fase 6.3 |
| `planos` | `/planos` | ⏳ Fase 6.4 |
| `captura` | `/captura` | ⏳ Fase 6.5 |

Para habilitar módulo para empresa: painel `/plataforma/empresas/[id]/modulos` → toggle.
Para conceder módulo a usuário: Configuracoes > Usuarios → ícone de grade → checkboxes.

---

## Convenções que afetam todo código novo

### Multi-tenant
- `companyId` sempre da sessão JWT, nunca da URL
- Toda query filtra `companyId` + `deletedAt: null`
- `assertSameCompany()` em toda rota que acessa recurso por ID

### Soft delete
Todo modelo de domínio tem `deleted_at DateTime?` + `deleted_by Int?`.
Nunca `DELETE` físico de dado do usuário.

### Fuso horário — DUAS regras obrigatórias

**Regra 1 — Cálculo (backend/API):**
Nunca `new Date()` cru para "hoje" ou data relativa.
Usar `hojeNoBrasil()` / `inicioMesNoBrasil()` de `src/lib/date.ts`.

**Regra 2 — Exibição (qualquer componente, inclusive Server Components e reportDocx):**
`toLocaleString`/`toLocaleDateString` sem `timeZone` usa o fuso do servidor (UTC) → datas 3h erradas.

```tsx
// ✅ usar sempre — helpers em src/lib/date.ts
import { formatarData, formatarDataHora } from "@/lib/date"

// ✅ ou explícito
new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", ... })

// ❌ PROIBIDO — exibe hora em UTC (3h adiantado)
new Date(d).toLocaleString("pt-BR", { ... })        // sem timeZone
new Date(d).toLocaleDateString("pt-BR")             // sem timeZone
```

> Já custou um fix em 13 arquivos simultâneos.

### Auditoria
Toda mutação relevante chama `logAction()` com `before`/`after`.
`AuditAction` é um union type em `src/lib/audit.ts` — adicionar ao union ao criar nova ação.

### Schema → banco
1. Alterar `prisma/schema.prisma`
2. Gerar SQL equivalente e entregar ao usuário
3. Aguardar confirmação "rodei o SQL"
4. `npx prisma generate`
5. Código que depende do campo novo

---

## Convenções adicionais

### Limites de usuários por plano (`src/lib/planLimits.ts`)
```
FREE=3, STARTER=10, PROFESSIONAL=30, ENTERPRISE=∞
getUserLimit(plan, company.maxUsers) — maxUsers overrida o padrão do plano
```
Verificado em `POST /api/usuarios/convite` antes de criar o convite.
Override configurável em `/plataforma/empresas/[id]` pelo super-admin.

### Audit log de e-mail
`sendMail()` é sempre `await`-ado. Resultado gravado no `payloadAfter`:
```json
{ "emailEnviado": true, "remetente": "noreply@bemoo.com.br" }
{ "emailEnviado": false, "emailErro": "Connection refused" }
```
Visível em `/plataforma/logs` com badge verde/vermelho por convite.

### Event handlers em Server Components
**NUNCA** colocar `onChange`, `onClick`, `onSubmit` etc. em Server Components.
O build passa, mas o Passenger/Node.js crasha em runtime com "This page couldn't load" (ERROR 4093732788).
Sempre mover para arquivo separado com `"use client"`.

---

## Armadilhas documentadas

| Sintoma | Causa | Solução |
|---|---|---|
| Câmera/microfone não pedem permissão | `Permissions-Policy: camera=()` vazio | `camera=(self), microphone=(self)` |
| Upload/transcribe quebra em runtime | libs nativas não externalizadas | `serverExternalPackages: ["cloudinary","openai"]` |
| Download sem extensão .docx ou HTTP 400 no Cloudinary | `fl_attachment:nome.docx` — Cloudinary interpreta o `.` como separador de formato → 400 | Incluir `.docx` no `publicId` e usar `fl_attachment` **sem nome customizado**: `/upload/fl_attachment/` |
| Campo JWT novo não aparece em session | Falta atualizar os 4 lugares | `authorize` + `jwt` + `session` + `next-auth.d.ts` |
| Template não aparece (company_id null) | Coluna era NOT NULL | `ALTER TABLE checklists MODIFY COLUMN company_id INT NULL` |
| Internal Server Error após deploy | Cliente Prisma desatualizado | `postinstall: "prisma generate"` no package.json |
| E-mail não chega (535 auth failed) | `#` na senha SMTP trunca | Evitar `#` em senhas no .env |
| "This page couldn't load" ERROR 4093732788, build passou | `onChange`/`onClick` em Server Component — build não rejeita, Passenger crasha em runtime | Mover para componente filho com `"use client"` |
| Página quebra após `prisma generate` mas antes de rodar SQL | Prisma client espera coluna nova que o banco ainda não tem | Sempre rodar SQL no phpMyAdmin **antes** do push |
| `sendMail` retorna ok mas e-mail não chegou, sem evidência | Fire-and-forget com `.catch()` silencioso | `await sendMail()` + gravar `emailEnviado` no audit log |
| E-mail enviado mas cai no spam ou falha autenticação | SMTP_USER/PASS apontando para domínio errado | SMTP deve usar caixa real do mesmo domínio do remetente — alias não autentica SMTP |

---

## Domínios e e-mail

### Domínios ativos
| Domínio | Papel | Status |
|---|---|---|
| `bemoo.com.br` | Domínio principal | ✅ Ativo (primário) |
| `bemoo.net` | Domínio legado | ✅ Ativo (Parked Domain — aponta para o mesmo app) |

Configuração no Hostinger: `bemoo.com.br` adicionado como **Parked Domain** no site Node.js do `bemoo.net`. Ambos servem o mesmo app. Para migrar o domínio principal futuramente, basta atualizar `NEXTAUTH_URL`.

### E-mail transacional
| Endereço | Tipo | Uso |
|---|---|---|
| `noreply@bemoo.com.br` | Caixa real (SMTP) | Remetente de todos os e-mails do sistema |
| `contato@bemoo.com.br` | Alias → admin@ | Exibido nos Termos de Uso |
| `privacidade@bemoo.com.br` | Alias → admin@ | Exibido na Política de Privacidade (DPO) |
| `admin@bemoo.com.br` | Caixa real | Caixa administrativa (recebe aliases) |

Variáveis de ambiente: `SMTP_USER=noreply@bemoo.com.br`, `SMTP_FROM=bemoo <noreply@bemoo.com.br>`, `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`.

### Google OAuth
Credencial configurada no Google Cloud Console (projeto `My First Project`, ID do cliente OAuth `bemoo`).
URIs autorizadas:
- Origens JS: `https://bemoo.net`, `https://bemoo.com.br`
- Callbacks: `https://bemoo.net/api/auth/callback/google`, `https://bemoo.com.br/api/auth/callback/google`

Para adicionar novo domínio: Google Cloud Console → APIs e serviços → Credenciais → bemoo → adicionar nas duas listas → Salvar (pode levar até 1h para propagar).
