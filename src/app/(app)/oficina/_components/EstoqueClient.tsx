"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, AlertTriangle, Package, Pencil, Check, X } from "lucide-react"

interface Material {
  id:          number
  name:        string
  unit:        string
  quantity:    number
  minQuantity: number
  unitCost:    number | null
  active:      boolean
}

interface Props {
  materiais: Material[]
  canEdit:   boolean
}

const UNIDADES = ["UN", "KG", "M", "M²", "CHAPA", "L", "CX", "PC", "M_LINEAR"]

export function EstoqueClient({ materiais: inicial, canEdit }: Props) {
  const router  = useRouter()
  const [materiais, setMateriais] = useState(inicial)
  const [editId, setEditId]       = useState<number | null>(null)
  const [saving, setSaving]       = useState(false)
  const [erro,   setErro]         = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)

  const [editForm, setEditForm] = useState<Partial<Material>>({})
  const [newForm, setNewForm]   = useState({
    name: "", unit: "UN", quantity: "0", minQuantity: "0", unitCost: "",
  })

  function startEdit(m: Material) {
    setEditId(m.id)
    setEditForm({ name: m.name, unit: m.unit, quantity: m.quantity, minQuantity: m.minQuantity, unitCost: m.unitCost })
  }

  async function saveEdit(id: number) {
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/oficina/materiais/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        editForm.name,
          unit:        editForm.unit,
          quantity:    editForm.quantity,
          minQuantity: editForm.minQuantity,
          unitCost:    editForm.unitCost ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setMateriais((ms) => ms.map((m) => m.id === id ? { ...m, ...json.data, quantity: Number(json.data.quantity), minQuantity: Number(json.data.minQuantity), unitCost: json.data.unitCost ? Number(json.data.unitCost) : null } : m))
      setEditId(null)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function createMaterial() {
    if (!newForm.name.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch("/api/oficina/materiais", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:        newForm.name.trim(),
          unit:        newForm.unit,
          quantity:    parseFloat(newForm.quantity),
          minQuantity: parseFloat(newForm.minQuantity),
          unitCost:    newForm.unitCost ? parseFloat(newForm.unitCost) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      router.refresh()
      setShowForm(false)
      setNewForm({ name: "", unit: "UN", quantity: "0", minQuantity: "0", unitCost: "" })
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function toggleAtivo(m: Material) {
    await fetch(`/api/oficina/materiais/${m.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ active: !m.active }),
    })
    setMateriais((ms) => ms.map((x) => x.id === m.id ? { ...x, active: !x.active } : x))
  }

  const alerta = materiais.filter((m) => m.active && m.quantity <= m.minQuantity)

  return (
    <div className="space-y-4">
      {alerta.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>{alerta.length}</strong> material{alerta.length > 1 ? "is" : ""} abaixo do estoque mínimo:
            {" "}{alerta.map((m) => m.name).join(", ")}
          </span>
        </div>
      )}

      {/* Toolbar */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> Novo material
          </button>
        </div>
      )}

      {/* Formulário de novo material */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Cadastrar material</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input type="text" value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unidade</label>
              <select value={newForm.unit} onChange={(e) => setNewForm((f) => ({ ...f, unit: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
                {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                <option value="_custom">Outra...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Custo unitário (R$)</label>
              <input type="number" min={0} step="0.01" value={newForm.unitCost}
                onChange={(e) => setNewForm((f) => ({ ...f, unitCost: e.target.value }))}
                placeholder="Opcional — usado no cálculo ESG"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Qtd. inicial</label>
              <input type="number" min={0} step="any" value={newForm.quantity}
                onChange={(e) => setNewForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mínimo (alerta)</label>
              <input type="number" min={0} step="any" value={newForm.minQuantity}
                onChange={(e) => setNewForm((f) => ({ ...f, minQuantity: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={createMaterial} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {materiais.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum material cadastrado.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Material</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Estoque</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Mínimo</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Custo unit.</th>
                {canEdit && <th className="w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materiais.map((m) => {
                const emAlerta = m.active && m.quantity <= m.minQuantity
                const isEdit   = editId === m.id
                return (
                  <tr key={m.id} className={`${!m.active ? "opacity-50" : ""} ${emAlerta ? "bg-yellow-50" : "bg-white"}`}>
                    <td className="px-4 py-2.5">
                      {isEdit ? (
                        <input
                          value={editForm.name ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {emAlerta && <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />}
                          <span className="font-medium text-gray-800">{m.name}</span>
                          <span className="text-xs text-gray-400">{m.unit}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isEdit ? (
                        <input type="number" min={0} step="any"
                          value={editForm.quantity ?? 0}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: parseFloat(e.target.value) }))}
                          className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white w-24 text-right"
                        />
                      ) : (
                        <span className={emAlerta ? "text-yellow-700 font-semibold" : "text-gray-800"}>
                          {m.quantity} {m.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {isEdit ? (
                        <input type="number" min={0} step="any"
                          value={editForm.minQuantity ?? 0}
                          onChange={(e) => setEditForm((f) => ({ ...f, minQuantity: parseFloat(e.target.value) }))}
                          className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white w-24 text-right"
                        />
                      ) : `${m.minQuantity} ${m.unit}`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 hidden md:table-cell">
                      {isEdit ? (
                        <input type="number" min={0} step="0.01"
                          value={editForm.unitCost ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, unitCost: e.target.value ? parseFloat(e.target.value) : null }))}
                          placeholder="—"
                          className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white w-24 text-right"
                        />
                      ) : m.unitCost ? `R$ ${m.unitCost.toFixed(2)}` : "—"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        {isEdit ? (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => saveEdit(m.id)} disabled={saving}
                              className="p-1 text-green-600 hover:bg-green-50 rounded">
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => startEdit(m)}
                              className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => toggleAtivo(m)}
                              className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                              {m.active ? "Desativar" : "Ativar"}
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
