"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  ArrowLeft, Plus, Pencil, Trash2,
  ChevronUp, ChevronDown, Save, CircleCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

type FieldType = "OK_NOK" | "SIM_NAO" | "NUMERIC" | "TEXT"

interface Field {
  id:              number
  order:           number
  label:           string
  type:            FieldType
  unit:            string | null
  required:        boolean
  requirePhoto:    boolean
  reference:       string | null
  referenceSource: string | null
  allowNa:         boolean
}

interface Item {
  id:          number
  order:       number
  label:       string
  description: string | null
  fields:      Field[]
}

interface ChecklistData {
  id:          number
  name:        string
  description: string | null
  active:      boolean
  createdBy:   string
  createdAt:   string
  items:       Item[]
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  OK_NOK:  "OK / NOK",
  SIM_NAO: "Sim / Não",
  NUMERIC: "Numérico",
  TEXT:    "Texto",
}

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  OK_NOK:  "bg-green-50 text-green-700",
  SIM_NAO: "bg-blue-50 text-blue-700",
  NUMERIC: "bg-orange-50 text-orange-700",
  TEXT:    "bg-purple-50 text-purple-700",
}

export function ChecklistDetailClient({
  checklist: initial,
  canManage,
}: {
  checklist:  ChecklistData
  canManage:  boolean
}) {
  const router = useRouter()

  // ─── Meta (nome / descrição / ativo) ─────────────────────────────
  const [name,       setName]       = useState(initial.name)
  const [desc,       setDesc]       = useState(initial.description ?? "")
  const [active,     setActive]     = useState(initial.active)
  const [savingMeta, setSavingMeta] = useState(false)
  const [metaSaved,  setMetaSaved]  = useState(false)
  const metaDirty = name !== initial.name || desc !== (initial.description ?? "") || active !== initial.active

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault()
    setSavingMeta(true); setMetaSaved(false)
    await fetch(`/api/checklists/${initial.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ name, description: desc || null, active }),
    })
    setSavingMeta(false); setMetaSaved(true)
    router.refresh()
  }

  // ─── Itens ────────────────────────────────────────────────────────
  const [items, setItems] = useState<Item[]>(initial.items)

  // Reordenar item
  async function moveItem(index: number, dir: "up" | "down") {
    const next = [...items]
    const swap = dir === "up" ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setItems(next)
    await fetch(`/api/checklists/${initial.id}/items/reorder`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ itemIds: next.map((i) => i.id) }),
    })
  }

  // Deletar item
  async function deleteItem(id: number) {
    if (!confirm("Remover este item e todos os seus campos?")) return
    await fetch(`/api/checklists/${initial.id}/items/${id}`, { method: "DELETE" })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  // Editar label do item
  const [editingItemId,    setEditingItemId]    = useState<number | null>(null)
  const [editingItemLabel, setEditingItemLabel] = useState("")

  async function saveItemLabel(id: number) {
    if (!editingItemLabel.trim()) return
    await fetch(`/api/checklists/${initial.id}/items/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ label: editingItemLabel }),
    })
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, label: editingItemLabel } : i))
    setEditingItemId(null)
  }

  // Novo item
  const [addingItem,      setAddingItem]      = useState(false)
  const [newItemLabel,    setNewItemLabel]    = useState("")
  const [savingItem,      setSavingItem]      = useState(false)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemLabel.trim()) return
    setSavingItem(true)
    const res  = await fetch(`/api/checklists/${initial.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ label: newItemLabel }),
    })
    const json = await res.json()
    if (res.ok) {
      setItems((prev) => [...prev, { ...json.data, fields: [] }])
      setNewItemLabel(""); setAddingItem(false)
    }
    setSavingItem(false)
  }

  // ─── Campos ───────────────────────────────────────────────────────
  // Estado de adição de campo por item
  const [addingFieldForItem, setAddingFieldForItem] = useState<number | null>(null)
  const [newField, setNewField] = useState<{
    label: string; type: FieldType; unit: string; required: boolean; requirePhoto: boolean
    reference: string; referenceSource: string; allowNa: boolean
  }>({ label: "", type: "OK_NOK", unit: "", required: true, requirePhoto: false,
       reference: "", referenceSource: "", allowNa: false })
  const [savingField, setSavingField] = useState(false)

  function openAddField(itemId: number) {
    setAddingFieldForItem(itemId)
    setNewField({ label: "", type: "OK_NOK", unit: "", required: true, requirePhoto: false,
                  reference: "", referenceSource: "", allowNa: false })
  }

  async function addField(e: React.FormEvent, itemId: number) {
    e.preventDefault()
    if (!newField.label.trim()) return
    setSavingField(true)
    const res  = await fetch(`/api/checklists/${initial.id}/items/${itemId}/fields`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({
        label:           newField.label,
        type:            newField.type,
        unit:            newField.unit || null,
        required:        newField.required,
        requirePhoto:    newField.requirePhoto,
        reference:       newField.reference   || null,
        referenceSource: newField.referenceSource || null,
        allowNa:         newField.allowNa,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setItems((prev) => prev.map((i) =>
        i.id === itemId ? { ...i, fields: [...i.fields, json.data] } : i
      ))
      setAddingFieldForItem(null)
    }
    setSavingField(false)
  }

  // Deletar campo
  async function deleteField(itemId: number, fieldId: number) {
    if (!confirm("Remover este campo?")) return
    await fetch(`/api/checklists/${initial.id}/items/${itemId}/fields/${fieldId}`, { method: "DELETE" })
    setItems((prev) => prev.map((i) =>
      i.id === itemId ? { ...i, fields: i.fields.filter((f) => f.id !== fieldId) } : i
    ))
  }

  // Reordenar campos
  async function moveField(itemId: number, index: number, dir: "up" | "down") {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const next = [...item.fields]
    const swap = dir === "up" ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, fields: next } : i))
    // salva nova ordem via PATCH individual em cada field
    await Promise.all(next.map((f, idx) =>
      fetch(`/api/checklists/${initial.id}/items/${itemId}/fields/${f.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ order: idx + 1 }),
      })
    ))
  }

  // Editar campo inline
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [editField, setEditField] = useState<{
    label: string; type: FieldType; unit: string; required: boolean; requirePhoto: boolean
    reference: string; referenceSource: string; allowNa: boolean
  }>({ label: "", type: "OK_NOK", unit: "", required: true, requirePhoto: false,
       reference: "", referenceSource: "", allowNa: false })
  const [savingEditField, setSavingEditField] = useState(false)

  function startEditField(field: Field) {
    setEditingFieldId(field.id)
    setEditField({
      label:           field.label,
      type:            field.type,
      unit:            field.unit ?? "",
      required:        field.required,
      requirePhoto:    field.requirePhoto,
      reference:       field.reference       ?? "",
      referenceSource: field.referenceSource ?? "",
      allowNa:         field.allowNa,
    })
  }

  async function saveField(e: React.FormEvent, itemId: number, fieldId: number) {
    e.preventDefault()
    setSavingEditField(true)
    const res  = await fetch(`/api/checklists/${initial.id}/items/${itemId}/fields/${fieldId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({
        label:           editField.label,
        type:            editField.type,
        unit:            editField.unit || null,
        required:        editField.required,
        requirePhoto:    editField.requirePhoto,
        reference:       editField.reference       || null,
        referenceSource: editField.referenceSource || null,
        allowNa:         editField.allowNa,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setItems((prev) => prev.map((i) =>
        i.id === itemId ? { ...i, fields: i.fields.map((f) => f.id === fieldId ? json.data : f) } : i
      ))
      setEditingFieldId(null)
    }
    setSavingEditField(false)
  }

  // ─── Totais ───────────────────────────────────────────────────────
  const totalFields = items.reduce((sum, i) => sum + i.fields.length, 0)

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/checklists" className="hover:text-primary flex items-center gap-1.5">
          <ArrowLeft size={14} strokeWidth={2} /> Checklists
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{initial.name}</span>
      </div>

      {/* Card: meta */}
      <form onSubmit={saveMeta}>
        <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-gray-700">Dados do checklist</h2>
            {canManage && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-gray-500">Ativo</span>
                <div
                  onClick={() => setActive((v) => !v)}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0",
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
            onChange={(e) => { setName(e.target.value); setMetaSaved(false) }}
            disabled={!canManage}
            required
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Descrição (opcional)</label>
            <textarea
              value={desc}
              onChange={(e) => { setDesc(e.target.value); setMetaSaved(false) }}
              disabled={!canManage}
              rows={2}
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <p className="text-[11px] text-gray-400">
            Criado por {initial.createdBy} · {new Date(initial.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </p>
          {canManage && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={savingMeta} disabled={!metaDirty}>
                <Save size={14} strokeWidth={2} />
                {metaSaved && !metaDirty ? "Salvo" : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </form>

      {/* Card: itens */}
      <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Itens do checklist
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {items.length} {items.length === 1 ? "seção" : "seções"} · {totalFields} campos
            </p>
          </div>
          {canManage && (
            <Button variant="ghost" size="sm" onClick={() => setAddingItem(true)}>
              <Plus size={14} strokeWidth={2.5} /> Adicionar item
            </Button>
          )}
        </div>

        {/* Formulário: novo item */}
        {addingItem && (
          <form onSubmit={addItem} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Nome do item / seção"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="Ex.: Câmara fria 1, Limpeza, Equipamentos..."
                autoFocus
                required
              />
            </div>
            <div className="flex gap-1.5 pb-0.5">
              <Button type="submit" variant="primary" size="sm" loading={savingItem}>Criar</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingItem(false); setNewItemLabel("") }}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {/* Lista de itens */}
        {items.length === 0 && !addingItem ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-soft">
            <p className="text-sm text-gray-400">Nenhum item adicionado ainda.</p>
            {canManage && (
              <button onClick={() => setAddingItem(true)} className="mt-1.5 text-sm text-primary hover:underline">
                Adicionar primeiro item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, itemIdx) => (
              <div key={item.id} className="border border-gray-200 rounded-soft overflow-hidden">
                {/* Cabeçalho do item */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                  {canManage && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveItem(itemIdx, "up")} disabled={itemIdx === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none">
                        <ChevronUp size={14} strokeWidth={2} />
                      </button>
                      <button onClick={() => moveItem(itemIdx, "down")} disabled={itemIdx === items.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 leading-none">
                        <ChevronDown size={14} strokeWidth={2} />
                      </button>
                    </div>
                  )}

                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold flex-shrink-0">
                    {itemIdx + 1}
                  </span>

                  {/* Label editável inline */}
                  {editingItemId === item.id ? (
                    <div className="flex-1 flex gap-1.5">
                      <input
                        autoFocus
                        value={editingItemLabel}
                        onChange={(e) => setEditingItemLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveItemLabel(item.id); if (e.key === "Escape") setEditingItemId(null) }}
                        className="flex-1 px-2 py-1 text-sm text-gray-800 bg-white border border-primary rounded focus:outline-none"
                      />
                      <button onClick={() => saveItemLabel(item.id)}
                        className="text-xs text-primary font-medium hover:underline">Salvar</button>
                      <button onClick={() => setEditingItemId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                    </div>
                  ) : (
                    <span className="flex-1 text-sm font-semibold text-gray-800">{item.label}</span>
                  )}

                  {canManage && editingItemId !== item.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingItemId(item.id); setEditingItemLabel(item.label) }}
                        className="p-1 rounded text-gray-400 hover:text-primary">
                        <Pencil size={13} strokeWidth={2} />
                      </button>
                      <button onClick={() => deleteItem(item.id)}
                        className="p-1 rounded text-gray-400 hover:text-error">
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Campos do item */}
                <div className="divide-y divide-gray-100">
                  {item.fields.map((field, fieldIdx) => (
                    <div key={field.id}>
                      {editingFieldId === field.id ? (
                        // Modo edição de campo
                        <form onSubmit={(e) => saveField(e, item.id, field.id)}
                          className="p-3 bg-primary-50/30 space-y-2">
                          <FieldForm
                            values={editField}
                            onChange={setEditField}
                          />
                          <div className="flex gap-1.5 justify-end">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingFieldId(null)}>Cancelar</Button>
                            <Button type="submit" variant="primary" size="sm" loading={savingEditField}>Salvar</Button>
                          </div>
                        </form>
                      ) : (
                        // Modo visualização de campo
                        <div className="flex items-center gap-2 px-3 py-2 group hover:bg-gray-50">
                          {canManage && (
                            <div className="flex flex-col gap-0.5 flex-shrink-0">
                              <button onClick={() => moveField(item.id, fieldIdx, "up")} disabled={fieldIdx === 0}
                                className="text-gray-200 hover:text-gray-500 disabled:opacity-20 leading-none">
                                <ChevronUp size={12} strokeWidth={2} />
                              </button>
                              <button onClick={() => moveField(item.id, fieldIdx, "down")} disabled={fieldIdx === item.fields.length - 1}
                                className="text-gray-200 hover:text-gray-500 disabled:opacity-20 leading-none">
                                <ChevronDown size={12} strokeWidth={2} />
                              </button>
                            </div>
                          )}

                          <span className="flex-1 text-sm text-gray-700">{field.label}</span>

                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", FIELD_TYPE_COLORS[field.type])}>
                              {FIELD_TYPE_LABELS[field.type]}
                              {field.type === "NUMERIC" && field.unit ? ` (${field.unit})` : ""}
                            </span>
                            {!field.required && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Opcional</span>
                            )}
                            {field.allowNa && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">N/A</span>
                            )}
                            {field.requirePhoto && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700">📷 Foto</span>
                            )}
                            {field.reference && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                                {field.referenceSource ? `${field.referenceSource} ` : ""}{field.reference}
                              </span>
                            )}
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => startEditField(field)}
                                className="p-1 rounded text-gray-400 hover:text-primary">
                                <Pencil size={13} strokeWidth={2} />
                              </button>
                              <button onClick={() => deleteField(item.id, field.id)}
                                className="p-1 rounded text-gray-400 hover:text-error">
                                <Trash2 size={13} strokeWidth={2} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Formulário: novo campo */}
                  {addingFieldForItem === item.id ? (
                    <form onSubmit={(e) => addField(e, item.id)} className="p-3 bg-primary-50/20 space-y-2">
                      <FieldForm values={newField} onChange={setNewField} />
                      <div className="flex gap-1.5 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAddingFieldForItem(null)}>Cancelar</Button>
                        <Button type="submit" variant="primary" size="sm" loading={savingField}>Adicionar</Button>
                      </div>
                    </form>
                  ) : canManage ? (
                    <button
                      onClick={() => openAddField(item.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-primary hover:bg-primary-50 transition-colors"
                    >
                      <Plus size={12} strokeWidth={2.5} /> Adicionar campo
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalFields > 0 && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {items.reduce((s, i) => s + i.fields.filter((f) => f.required).length, 0)} campo(s) obrigatório(s)
            </p>
            {canManage && (
              <Link
                href={`/checklists/${initial.id}/executar`}
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

// ─── Sub-componente: formulário de campo ──────────────────────────

function FieldForm({
  values,
  onChange,
}: {
  values: {
    label: string; type: FieldType; unit: string; required: boolean; requirePhoto: boolean
    reference: string; referenceSource: string; allowNa: boolean
  }
  onChange: (v: typeof values) => void
}) {
  const [showRef, setShowRef] = useState(
    !!(values.reference || values.referenceSource)
  )

  return (
    <div className="space-y-2">
      {/* Nome + Tipo + Unidade */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <input
            autoFocus
            value={values.label}
            onChange={(e) => onChange({ ...values, label: e.target.value })}
            placeholder="Nome do campo (ex.: Temperatura)"
            className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
            required
          />
        </div>

        <select
          value={values.type}
          onChange={(e) => onChange({ ...values, type: e.target.value as FieldType, unit: "" })}
          className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
        >
          <option value="OK_NOK">OK / NOK</option>
          <option value="SIM_NAO">Sim / Não</option>
          <option value="NUMERIC">Numérico</option>
          <option value="TEXT">Texto</option>
        </select>

        {values.type === "NUMERIC" && (
          <input
            value={values.unit}
            onChange={(e) => onChange({ ...values, unit: e.target.value })}
            placeholder="Unidade (°C, kg...)"
            className="w-28 px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
          />
        )}
      </div>

      {/* Flags */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
          <input type="checkbox" checked={values.required}
            onChange={(e) => onChange({ ...values, required: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-primary" />
          Obrigatório
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
          <input type="checkbox" checked={values.requirePhoto}
            onChange={(e) => onChange({ ...values, requirePhoto: e.target.checked })}
            className="w-3.5 h-3.5 rounded accent-primary" />
          Exige foto
        </label>
        {(values.type === "OK_NOK" || values.type === "SIM_NAO") && (
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
            <input type="checkbox" checked={values.allowNa}
              onChange={(e) => onChange({ ...values, allowNa: e.target.checked })}
              className="w-3.5 h-3.5 rounded accent-primary" />
            Permite N/A
          </label>
        )}
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className="text-xs text-primary hover:underline"
        >
          {showRef ? "— Ocultar referência" : "+ Referência normativa"}
        </button>
      </div>

      {/* Referência normativa */}
      {showRef && (
        <div className="flex gap-2 flex-wrap border-t border-gray-100 pt-2 mt-1">
          <input
            value={values.referenceSource}
            onChange={(e) => onChange({ ...values, referenceSource: e.target.value })}
            placeholder="Fonte (ex.: ISO 9001:2015, NR-12...)"
            className="flex-1 min-w-[140px] px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
          />
          <input
            value={values.reference}
            onChange={(e) => onChange({ ...values, reference: e.target.value })}
            placeholder="Cláusula (ex.: 5.1.1)"
            className="w-36 px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  )
}
