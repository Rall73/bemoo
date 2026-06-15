# Controle de Efetivo — Módulo bemu.com.br

> Documento de referência para desenvolvimento. Cobre o conceito geral, o modelo de
> dados completo e a especificação detalhada da **Fase 0 (Cadastros)**.
> Versão de trabalho — base de validação antes de iniciar o código.

---

## 1. Contexto e problema

A área (TECA / terminal de cargas) tem cerca de **500 colaboradores** trabalhando em
escalas variadas. A escala mensal é montada e alimenta o sistema de RH, onde o ponto é
registrado. O problema: **essas informações de ponto não chegam à gestão da área em tempo
real**. O encarregado do turno não sabe, no momento, quantas pessoas tem para trabalhar;
a informação consolidada só volta do RH por volta do dia 15 do mês seguinte, tarde demais
para qualquer gestão.

**O que a ferramenta resolve:** dar ao encarregado, no início do turno, a visão exata de
quem está escalado, quem está de folga e quem está de férias — e permitir registrar a
presença real (incluindo atrasos, saídas antecipadas e horas extras) para comparar, ao
fim, o **efetivo previsto** com o **efetivo real**.

### Tipos de escala existentes

- **Administrativo** — segunda a sexta, 8h–17h.
- **Rotativo 4x2** — trabalha 4 dias, folga 2 (ciclo que "anda" pelo calendário).
- **Rotativo 5x2** — trabalha 5 dias, folga 2 (ciclo rotativo).
- **5x2 / outros em dias fixos** — quando aplicável (os dois modos coexistem).

### Turnos (horários)

| Turno | Início | Fim   | Cruza meia-noite | Qtd atual |
|-------|--------|-------|-----------------|-----------|
| A     | 07:00  | 15:10 | Não             | 64        |
| B     | 15:00  | 23:00 | Não             | 161       |
| C     | 23:00  | 07:10 | **Sim**         | 91        |
| D     | 07:00  | 15:00 | Não             | 94        |
| E     | 10:00  | 18:00 | Não             | 2         |
| F     | 23:00  | 07:00 | **Sim**         | 19        |
| G     | 12:00  | 20:00 | Não             | 1         |
| H     | 11:00  | 19:00 | Não             | 1         |
| ADM   | 08:00  | 17:00 | Não — seg a sex | 61        |

> Turnos A–H existem porque 4x2 e 5x2 geram grupos de rotação com horários ligeiramente
> distintos. "AFASTADO" aparece na planilha como pseudo-turno para colaboradores em
> afastamento INSS — no sistema é tratado como evento, não como turno.

> **Definição adotada:** cada colaborador é **fixo em um turno**. O turno é um atributo
> constante da pessoa; o gerador de escala decide apenas *se* ela trabalha no dia, sempre
> no turno dela.

---

## 2. Princípio arquitetural central: Planejado × Realizado

A decisão de projeto mais importante é **não digitar a escala inteira à mão** nem
**gerar tudo na hora perdendo o histórico**, mas usar um **modelo híbrido**:

1. **Regras** (padrões de escala) geram a escala prevista para qualquer período.
2. **Eventos / exceções** (férias, atestado, etc.) sobrescrevem datas específicas.
3. Ajustes manuais são permitidos em qualquer célula.
4. Ao **publicar**, a escala vira uma **foto congelada (snapshot)**.
5. A **presença real** é registrada contra essa foto.
6. A **comparação Planejado × Realizado** alimenta todos os relatórios.

```
PLANEJAMENTO
  Padrões ──gera──▶ Escala Planejada ◀──modifica── Eventos/Exceções
                          │
                    publica (snapshot)
                          ▼
                  Escala PUBLICADA (congelada)
                          │
EXECUÇÃO                  │
  Registro diário (chamada): presença · atraso · saída antecipada · hora extra
                          │
ANÁLISE                   ▼
  Motor de comparação ▶ Absenteísmo · Turnover · Relatórios
```

> Sem a separação Planejado × Realizado, não existe cálculo de absenteísmo. Com ela,
> absenteísmo é uma conta direta: `(previstos − presentes) / previstos`.

---

## 3. Modelo de dados (visão completa)

Entidades do sistema inteiro (Fases 0 a 3). A Fase 0 implementa as marcadas com **[F0]**.

### 3.1 Tabelas de apoio

**Turno** **[F0]**
| Campo            | Tipo    | Observação                                  |
|------------------|---------|---------------------------------------------|
| id               | PK      |                                             |
| codigo           | texto   | A, B, C, Adm…                               |
| hora_inicio      | hora    |                                             |
| hora_fim         | hora    |                                             |
| cruza_meia_noite | boolean | Derivável de início > fim, mas explícito    |

**Padrão de Escala** **[F0]**
| Campo          | Tipo    | Observação                                       |
|----------------|---------|--------------------------------------------------|
| id             | PK      |                                                  |
| nome           | texto   | "Administrativo Seg-Sex", "4x2 Rotativo"…        |
| modo           | enum    | `fixo_semanal` \| `rotativo`                     |
| dias_semana    | lista   | só em `fixo_semanal` (ex: seg,ter,qua,qui,sex)   |
| dias_trabalho  | inteiro | só em `rotativo` (ex: 4)                          |
| dias_folga     | inteiro | só em `rotativo` (ex: 2)                          |

**Área** **[F0]** — com auto-referência para a área macro
| Campo     | Tipo | Observação                                  |
|-----------|------|---------------------------------------------|
| id        | PK   |                                             |
| nome      | texto|                                             |
| area_pai  | FK   | aponta para outra Área (a macro); nula no topo |

> A **área macro** é derivada por `area_pai` em vez de digitada — menos erro, menos retrabalho.

**Cargo** **[F0]** — id, nome.

### 3.2 Pessoas e vínculos

**Colaborador** **[F0]**
| Campo           | Tipo    | Obrigatório | Observação                                 |
|-----------------|---------|-------------|--------------------------------------------|
| matricula       | texto   | sim         | **chave natural, única**                   |
| nome            | texto   | sim         |                                            |
| cargo           | FK      | sim         |                                            |
| area            | FK      | sim         | macro vem por derivação                    |
| padrao_escala   | FK      | sim         |                                            |
| turno           | FK      | sim         | fixo por pessoa                            |
| data_ancora     | data    | condicional | **só se padrão = rotativo**                |
| status          | enum    | sim         | `ativo` \| `desligado`                     |
| data_admissao   | data    | sim         | base para turnover                         |
| data_desligamento | data  | não         | nula enquanto ativo                        |

> Os campos `status`, `data_admissao` e `data_desligamento` passam a ser um **espelho
> (cache) do estado atual** — a fonte da verdade é a **Movimentação de Vínculo** abaixo,
> que guarda o histórico. Isso permite tratar **readmissão** (a pessoa sai e volta) sem
> perder os ciclos anteriores, o que campos planos não conseguem.

**Movimentação de Vínculo (entradas e saídas)** **[F0]** — eventos estruturados que
mudam o vínculo. É daqui que sai o turnover.
| Campo          | Tipo  | Observação                                       |
|----------------|-------|--------------------------------------------------|
| id             | PK    |                                                  |
| colaborador    | FK    |                                                  |
| tipo           | enum  | `admissao` \| `desligamento` \| `readmissao`     |
| data           | data  | data efetiva do movimento                        |
| motivo         | texto | causa (pedido, dispensa, fim de contrato…)       |
| registrado_por | FK    | usuário que lançou                               |
| timestamp      | data-hora | quando foi lançado (auditoria)               |

**Ocorrência** **[F0]** — a história qualitativa do colaborador (o "dossiê"). Distinta do
Registro de Presença diário: ocorrência é o que acontece *com* a pessoa ao longo do tempo.
| Campo          | Tipo  | Observação                                       |
|----------------|-------|--------------------------------------------------|
| id             | PK    |                                                  |
| colaborador    | FK    |                                                  |
| tipo           | FK    | aponta para Tipo de Ocorrência (configurável)    |
| data           | data  |                                                  |
| descricao      | texto | relato livre                                     |
| anexo          | arquivo | opcional (atestado, documento…)                |
| registrado_por | FK    |                                                  |
| timestamp      | data-hora | auditoria                                    |

**Tipo de Ocorrência** **[F0]** — tabela configurável pelo gestor. Exemplos:
mudança de cargo, transferência de área, mudança de turno/escala, advertência, suspensão,
elogio, afastamento prolongado, anotação geral.

> **Princípio: nada de sobrescrita silenciosa.** Alterações em dados cadastrais sensíveis
> ao histórico (cargo, área, turno, escala) devem passar por uma **Ocorrência** do tipo
> correspondente — a ocorrência atualiza o campo atual **e** deixa o rastro. Assim você
> nunca perde "quando e por que" algo mudou.

**Encarregado** **[F0]** — um Colaborador marcado com esse papel.
| Campo        | Tipo | Observação                          |
|--------------|------|-------------------------------------|
| colaborador  | FK   | é um colaborador                    |
| substitutos  | N:N  | 1 a 3 colaboradores substitutos     |

**Vínculo** **[F0]** — colaborador → encarregado responsável.
| Campo        | Tipo | Observação |
|--------------|------|------------|
| colaborador  | FK   |            |
| encarregado  | FK   |            |

> Os **substitutos pertencem ao encarregado**, não ao colaborador — assim o vínculo não
> se repete 500 vezes.

### 3.3 Acesso

**Usuário** **[F0]**
| Campo       | Tipo | Observação                                  |
|-------------|------|---------------------------------------------|
| login       | texto|                                             |
| senha_hash  | texto| nunca em texto puro                         |
| perfil      | enum | `gestor` \| `encarregado` \| `substituto`   |
| colaborador | FK   | quando aplicável                            |

### 3.4 Planejamento e execução (Fases 1–2, modeladas desde já)

**Evento / Exceção** — colaborador, tipo (`ferias`, `folga_feriado`, `folga_dominical`,
`atestado`, `afastamento_inss`, `falta_justificada`…), data_inicio, data_fim, observação.

**Escala Publicada** — colaborador, data, turno, status_previsto, snapshot_id.

**Registro de Presença** — colaborador, data, turno, status_real
(`presente` \| `ausente` \| `atrasado` \| `saida_antecipada`), hora_entrada_real,
hora_saida_real, hora_extra, motivo, registrado_por, timestamp.

**Log / Auditoria** — quem fez o quê, quando (transversal a tudo).

---

## 4. Lógica de geração da escala (referência para a Fase 1)

O gerador opera em dois modos conforme o `modo` do padrão:

**Modo `fixo_semanal`:**
```
trabalha(colaborador, data) = dia_da_semana(data) ∈ padrao.dias_semana
```
Não precisa de data-âncora.

**Modo `rotativo`:**
```
ciclo     = padrao.dias_trabalho + padrao.dias_folga
posicao   = (data − colaborador.data_ancora) mod ciclo
trabalha  = posicao < padrao.dias_trabalho
```
Exige `data_ancora` por colaborador (ou por equipe que rotaciona junto).

Em ambos os casos, se houver **Evento** cobrindo a data, o evento prevalece sobre o
resultado do cálculo.

---

## 5. Fase 0 — Cadastros

### 5.1 Ordem de construção (de baixo para cima)

As dependências entre tabelas definem a ordem:

```
1. Tabelas de apoio (independentes)
   ├── Turnos
   ├── Padrões
   ├── Áreas + Áreas macro
   └── Cargos
2. Colaboradores            (dependem de 1)
3. Encarregados + substitutos  (colaboradores marcados com o papel)
4. Vínculos colaborador → encarregado  (segunda passada)
5. Movimentações de vínculo + Ocorrências  (gestão de colaborador — ver 5.5)
6. Usuários / Acesso
7. Eventos iniciais (férias/afastamentos já conhecidos — opcional)
```

> **Ovo-e-galinha do encarregado:** o colaborador aponta para um encarregado, mas o
> encarregado *é* um colaborador. Resolve-se em duas passadas — cadastrar todos como
> colaboradores primeiro, depois marcar os encarregados, e só então criar os vínculos.
> Por isso 2, 3 e 4 são passos separados.

### 5.2 Validações do cadastro de Colaborador

- `matricula` única e obrigatória.
- `data_ancora` obrigatória **quando** o padrão é rotativo; oculta quando fixo.
- Aviso (não bloqueio) se a combinação turno × padrão for estranha
  (ex.: Administrativo com turno C).
- `data_desligamento` ≥ `data_admissao` quando preenchida.

### 5.3 Importação em massa (recomendado já na Fase 0)

Cadastrar 500 pessoas à mão é inviável. Implementar **importador CSV/XLSX**:

1. Gestor sobe a planilha (provavelmente a mesma onde monta a escala hoje).
2. Sistema valida **linha a linha**: matrícula duplicada, área inexistente, padrão
   inválido, ausência de âncora em rotativo, datas inconsistentes.
3. Mostra **relatório de erros** antes de confirmar.
4. Confirma a carga só após o gestor revisar.

Transforma a carga inicial de uma semana de digitação em uma tarde de ajuste de planilha.

### 5.4 Telas do módulo

| Tela              | Conteúdo                                                                 |
|-------------------|--------------------------------------------------------------------------|
| Tabelas de apoio  | CRUD simples de turnos, padrões, áreas, cargos                           |
| Colaboradores     | Listagem com filtro (área/turno/encarregado/status), busca por matrícula/nome, edição, **botão importar** |
| **Ficha do Colaborador** | Visão 360° de uma pessoa (ver 5.5) — dados, entradas/saídas e ocorrências |
| Encarregados      | Encarregado + substitutos + contagem de colaboradores sob responsabilidade |
| Acessos           | Logins e perfis                                                          |

### 5.5 Gestão de Colaborador — a Ficha (vem antes de qualquer funcionalidade)

Esta é a tela fundadora do sistema: antes de gerar escala ou fazer chamada, é preciso
conseguir **admitir, desligar, readmitir e registrar a história** de cada pessoa. A escala
e a presença só fazem sentido sobre colaboradores cujo vínculo está bem definido.

A Ficha é a visão de uma única pessoa, organizada em três blocos:

- **Dados cadastrais** — matrícula, nome, cargo, área (e macro derivada), padrão, turno e
  âncora. Alterações nos campos sensíveis ao histórico (cargo, área, turno, escala)
  disparam uma **Ocorrência** automática, nunca uma sobrescrita silenciosa.
- **Vínculo (entradas e saídas)** — botões **Registrar entrada** (admissão/readmissão) e
  **Registrar saída** (desligamento), cada um com data e motivo. Mostra o histórico
  completo de movimentações. É essa linha do tempo que alimenta o cálculo de turnover.
- **Ocorrências** — linha do tempo das anotações (mudança de cargo, transferência,
  advertência, elogio, afastamento, observação livre), com filtro por tipo, anexos
  opcionais e botão **Nova ocorrência**.

> **Por que separar entradas/saídas de ocorrências:** entradas e saídas são **estruturadas**
> e mexem no status e no turnover (precisam de tipo e data exatos). Ocorrências são o
> **registro qualitativo** e flexível (texto livre, tipos configuráveis). Misturar os dois
> sujaria os relatórios de movimentação. Separados, cada um faz bem o seu papel.

---

## 6. Faseamento geral (mapa do projeto)

| Fase | Entrega                                                                 |
|------|------------------------------------------------------------------------|
| 0    | **Gestão de colaborador** (ficha, entradas/saídas, ocorrências) + cadastros + autenticação + importação |
| 1    | Geração de escala + matriz mensal + eventos + publicação (snapshot)    |
| 2    | Chamada diária: presença, atraso, saída antecipada, hora extra         |
| 3    | Relatórios: absenteísmo, previsto × real, turnover                     |
| 4 (futuro) | Redistribuição de tarefas (deixar a porta aberta, não implementar) |

> **Preparar a Fase 4 desde já:** ao fim da chamada (Fase 2), o sistema já produz uma
> lista de "recursos disponíveis hoje" (quem está, em qual turno, por quanto tempo).
> Essa lista é o insumo direto da redistribuição futura.

---

## 7. Pontos de atenção (registro)

- **Turno C cruza a meia-noite (23h–7h):** convenção adotada — o turno **pertence ao dia
  em que começa**.
- **Hora extra "vaza" para o turno seguinte:** modelar como um intervalo que o sistema
  "empresta" à janela do próximo turno, para o próximo encarregado ver o recurso
  disponível nas primeiras horas (passagem de turno).
- **Turnover:** depende das **Movimentações de Vínculo** (admissão/desligamento/readmissão)
  — guardar o histórico desde o dia zero, mesmo sem usar agora.
- **LGPD (reforçado):** o controle paralelo ao RH agora guarda também **ocorrências
  disciplinares e motivos de desligamento**, que são dados sensíveis. Definir retenção,
  acesso restrito por perfil (nem todo encarregado deve ver advertências de qualquer um),
  finalidade do tratamento e trilha de auditoria de quem acessou cada ficha.

---

## 8. Pendências para fechar antes do código

- [x] **Lista real dos padrões existentes** — apenas `4x2` e `5x2` rotativos. ADM é
      turno fixo (seg–sex), não um padrão separado de escala.
- [x] **Data-âncora** — por pessoa; inferível a partir das células da planilha atual.
- [ ] **Tolerância de atraso** (quantos minutos contam como "atrasado").
- [ ] **Uso offline** na chamada (se a conexão cair no terminal, PWA com sincronização?).
- [ ] **Definições de LGPD** (retenção, perfis, finalidade).
