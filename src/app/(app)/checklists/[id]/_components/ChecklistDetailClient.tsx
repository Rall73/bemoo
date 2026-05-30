"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical,
  ChevronUp, ChevronDown, CircleCheck, Save,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ItemType = "BOOLEAN" | "TEXT" | "NUMBER" | "TEMPERATURE"

interface ChecklistItem {
  id:          number
  order:       number
  label:       string
  description: string | null
  type:        ItemType
  required:    boolean
}

interface ChecklistData {
  id:          number
  name:        string
  description: string | null
  active:      boolean
  createdBy:   string
  createdAt:   string
  items:       ChecklistItem[]
}

interface Props {
  checklist:  ChecklistData
  canManage:  boolean
}

const TYPE_LABELS: Record<ItemType, { label: string; color: string }> = {
  BOOLEAN:     { label: "Sim/Não",     color: "bg-blue-50 text-blue-700" },
  TEXT:        { label: "Texto",       color: "bg-purple-50 text-purple-700" },
  NUMBER:      { label: "Número",      color: "bg-orange-50 text-orange-700" },
  TEMPERATURE: { label: "Temperatura", color: "bg-red-50 text-red-700" },
}

export function ChecklistDetailClient({ checklist, canManage }: Props) {
  const router = useRouter()

  // ─── Header (nome / descrição / ativo) ────────────────────────────
  const [name,       setName]       = useState(checklist.name)
  const [desc,       setDesc]       = useState(checklist.description ?? "")
  const [active,     setActive]     = useState(checklist.active)
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSaved,  setMetaSaved]  = useState(false)

  const metaDirty = name !== checklist.name || desc !== (checklist.description ?? "") || active !== checklist.active

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault()
    setSavingMeta(true)
    setMetaSaved(false)
    await fetch(`/api/checklists/${checklist.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, description: desc || null, active }),
    })
    setSavingMeta(false)
    setMetaSaved(true)
    router.refresh()
  }

  // ─── Itens ────────────────────────────────────────────────────────
  const [items,    setItems]    = useState<ChecklistItem[]>(checklist.items)
  const [deleting, setDeleting] = useState<number | null>(null)

  // Reordenar localmente + sync API
  async function moveItem(index: number, direction: "up" | "down") {
    const newItems = [...items]
    const swapIdx  = direction === "up" ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= newItems.length) return
    ;[newItems[index], newItems[swapIdx]] = [newItems[swapIdx], newItems[index]]
    setItems(newItems)
    await fetch(`/api/checklists/${checklist.id}/items/reorder`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ itemIds: newItems.map((i) => i.id) }),
    })
  }

  async function handleDeleteItem(id: number) {
    if (!confirm("Remover este item do checklist?")) return
    setDeleting(id)
    await fetch(`/api/checklists/${checklist.id}/items/${id}`, { method: "DELETE" })
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleting(null)
  }

  // ─── Adicionar item ───────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel,    setNewLabel]    = useState("")
  const [newDesc,     setNewDesc]     = useState("")
  const [newType,     setNewType]     = useState<ItemType>("BOOLEAN")
  const [newRequired, setNewRequired] = useState(true)
  const [addingSaving, setAddingSaving] = useState(false)
  const [addError,    setAddError]    = useState("")

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setAddingSaving(true)
    setAddError("")
    try {
      const res  = await fetch(`/api/checklists/${checklist.id}/items`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          label:       newLabel,
          description: newDesc || undefined,
          type:        newType,
          required:    newRequired,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setItems((prev) => [...prev, json.data])
        setNewLabel(""); setNewDesc(""); setNewType("BOOLEAN"); setNewRequired(true)
        setShowAddForm(false)
      } else {
        setAddError(json.message ?? "Erro ao adicionar item.")
      }
    } catch {
      setAddError("Erro de conexão.")
    } finally {
      setAddingSaving(false)
    }
  }

  // ─── Editar item inline ────────────────────────────────────────────
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [editLabel,   setEditLabel]   = useState("")
  const [editDesc,    setEditDesc]    = useState("")
  const [editType,    setEditType]    = useState<ItemType>("BOOLEAN")
  const [editReq,     setEditReq]     = useState(true)
  const [editSaving,  setEditSaving]  = useState(false)

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id)
    setEditLabel(item.label)
    setEditDesc(item.description ?? "")
    setEditType(item.type)
    setEditReq(item.required)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditSaving(true)
    const res  = await fetch(`/api/checklists/${checklist.id}/items/${editingId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        label:       editLabel,
        description: editDesc || null,
        type:        editType,
        required:    editReq,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === editingId ? json.data : i))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/checklists" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft size={14} strokeWidth={2} /> Checklists
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{checklist.name}</span>
      </div>

      {/* Card: meta */}
      <form onSubmit={handleSaveMeta}>
        <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700">Dados do checklist</h2>
            {canManage && (
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">Ativo</span>
                <div
                  onClick={() => setActive((v) => !v)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors cursor-pointer relative",
                    active ? "bg-primary" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    active ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </div>
              </label>
            )}
          </div>

          <Input
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canManage}
            required
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Descrição (opcional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              disabled={!canManage}
              rows={2}
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            Criado por {checklist.createdBy} · {new Date(checklist.createdAt).toLocaleDateString("pt-BR")}
          </p>

          {canManage && (
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={savingMeta}
                disabled={!metaDirty}
              >
                <Save size={14} strokeWidth={2} />
                {metaSaved && !metaDirty ? "Salvo" : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Card: itens */}
      <div className="bg-white border border-gray-200 rounded-round p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Itens ({items.length})
          </h2>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAddForm((v) => !v); setAddError("") }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Adicionar item
            </Button>
          )}
        </div>

        {/* Formulário de novo item */}
        {showAddForm && canManage && (
          <form
            onSubmit={handleAddItem}
            className="border border-primary-100 rounded-soft p-4 space-y-3 bg-primary-50/30"
          >
            <Input
              label="Enunciado do item"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex.: Temperatura da câmara fria"
              autoFocus
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Tipo de resposta</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ItemType)}
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
                >
                  <option value="BOOLEAN">Sim / Não</option>
                  <option value="TEXT">Texto livre</option>
                  <option value="NUMBER">Número</option>
                  <option value="TEMPERATURE">Temperatura (°C)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Obrigatório</label>
                <select
                  value={newRequired ? "true" : "false"}
                  onChange={(e) => setNewRequired(e.target.value === "true")}
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Instrução / dica (opcional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Orientação exibida durante a execução..."
                rows={2}
                className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none"
              />
            </div>
            {addError && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {addError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => { setShowAddForm(false); setAddError("") }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={addingSaving}>
                Adicionar
              </Button>
            </div>
          </form>
        )}

        {/* Lista de itens */}
        {items.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Nenhum item adicionado ainda.</p>
            {canManage && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-1 text-sm text-primary hover:underline"
              >
                Adicionar primeiro item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  // ── Modo edição inline ──
                  <form
                    onSubmit={handleSaveEdit}
                    className="border border-primary-200 rounded-soft p-4 space-y-3 bg-primary-50/20"
                  >
                    <Input
                      label="Enunciado"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Tipo</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value as ItemType)}
                          className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
                        >
                          <option value="BOOLEAN">Sim / Não</option>
                          <option value="TEXT">Texto livre</option>
                          <option value="NUMBER">Número</option>
                          <option value="TEMPERATURE">Temperatura (°C)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Obrigatório</label>
                        <select
                          value={editReq ? "true" : "false"}
                          onChange={(e) => setEditReq(e.target.value === "true")}
                          className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
                        >
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">Instrução (opcional)</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary" size="sm" loading={editSaving}>
                        Salvar
                      </Button>
                    </div>
                  </form>
                ) : (
                  // ── Modo visualização ──
                  <div className="flex items-start gap-3 px-3 py-3 rounded-soft border border-gray-100 hover:border-gray-200 bg-gray-50/50 transition-colors group">
                    {canManage && (
                      <GripVertical size={16} className="text-gray-300 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    )}
                    <span className="text-xs font-mono text-gray-400 mt-0.5 w-5 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-gray-800 font-medium">{item.label}</p>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                          TYPE_LABELS[item.type].color
                        )}>
                          {TYPE_LABELS[item.type].label}
                        </span>
                        {!item.required && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                            Opcional
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveItem(index, "up")}
                          disabled={index === 0}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20"
                        >
                          <ChevronUp size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => moveItem(index, "down")}
                          disabled={index === items.length - 1}
                          className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-20"
                        >
                          <ChevronDown size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1 rounded text-gray-400 hover:text-primary"
                        >
                          <Pencil size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleting === item.id}
                          className="p-1 rounded text-gray-400 hover:text-error"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {items.filter((i) => i.required).length} obrigatório(s) · {items.filter((i) => !i.required).length} opcional(is)
            </p>
            {canManage && (
              <Link
                href={`/checklists/${checklist.id}/executar`}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CircleCheck size={13} strokeWidth={2} /> Testar execução
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
