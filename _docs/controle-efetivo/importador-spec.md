# Spec — Importador XLSX de Colaboradores

> Especificação para o Claude Code implementar.
> Módulo: Controle de Efetivo — Bemoo / Fase 0.

---

## 1. Objetivo

Permitir carga inicial de ~500 colaboradores a partir da planilha que o gestor já
usa hoje (`efetivo-teca.xlsx`), evitando digitação manual. O importador também
infere a data-âncora de cada colaborador a partir do padrão de folgas/trabalho
registrado nas células do calendário.

---

## 2. Arquivos de referência (planilha atual)

O arquivo tem duas abas:

| Aba | Colunas | Uso no importador |
|-----|---------|-------------------|
| **Efetivo** | Matrícula, Nome, Função, Escala, Turno, Área | Carga de colaboradores (sem calendário) |
| **Planilha1** | Matrícula, Nome, Função, Escala, Turno, Área + 30/31 colunas de datas | Carga completa: colaboradores + inferência de âncora + eventos do mês |

O importador deve aceitar **qualquer uma das duas abas** e adaptar o processamento.

---

## 3. Mapeamento de colunas

| Coluna planilha | Campo no sistema | Transformação |
|-----------------|-----------------|---------------|
| Matrícula | `colaborador.matricula` | converter para string; zerar à esquerda se necessário |
| Nome | `colaborador.nome` | trim + title case |
| Função | `cargo.nome` | normalizar grafia (ver §4) |
| Escala | `padrao_escala.nome` | normalizar para `4x2` ou `5x2` |
| Turno | `turno.codigo` | normalizar (ver §5) |
| Área (6ª coluna) | `area.nome` | mapear para área cadastrada (ver §6) |
| Colunas de datas | eventos + âncora | ver §7 |

---

## 4. Normalização de cargos

Aplicar trim + normalização de acentos para comparar com o cadastro existente.
Exemplos de variações encontradas na planilha:

| Planilha | Normalizado |
|----------|-------------|
| `Auxiliar de Processos Logísticos` | `Auxiliar de Processos Logisticos` |
| `Operador de Processos Logísticos III` | `Operador de Processos Logisticos III` |

Se o cargo normalizado não existir no banco, o importador **cria automaticamente**
e registra no relatório de importação como "cargo novo criado".

---

## 5. Normalização de turnos

| Valor na planilha | Turno no sistema | Observação |
|------------------|-----------------|------------|
| `Turno A` | `A` | |
| `Turno B` | `B` | |
| `Turno C` | `C` | |
| `Turno D` | `D` | |
| `Turno E` | `E` | |
| `Turno F` | `F` | |
| `Turno G` | `G` | |
| `Turno H` | `H` | ⚠️ horário pendente de confirmação |
| `ADM` | `ADM` | escala fixa seg–sex; data-âncora não gerada |
| `AFASTADO` | *(não é turno)* | ver §8 |

---

## 6. Normalização de áreas

| Valor na planilha | Área no sistema |
|------------------|----------------|
| `Importação - Rec` | Importação - Rec |
| `Importação - Lib` | Importação - Lib |
| `Exportação` | Exportação |
| `FOP-Perdimento` | FOP-Perdimento |
| `Planejamento` | Planejamento |

Se a área não existir no banco, o importador **cria automaticamente** e registra no relatório.

---

## 7. Processamento das colunas de datas (aba Planilha1)

Cada coluna de data (colunas 7 a 36+) representa um dia do mês com um valor de célula.

### 7.1 Tabela de valores

| Valor | Significado | Ação no sistema |
|-------|-------------|----------------|
| `1`   | Trabalha | nenhuma (é o estado padrão gerado pela regra) |
| `X`   | Folga do ciclo | nenhuma (também gerado pela regra) |
| `FE`  | Férias | criar evento `ferias` cobrindo o intervalo contínuo |
| `AF`  | Afastamento | criar evento `afastamento_inss` cobrindo o intervalo |
| `FD`  | Folga dominical | criar evento `folga_dominical` |
| `FT`  | Folga de turno | criar evento `folga_turno` |
| `FF`  | Folga de feriado | criar evento `folga_feriado` |

Eventos contíguos do mesmo tipo para o mesmo colaborador são agrupados em um único
registro (ex.: FE nos dias 8 a 20 → um único evento de férias).

### 7.2 Inferência da data-âncora

A data-âncora é o início do primeiro ciclo de trabalho do colaborador.
Algoritmo:

```
Para cada colaborador com padrão rotativo (4x2 ou 5x2):
  1. Percorrer as células de data da esquerda para a direita.
  2. Ignorar células com eventos especiais (FE, AF, FD, FT, FF).
  3. Encontrar a primeira sequência de `1`s com comprimento = padrao.dias_trabalho
     seguida imediatamente de `X`s com comprimento = padrao.dias_folga.
  4. A data da primeira célula `1` dessa sequência = data_ancora.
```

Se não for possível inferir (dados insuficientes, mês começa no meio de um ciclo),
o importador marca como `ancora_pendente = true` e lista no relatório de avisos.

> Colaboradores com turno ADM: data-âncora não é gerada.

---

## 8. Tratamento de "AFASTADO" no campo Turno

Colaboradores com `AFASTADO` no campo Turno:
1. O turno registrado no sistema é o **turno anterior** do colaborador, se conhecido;
   se não há histórico, fica em branco e o importador lista como aviso.
2. O importador cria um evento `afastamento_inss` com `data_inicio = primeira data
   do mês importado` e `data_fim` em aberto (null) — o gestor preenche depois.
3. O status do colaborador no sistema fica `afastado`.

---

## 9. Fluxo da tela de importação

```
1. Gestor faz upload do arquivo .xlsx
        │
        ▼
2. Sistema detecta as abas disponíveis
   → gestor escolhe qual aba usar (se houver as duas)
        │
        ▼
3. Validação linha a linha (sem gravar nada ainda):
   - Matrícula presente e única no arquivo
   - Turno reconhecido
   - Escala reconhecida (4x2 / 5x2)
   - Para AFASTADO: aviso de turno em branco
   - Data-âncora inferível (aviso se não for)
        │
        ▼
4. Relatório de pré-importação:
   ┌─────────────────────────────────────────┐
   │ ✅ 487 colaboradores prontos para carga │
   │ ⚠️  11 com turno AFASTADO (ver lista)   │
   │ ⚠️   7 sem âncora inferível             │
   │ ❌   0 erros bloqueantes                │
   └─────────────────────────────────────────┘
        │
        ▼
5. Gestor revisa e confirma
        │
        ▼
6. Gravação em transação única:
   - Upsert de colaboradores (matricula como chave)
   - Criação de eventos do mês
   - Gravação de âncoras inferidas
   - Log de importação (quem importou, quando, arquivo, resultado)
        │
        ▼
7. Relatório pós-importação com links para fichas com pendências
```

---

## 10. Erros bloqueantes vs. avisos

**Erros bloqueantes** (impedem a importação do lote inteiro):
- Arquivo corrompido ou sem as colunas esperadas
- Matrícula duplicada dentro do mesmo arquivo

**Avisos** (importação prossegue, gestor fica ciente):
- Turno desconhecido (linha importada com turno em branco)
- Cargo não encontrado → será criado
- Área não encontrada → será criada
- Data-âncora não inferível → campo fica em aberto
- Turno AFASTADO → evento criado, turno em aberto

---

## 11. Importações subsequentes (atualização)

O importador usa a matrícula como chave de upsert:
- Colaborador **não existe** → cria.
- Colaborador **já existe** → atualiza apenas os campos que mudaram (com ocorrência
  automática se for campo sensível), **não sobrescreve** eventos já existentes.

---

## 12. Pendências em aberto

- [ ] Confirmar turno H (horário exato).
- [ ] Definir se eventos de meses anteriores podem ser importados pelo mesmo fluxo.
- [ ] Confirmar se a coluna "Área" é sempre a 6ª coluna ou pode variar.
