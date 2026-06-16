"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Check, X, Loader2, Moon } from "lucide-react"

type Aba = "turnos" | "padroes" | "areas" | "cargos"

interface Turno {
  id: number
  codigo: string
  horaInicio: string
  horaFim: string
  cruzaMeiaNoite: boolean
  ativo: boolean
}

interface Padrao {
  id: number
  nome: string
  modo: "FIXO_SEMANAL" | "ROTATIVO"
  diasSemana: string | null
  diasTrabalho: number | null
  diasFolga: number | null
  ativo: boolean
}

interface Area {
  id: number
  nome: string
  areaPaiId: number | null
  areaPai: { id: number; nome: string } | null
  ativo: boolean
}

interface Cargo {
  id: number
  nome: string
  ativo: boolean
}

interface Props {
  turnos:  Turno[]
  padroes: Padrao[]
  areas:   Area[]
  cargos:  Cargo[]
}

const ABAS: { key: Aba; label: string }[] = [
  { key: "turnos",  label: "Turnos" },
  { key: "padroes", label: "Padrões de Escala" },
  { key: "areas",   label: "Áreas" },
  { key: "cargos",  label: "Cargos" },
]

export function CadastrosClient({ turnos, padroes, areas, cargos }: Props) {
  const [aba, setAba] = useState<Aba>("turnos")

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 gap-6 overflow-x-auto">
        {ABAS.map((a) => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`pb-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              aba === a.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "turnos"  && <TurnosSection  inicial={turnos} />}
      {aba === "padroes" && <PadroesSection inicial={padroes} />}
      {aba === "areas"   && <AreasSection   inicial={areas} />}
      {aba === "cargos"  && <CargosSection  inicial={cargos} />}
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function BtnSalvar({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60"
    >
      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      Salvar
    </button>
  )
}

function BtnCancelar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
      Cancelar
    </button>
  )
}

function ErroInline({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600">{msg}</p>
}

function ErroBloco({ msg }: { msg: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{msg}</p>
  )
}

// ─── Turnos ───────────────────────────────────────────────────────────────────

function TurnosSection({ inicial }: { inicial: Turno[] }) {
  const [items,   setItems]   = useState(inicial)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState<string | null>(null)
  const [editId,  setEditId]  = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  const [fCodigo, setFCodigo] = useState("")
  const [fInicio, setFInicio] = useState("")
  const [fFim,    setFFim]    = useState("")
  const [fCruza,  setFCruza]  = useState(false)

  function resetForm() { setFCodigo(""); setFInicio(""); setFFim(""); setFCruza(false) }

  function startEdit(t: Turno) {
    setEditId(t.id); setFCodigo(t.codigo); setFInicio(t.horaInicio)
    setFFim(t.horaFim); setFCruza(t.cruzaMeiaNoite)
  }

  async function create() {
    if (!fCodigo.trim() || !fInicio || !fFim) { setErro("Preencha código, início e fim."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch("/api/efetivo/turnos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: fCodigo.toUpperCase().trim(), horaInicio: fInicio, horaFim: fFim, cruzaMeiaNoite: fCruza }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => [...prev, json.data].sort((a, b) => a.codigo.localeCompare(b.codigo)))
      resetForm(); setShowNew(false)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function save(id: number) {
    if (!fCodigo.trim() || !fInicio || !fFim) { setErro("Preencha todos os campos."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/turnos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: fCodigo.toUpperCase().trim(), horaInicio: fInicio, horaFim: fFim, cruzaMeiaNoite: fCruza }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...json.data } : i))
      setEditId(null); resetForm()
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function remove(id: number, codigo: string) {
    if (!confirm(`Remover turno "${codigo}"?`)) return
    try {
      const res = await fetch(`/api/efetivo/turnos/${id}`, { method: "DELETE" })
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)) }
      else { const json = await res.json(); setErro(json.message ?? "Erro ao remover.") }
    } catch { setErro("Erro de conexão.") }
  }

  const campos = (
    <div className="grid sm:grid-cols-4 gap-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Código</label>
        <input
          type="text" value={fCodigo} maxLength={3}
          onChange={(e) => setFCodigo(e.target.value.toUpperCase())}
          placeholder="A, N, M..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white uppercase"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Início</label>
        <input
          type="time" value={fInicio}
          onChange={(e) => setFInicio(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Fim</label>
        <input
          type="time" value={fFim}
          onChange={(e) => setFFim(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
        />
      </div>
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={fCruza} onChange={(e) => setFCruza(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">Cruza meia-noite</span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowNew((v) => !v); resetForm(); setErro(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {campos}
          {erro && <ErroInline msg={erro} />}
          <div className="flex gap-2">
            <BtnSalvar saving={saving} onClick={create} />
            <BtnCancelar onClick={() => { setShowNew(false); setErro(null) }} />
          </div>
        </div>
      )}

      {erro && !showNew && !editId && <ErroBloco msg={erro} />}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum turno cadastrado.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((t) =>
            editId === t.id ? (
              <li key={t.id} className="px-4 py-3 bg-white space-y-3">
                {campos}
                {erro && <ErroInline msg={erro} />}
                <div className="flex gap-2">
                  <BtnSalvar saving={saving} onClick={() => save(t.id)} />
                  <BtnCancelar onClick={() => { setEditId(null); resetForm(); setErro(null) }} />
                </div>
              </li>
            ) : (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="font-mono font-semibold text-sm text-gray-900 w-8">{t.codigo}</span>
                  <span className="text-sm text-gray-600">{t.horaInicio} – {t.horaFim}</span>
                  {t.cruzaMeiaNoite && (
                    <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      <Moon size={10} /> meia-noite
                    </span>
                  )}
                </div>
                <button onClick={() => { setShowNew(false); startEdit(t); setErro(null) }}
                  className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(t.id, t.codigo)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

// ─── Padrões de Escala ────────────────────────────────────────────────────────

function PadroesSection({ inicial }: { inicial: Padrao[] }) {
  const [items,   setItems]   = useState(inicial)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState<string | null>(null)
  const [editId,  setEditId]  = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  const [fNome,   setFNome]   = useState("")
  const [fModo,   setFModo]   = useState<"FIXO_SEMANAL" | "ROTATIVO">("FIXO_SEMANAL")
  const [fSemana, setFSemana] = useState("")
  const [fDT,     setFDT]     = useState("")
  const [fDF,     setFDF]     = useState("")

  function resetForm() { setFNome(""); setFModo("FIXO_SEMANAL"); setFSemana(""); setFDT(""); setFDF("") }

  function startEdit(p: Padrao) {
    setEditId(p.id); setFNome(p.nome); setFModo(p.modo)
    setFSemana(p.diasSemana ?? ""); setFDT(p.diasTrabalho?.toString() ?? ""); setFDF(p.diasFolga?.toString() ?? "")
  }

  function payload() {
    return {
      nome: fNome.trim(),
      modo: fModo,
      diasSemana:   fModo === "FIXO_SEMANAL" ? (fSemana.trim() || null) : null,
      diasTrabalho: fModo === "ROTATIVO" && fDT ? parseInt(fDT) : null,
      diasFolga:    fModo === "ROTATIVO" && fDF ? parseInt(fDF) : null,
    }
  }

  async function create() {
    if (!fNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch("/api/efetivo/padroes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => [...prev, json.data].sort((a, b) => a.nome.localeCompare(b.nome)))
      resetForm(); setShowNew(false)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function save(id: number) {
    if (!fNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/padroes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...json.data } : i))
      setEditId(null); resetForm()
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function remove(id: number, nome: string) {
    if (!confirm(`Remover padrão "${nome}"?`)) return
    try {
      const res = await fetch(`/api/efetivo/padroes/${id}`, { method: "DELETE" })
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)) }
      else { const json = await res.json(); setErro(json.message ?? "Erro ao remover.") }
    } catch { setErro("Erro de conexão.") }
  }

  function renderCampos() {
    return (
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input
              type="text" value={fNome}
              onChange={(e) => setFNome(e.target.value)}
              placeholder="Ex: 4x2 Noturno"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Modo</label>
            <select
              value={fModo}
              onChange={(e) => setFModo(e.target.value as typeof fModo)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
            >
              <option value="FIXO_SEMANAL">Fixo semanal</option>
              <option value="ROTATIVO">Rotativo</option>
            </select>
          </div>
        </div>
        {fModo === "FIXO_SEMANAL" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dias da semana (opcional)</label>
            <input
              type="text" value={fSemana}
              onChange={(e) => setFSemana(e.target.value)}
              placeholder="seg,ter,qua,qui,sex"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
            />
          </div>
        )}
        {fModo === "ROTATIVO" && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dias de trabalho</label>
              <input
                type="number" min={1} value={fDT}
                onChange={(e) => setFDT(e.target.value)}
                placeholder="4"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dias de folga</label>
              <input
                type="number" min={1} value={fDF}
                onChange={(e) => setFDF(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowNew((v) => !v); resetForm(); setErro(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          {renderCampos()}
          {erro && <ErroInline msg={erro} />}
          <div className="flex gap-2">
            <BtnSalvar saving={saving} onClick={create} />
            <BtnCancelar onClick={() => { setShowNew(false); setErro(null) }} />
          </div>
        </div>
      )}

      {erro && !showNew && !editId && <ErroBloco msg={erro} />}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum padrão cadastrado.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((p) =>
            editId === p.id ? (
              <li key={p.id} className="px-4 py-3 bg-white space-y-3">
                {renderCampos()}
                {erro && <ErroInline msg={erro} />}
                <div className="flex gap-2">
                  <BtnSalvar saving={saving} onClick={() => save(p.id)} />
                  <BtnCancelar onClick={() => { setEditId(null); resetForm(); setErro(null) }} />
                </div>
              </li>
            ) : (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-800">{p.nome}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    p.modo === "ROTATIVO"
                      ? "bg-orange-50 text-orange-700"
                      : "bg-blue-50 text-blue-700"
                  }`}>
                    {p.modo === "ROTATIVO" ? "Rotativo" : "Fixo semanal"}
                  </span>
                  {p.modo === "FIXO_SEMANAL" && p.diasSemana && (
                    <span className="text-xs text-gray-500">{p.diasSemana}</span>
                  )}
                  {p.modo === "ROTATIVO" && p.diasTrabalho != null && p.diasFolga != null && (
                    <span className="text-xs text-gray-500">{p.diasTrabalho}T × {p.diasFolga}F</span>
                  )}
                </div>
                <button onClick={() => { setShowNew(false); startEdit(p); setErro(null) }}
                  className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(p.id, p.nome)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

// ─── Áreas ───────────────────────────────────────────────────────────────────

function AreasSection({ inicial }: { inicial: Area[] }) {
  const [items,   setItems]   = useState(inicial)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState<string | null>(null)
  const [editId,  setEditId]  = useState<number | null>(null)
  const [showNew, setShowNew] = useState(false)

  const [fNome, setFNome] = useState("")
  const [fPai,  setFPai]  = useState("")

  function resetForm() { setFNome(""); setFPai("") }

  function startEdit(a: Area) {
    setEditId(a.id); setFNome(a.nome); setFPai(a.areaPaiId?.toString() ?? "")
  }

  function paiOptions(excludeId?: number) {
    return items.filter((i) => i.id !== excludeId)
  }

  async function create() {
    if (!fNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch("/api/efetivo/areas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: fNome.trim(), areaPaiId: fPai ? parseInt(fPai) : null }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => [...prev, json.data].sort((a, b) => a.nome.localeCompare(b.nome)))
      resetForm(); setShowNew(false)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function save(id: number) {
    if (!fNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/areas/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: fNome.trim(), areaPaiId: fPai ? parseInt(fPai) : null }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...json.data } : i))
      setEditId(null); resetForm()
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function remove(id: number, nome: string) {
    if (!confirm(`Remover área "${nome}"?`)) return
    try {
      const res = await fetch(`/api/efetivo/areas/${id}`, { method: "DELETE" })
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)) }
      else { const json = await res.json(); setErro(json.message ?? "Erro ao remover.") }
    } catch { setErro("Erro de conexão.") }
  }

  function renderSelectPai(excludeId?: number) {
    return (
      <select
        value={fPai}
        onChange={(e) => setFPai(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
      >
        <option value="">— Nenhuma —</option>
        {paiOptions(excludeId).map((o) => (
          <option key={o.id} value={String(o.id)}>{o.nome}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowNew((v) => !v); resetForm(); setErro(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input
                type="text" value={fNome} autoFocus
                onChange={(e) => setFNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Área pai (opcional)</label>
              {renderSelectPai()}
            </div>
          </div>
          {erro && <ErroInline msg={erro} />}
          <div className="flex gap-2">
            <BtnSalvar saving={saving} onClick={create} />
            <BtnCancelar onClick={() => { setShowNew(false); setErro(null) }} />
          </div>
        </div>
      )}

      {erro && !showNew && !editId && <ErroBloco msg={erro} />}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhuma área cadastrada.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((a) =>
            editId === a.id ? (
              <li key={a.id} className="px-4 py-3 bg-white space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nome</label>
                    <input
                      type="text" value={fNome} autoFocus
                      onChange={(e) => setFNome(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Área pai</label>
                    {renderSelectPai(a.id)}
                  </div>
                </div>
                {erro && <ErroInline msg={erro} />}
                <div className="flex gap-2">
                  <BtnSalvar saving={saving} onClick={() => save(a.id)} />
                  <BtnCancelar onClick={() => { setEditId(null); resetForm(); setErro(null) }} />
                </div>
              </li>
            ) : (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-800">{a.nome}</span>
                  {a.areaPai && (
                    <span className="ml-2 text-xs text-gray-400">· {a.areaPai.nome}</span>
                  )}
                </div>
                <button onClick={() => { setShowNew(false); startEdit(a); setErro(null) }}
                  className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(a.id, a.nome)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  )
}

// ─── Cargos ───────────────────────────────────────────────────────────────────

function CargosSection({ inicial }: { inicial: Cargo[] }) {
  const [items,    setItems]    = useState(inicial)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [editNome, setEditNome] = useState("")
  const [newNome,  setNewNome]  = useState("")
  const [showNew,  setShowNew]  = useState(false)

  async function create() {
    if (!newNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch("/api/efetivo/cargos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: newNome.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => [...prev, json.data].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNewNome(""); setShowNew(false)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function save(id: number) {
    if (!editNome.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/cargos/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editNome.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...json.data } : i))
      setEditId(null)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function remove(id: number, nome: string) {
    if (!confirm(`Remover cargo "${nome}"?`)) return
    try {
      const res = await fetch(`/api/efetivo/cargos/${id}`, { method: "DELETE" })
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)) }
      else { const json = await res.json(); setErro(json.message ?? "Erro ao remover.") }
    } catch { setErro("Erro de conexão.") }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowNew((v) => !v); setErro(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input
              type="text" value={newNome} autoFocus
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
            />
          </div>
          {erro && <ErroInline msg={erro} />}
          <div className="flex gap-2">
            <BtnSalvar saving={saving} onClick={create} />
            <BtnCancelar onClick={() => { setShowNew(false); setErro(null) }} />
          </div>
        </div>
      )}

      {erro && !showNew && !editId && <ErroBloco msg={erro} />}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum cargo cadastrado.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
              {editId === c.id ? (
                <>
                  <input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save(c.id)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    autoFocus
                  />
                  {erro && <ErroInline msg={erro} />}
                  <button onClick={() => save(c.id)} disabled={saving}
                    className="p-1 text-green-600 hover:bg-green-50 rounded">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => { setEditId(null); setErro(null) }}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-800">{c.nome}</span>
                  <button onClick={() => { setShowNew(false); setEditId(c.id); setEditNome(c.nome); setErro(null) }}
                    className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(c.id, c.nome)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
