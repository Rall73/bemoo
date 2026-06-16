import pandas as pd
import unicodedata
from datetime import datetime as dt

path = "_docs/efetivo-teca.xlsx"
out  = "_docs/efetivo-seed.sql"

def norm(s):
    return unicodedata.normalize("NFKC", str(s).strip())

def cargo_key(s):
    s = norm(s).lower()
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def norm_escala(s):
    s = norm(s).upper().replace(" ", "")
    if s.startswith("4"): return "4x2"
    if s.startswith("5"): return "5x2"
    return "ADM"

def norm_turno(s):
    s = norm(s).upper()
    if "TURNO" in s:
        return s.split("TURNO")[-1].strip()
    if s in ("ADM", "AFASTADO"):
        return "ADM"
    return "ADM"

def sql_str(s):
    return norm(str(s)).replace("'", "''")

def mat_str(v):
    try:
        return str(int(float(str(v))))
    except Exception:
        return str(v).strip()

# ── Ler abas ──────────────────────────────────────────────────────
df = pd.read_excel(path, sheet_name="Efetivo", header=0)
df.columns = ["matricula", "nome", "funcao", "escala", "turno", "area"]
df["matricula"] = df["matricula"].apply(mat_str)

df_p = pd.read_excel(path, sheet_name="Planilha1", header=0)

# Colunas de data na Planilha1 (podem ser datetime.datetime ou pd.Timestamp)
date_cols = [(col, col.date()) for col in df_p.columns if isinstance(col, (pd.Timestamp, dt))]

# Dicionario matricula -> sequencia (data, '1'|'X')
p1 = {}
for _, row in df_p.iterrows():
    mat = mat_str(row.iloc[0])
    if not mat or mat.lower() in ("nan", "matricula", "matrícula"):
        continue
    seq = []
    for col, d in date_cols:
        v = row[col]
        if pd.isna(v):
            continue
        # Valor pode ser int (1), float (1.0), ou string ('X', 'FE', ...)
        if isinstance(v, (int, float)) and int(v) == 1:
            seq.append((d, "1"))
        else:
            vs = str(v).strip().upper()
            if vs in ("1", "1.0"):
                seq.append((d, "1"))
            elif vs == "X":
                seq.append((d, "X"))
    p1[mat] = seq

def infer_ancora(mat, n_work):
    seq = p1.get(mat, [])
    if not seq:
        return None
    # Procura n_work dias consecutivos de trabalho precedidos por X (ou inicio)
    for i, (d, v) in enumerate(seq):
        if v != "1":
            continue
        if i + n_work > len(seq):
            continue
        if all(seq[i + j][1] == "1" for j in range(n_work)):
            if i == 0 or seq[i - 1][1] == "X":
                return d
    # Fallback: primeiro 1 apos X
    prev = "X"
    for d, v in seq:
        if v == "1" and prev == "X":
            return d
        prev = v
    return None

# Unique cargos (deduplicados por chave sem acento)
seen_ck, cargos = {}, []
for _, row in df.iterrows():
    k = cargo_key(row["funcao"])
    if k not in seen_ck:
        n = norm(row["funcao"])
        seen_ck[k] = n
        cargos.append(n)

# Unique areas
seen_a, areas = set(), []
for _, row in df.iterrows():
    a = norm(row["area"])
    if a not in seen_a:
        seen_a.add(a)
        areas.append(a)

# ── Estatísticas ──────────────────────────────────────────────────
print(f"Colaboradores: {len(df)}")
print(f"Cargos distintos: {len(cargos)}")
for c in cargos:
    print(f"  {c}")
print(f"Areas distintas: {len(areas)}")
for a in areas:
    print(f"  {a}")

print()
print("Amostra de data_ancora inferidas:")
for i, (_, row) in enumerate(df.iterrows()):
    if i >= 15:
        break
    mat = mat_str(row["matricula"])
    esc_v = norm_escala(row["escala"])
    if esc_v in ("4x2", "5x2"):
        n = 4 if esc_v == "4x2" else 5
        an = infer_ancora(mat, n)
        print(f"  {mat} ({esc_v}) turno={norm_turno(row['turno'])} -> ancora={an}")

sem_ancora = 0
for _, row in df.iterrows():
    mat = mat_str(row["matricula"])
    esc_v = norm_escala(row["escala"])
    if esc_v in ("4x2", "5x2"):
        n = 4 if esc_v == "4x2" else 5
        if infer_ancora(mat, n) is None:
            sem_ancora += 1
print(f"Sem ancora inferivel (usara NULL): {sem_ancora}")

# ── Gerar SQL ─────────────────────────────────────────────────────
TURNOS = [
    ("A",   "07:00", "15:10", 0),
    ("B",   "15:00", "23:00", 0),
    ("C",   "23:00", "07:10", 1),
    ("D",   "07:00", "15:00", 0),
    ("E",   "10:00", "18:00", 0),
    ("F",   "23:00", "07:00", 1),
    ("G",   "12:00", "20:00", 0),
    ("H",   "11:00", "19:00", 0),
    ("ADM", "08:00", "17:00", 0),
]

lines = [
    "-- ================================================================",
    "-- Controle de Efetivo - Seed inicial",
    "-- Antes de rodar:",
    "--   1. SELECT id, name FROM companies;  -> ajuste @cid",
    "--   2. SELECT id, email FROM users;     -> ajuste @uid",
    "-- ================================================================",
    "",
    "SET @cid = 1;  -- ALTERE: id da empresa",
    "SET @uid = 1;  -- ALTERE: seu user_id",
    "",
    "-- Turnos",
]
for cod, ini, fim, cruza in TURNOS:
    lines.append(
        f"INSERT INTO efetivo_turnos (company_id, codigo, hora_inicio, hora_fim, cruza_meia_noite)"
        f" VALUES (@cid, '{cod}', '{ini}', '{fim}', {cruza});"
    )

lines += [
    "",
    "-- Padroes de Escala",
    "INSERT INTO efetivo_padroes_escala (company_id, nome, modo, dias_semana, dias_trabalho, dias_folga) VALUES (@cid, '4x2', 'ROTATIVO', NULL, 4, 2);",
    "INSERT INTO efetivo_padroes_escala (company_id, nome, modo, dias_semana, dias_trabalho, dias_folga) VALUES (@cid, '5x2', 'ROTATIVO', NULL, 5, 2);",
    "INSERT INTO efetivo_padroes_escala (company_id, nome, modo, dias_semana, dias_trabalho, dias_folga) VALUES (@cid, 'ADM', 'FIXO_SEMANAL', 'SEG,TER,QUA,QUI,SEX', NULL, NULL);",
    "",
    "-- Areas",
]
for a in areas:
    lines.append(f"INSERT INTO efetivo_areas (company_id, nome) VALUES (@cid, '{sql_str(a)}');")

lines += ["", "-- Cargos"]
for c in cargos:
    lines.append(f"INSERT INTO efetivo_cargos (company_id, nome) VALUES (@cid, '{sql_str(c)}');")

lines += ["", "-- Colaboradores"]
for _, row in df.iterrows():
    mat     = mat_str(row["matricula"])
    nome    = norm(row["nome"])
    cargo   = norm(row["funcao"])
    esc_v   = norm_escala(row["escala"])
    tcod    = norm_turno(row["turno"])
    area    = norm(row["area"])
    n_work  = 4 if esc_v == "4x2" else 5
    ancora  = infer_ancora(mat, n_work) if esc_v in ("4x2", "5x2") else None
    asql    = f"'{ancora.isoformat()}'" if ancora else "NULL"

    lines.append(
        f"INSERT INTO efetivo_colaboradores"
        f" (company_id, matricula, nome, cargo_id, area_id, padrao_escala_id, turno_id, data_ancora, status, data_admissao, updated_at)"
        f" SELECT @cid, '{sql_str(mat)}', '{sql_str(nome)}',"
        f" (SELECT id FROM efetivo_cargos WHERE company_id=@cid AND nome='{sql_str(cargo)}' LIMIT 1),"
        f" (SELECT id FROM efetivo_areas WHERE company_id=@cid AND nome='{sql_str(area)}' LIMIT 1),"
        f" (SELECT id FROM efetivo_padroes_escala WHERE company_id=@cid AND nome='{esc_v}' LIMIT 1),"
        f" (SELECT id FROM efetivo_turnos WHERE company_id=@cid AND codigo='{tcod}' LIMIT 1),"
        f" {asql}, 'ATIVO', '2001-01-01', NOW(3);"
    )

lines += ["", "-- Movimentacoes de Vinculo (admissao inicial de cada colaborador)"]
for _, row in df.iterrows():
    mat = mat_str(row["matricula"])
    lines.append(
        f"INSERT INTO efetivo_movimentacoes_vinculo"
        f" (company_id, colaborador_id, tipo, data, motivo, registrado_por)"
        f" SELECT @cid,"
        f" (SELECT id FROM efetivo_colaboradores WHERE company_id=@cid AND matricula='{sql_str(mat)}' LIMIT 1),"
        f" 'ADMISSAO', '2001-01-01', 'Carga inicial', @uid;"
    )

with open(out, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\nSQL salvo em: {out} ({len(lines)} linhas)")
