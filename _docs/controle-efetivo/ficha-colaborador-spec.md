# Mini-Spec — Ficha do Colaborador

> Especificação de tela para o Claude Code implementar.
> Módulo: Controle de Efetivo — Bemoo
> Fase 0 / seção 5.5 da spec principal.

---

## 1. Objetivo da tela

Visão completa de um único colaborador, organizada em três blocos verticais:
dados cadastrais, histórico de vínculo (entradas/saídas) e ocorrências.
É a tela fundadora do módulo — tudo mais (escala, chamada) pressupõe colaboradores
com vínculo bem definido.

---

## 2. Acesso

Rota sugerida: `/efetivo/colaboradores/[matricula]`

Entrada a partir de:
- Listagem de colaboradores (clique na linha)
- Busca por matrícula ou nome (header global)
- Link direto em relatórios

---

## 3. Header da ficha

Fixo no topo, visível em todos os blocos.

| Campo | Fonte | Observação |
|-------|-------|------------|
| Nome completo | colaborador.nome | em destaque |
| Matrícula | colaborador.matricula | badge secundário |
| Cargo | cargo.nome | |
| Área / Seção | area.nome | |
| Turno | turno.codigo + horário | ex.: "Turno B · 15h–23h" |
| Status | colaborador.status | chip colorido: Ativo (verde) · Afastado (amarelo) · Desligado (vermelho) |

---

## 4. Bloco 1 — Dados Cadastrais

### 4.1 Campos

| Campo | Tipo | Regras |
|-------|------|--------|
| Matrícula | texto (read-only após criação) | chave natural; único no sistema |
| Nome | texto | obrigatório |
| Cargo | select | lista de cargos cadastrados |
| Área / Seção | select | lista de áreas cadastradas |
| Padrão de Escala | select | `4x2` · `5x2` |
| Turno | select | A · B · C · D · E · F · G · H · ADM (ver tabela §4.2) |
| Data-âncora | date | obrigatório sempre (todos os padrões são rotativos); oculto só se turno = ADM |
| Data de admissão | date | obrigatório; base para turnover |
| Encarregado responsável | select | lista de encarregados ativos |

### 4.2 Tabela de turnos (referência para o select)

| Código | Início | Fim   | Cruza meia-noite |
|--------|--------|-------|-----------------|
| A      | 07:00  | 15:10 | Não |
| B      | 15:00  | 23:00 | Não |
| C      | 23:00  | 07:10 | **Sim** |
| D      | 07:00  | 15:00 | Não |
| E      | 10:00  | 18:00 | Não |
| F      | 23:00  | 07:00 | **Sim** |
| G      | 12:00  | 20:00 | Não |
| H      | 11:00  | 19:00 | Não |
| ADM    | 08:00  | 17:00 | Não — seg a sex apenas |

> Turno ADM: escala fixa seg–sex; data-âncora não se aplica.

### 4.3 Comportamento ao editar campos sensíveis

Campos que afetam histórico (Cargo, Área, Turno, Padrão de Escala) **não podem ser
salvos diretamente**. Ao tentar salvar, o sistema abre um modal pedindo:
- Tipo de ocorrência (pré-selecionado: mudança de cargo / transferência / mudança de turno)
- Data efetiva da mudança
- Observação (opcional)

O modal cria a Ocorrência **e então** atualiza o campo. Sem confirmação = sem alteração.
Isso garante que nunca há sobrescrita silenciosa.

### 4.4 Permissões por perfil — Bloco 1

| Ação | Gestor | Encarregado | Substituto |
|------|--------|-------------|------------|
| Ver dados cadastrais | ✅ | ✅ (só seus colaboradores) | ✅ (só seus colaboradores) |
| Editar campos simples (nome) | ✅ | ❌ | ❌ |
| Editar campos sensíveis (cargo, área, turno) | ✅ | ❌ | ❌ |
| Ver encarregado responsável | ✅ | ✅ | ✅ |
| Alterar encarregado responsável | ✅ | ❌ | ❌ |

---

## 5. Bloco 2 — Vínculo (Entradas e Saídas)

### 5.1 Estado atual

Banner no topo do bloco mostrando o status vigente e a data do último movimento:
- "Ativo desde [data]"
- "Afastado desde [data] — INSS"
- "Desligado em [data] — [motivo]"

### 5.2 Ações disponíveis (condicionais ao status atual)

| Status atual | Ações disponíveis |
|-------------|-------------------|
| Ativo | Registrar Desligamento |
| Desligado | Registrar Readmissão |
| Afastado (INSS) | Registrar Retorno · Registrar Desligamento |

**Registrar Admissão** só aparece ao criar um novo colaborador (não na ficha de um existente).

### 5.3 Formulário de cada ação

**Registrar Desligamento:**
- Data efetiva (date, obrigatório)
- Motivo (select: pedido de demissão · dispensa sem justa causa · dispensa com justa causa · fim de contrato · aposentadoria · falecimento · outro)
- Observação (texto livre, opcional)

**Registrar Readmissão:**
- Data efetiva (date, obrigatório)
- Observação (opcional)

**Registrar Retorno (de afastamento INSS):**
- Data de retorno (date, obrigatório)

### 5.4 Histórico de movimentações

Timeline cronológica (mais recente no topo):

```
[ícone entrada] Admissão — 12/03/2019
                Registrado por: Maria Gestor · 12/03/2019 09:14

[ícone saída]   Desligamento — 05/08/2022 · Pedido de demissão
                Registrado por: João Encarregado · 06/08/2022 08:30

[ícone entrada] Readmissão — 10/01/2023
                Registrado por: Maria Gestor · 10/01/2023 10:00
```

### 5.5 Permissões — Bloco 2

| Ação | Gestor | Encarregado | Substituto |
|------|--------|-------------|------------|
| Ver histórico de vínculo | ✅ | ✅ (só seus) | ✅ (só seus) |
| Registrar admissão / readmissão | ✅ | ❌ | ❌ |
| Registrar desligamento | ✅ | ❌ | ❌ |
| Registrar retorno de afastamento | ✅ | ✅ | ❌ |

---

## 6. Bloco 3 — Ocorrências

### 6.1 Conceito

Registro qualitativo e flexível da história do colaborador: mudanças de papel,
advertências, elogios, afastamentos, anotações livres. Diferente do Vínculo (que
é estruturado e alimenta turnover), a Ocorrência é o "dossiê" da pessoa.

### 6.2 Tipos de ocorrência (configuráveis pelo gestor)

Tipos iniciais sugeridos:
- Mudança de cargo
- Transferência de área
- Mudança de turno / escala
- Advertência escrita
- Suspensão
- Elogio / reconhecimento
- Afastamento (INSS / licença)
- Retorno de afastamento
- Anotação geral

### 6.3 Formulário — Nova Ocorrência

- Tipo (select dos tipos cadastrados, obrigatório)
- Data (date, obrigatório — data efetiva do fato)
- Descrição (texto livre, obrigatório)
- Anexo (arquivo opcional: PDF, imagem — ex.: atestado, carta de advertência)

### 6.4 Listagem de ocorrências

Timeline (mais recente no topo), com filtro por tipo.

```
[tipo chip]  Advertência escrita — 14/02/2025
             "Atraso recorrente no período de 27/01 a 12/02/2025."
             Registrado por: João Encarregado · 14/02/2025 10:45
             [📎 carta_advertencia.pdf]

[tipo chip]  Mudança de cargo — 01/10/2024
             "Promovido de Auxiliar para Operador I."
             Registrado por: Maria Gestor · 01/10/2024 09:00
```

### 6.5 Permissões — Bloco 3

| Ação | Gestor | Encarregado | Substituto |
|------|--------|-------------|------------|
| Ver ocorrências não-disciplinares | ✅ | ✅ (só seus) | ✅ (só seus) |
| Ver ocorrências disciplinares (advertência, suspensão) | ✅ | ✅ (só seus) | ❌ |
| Criar ocorrência não-disciplinar | ✅ | ✅ | ❌ |
| Criar ocorrência disciplinar | ✅ | ✅ | ❌ |
| Editar / excluir ocorrência | ✅ | ❌ | ❌ |

> Ocorrências nunca são excluídas pelo encarregado — apenas o gestor pode,
> e fica registrado na auditoria quem excluiu e quando.

---

## 7. Estados da ficha e transições

```
          [novo colaborador]
                 │
                 ▼
            ┌─────────┐
            │  ATIVO  │◀──────── Readmissão
            └────┬────┘
                 │ Desligamento
                 ▼
          ┌────────────┐
          │ DESLIGADO  │
          └────────────┘

   ATIVO ──▶ AFASTADO (INSS) ──▶ ATIVO (retorno)
                               └──▶ DESLIGADO
```

---

## 8. Validações

- Matrícula: única, não pode ser alterada após criação.
- Data-âncora: obrigatória para qualquer padrão rotativo (4x2 / 5x2). Oculta se ADM.
- Data de desligamento ≥ data de admissão.
- Não é possível criar nova admissão para colaborador já ativo.
- Afastamento INSS: o turno "AFASTADO" da planilha vira um evento, não um turno — o turno original do colaborador é preservado.

---

## 9. LGPD — notas para implementação

- Acesso à ficha registrado no Log de Auditoria (quem abriu, quando).
- Ocorrências disciplinares: visíveis apenas para gestor e encarregado direto.
- Motivo de desligamento: visível apenas para gestor.
- Dados do colaborador não devem aparecer em logs de erro ou exports sem sanitização.

---

## 10. Pendências em aberto

- [x] **Turno H:** 11h–19h. ✅
- [ ] Definir política de retenção dos dados após desligamento (LGPD).
- [ ] Definir quem pode cadastrar Tipos de Ocorrência (só gestor?).
