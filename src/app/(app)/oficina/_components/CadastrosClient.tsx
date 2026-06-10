"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react"

type Aba = "areas" | "produtos" | "motivos"

interface ItemSimples { id: number; name: string; active: boolean }
interface Produto extends ItemSimples { category: string | null }

interface Props {
  areas:    ItemSimples[]
  produtos: Produto[]
  motivos:  ItemSimples[]
}

export function CadastrosClient({ areas: ia, produtos: ip, motivos: im }: Props) {
  const router = useRouter()
  const [aba, setAba] = useState<Aba>("areas")

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex border-b border-gray-200 gap-6">
        {(["areas", "produtos", "motivos"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              aba === a ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {a === "areas"    ? "Áreas"           : ""}
            {a === "produtos" ? "Produtos / Serviços" : ""}
            {a === "motivos"  ? "Motivos de Pausa" : ""}
          </button>
        ))}
      </div>

      {aba === "areas"    && <ListaCadastro items={ia}  endpoint="areas"        hasCategory={false} onRefresh={router.refresh} />}
      {aba === "produtos" && <ListaCadastro items={ip}  endpoint="produtos"     hasCategory={true}  onRefresh={router.refresh} />}
      {aba === "motivos"  && <ListaCadastro items={im}  endpoint="motivos-pausa" hasCategory={false} onRefresh={router.refresh} />}
    </div>
  )
}

function ListaCadastro({
  items: inicial, endpoint, hasCategory, onRefresh,
}: {
  items:       (ItemSimples | Produto)[]
  endpoint:    string
  hasCategory: boolean
  onRefresh:   () => void
}) {
  const [items,  setItems]  = useState(inicial)
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName]   = useState("")
  const [editCat,  setEditCat]    = useState("")
  const [newName,  setNewName]    = useState("")
  const [newCat,   setNewCat]     = useState("")
  const [showNew,  setShowNew]    = useState(false)

  async function create() {
    if (!newName.trim()) { setErro("Nome obrigatório."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/oficina/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), ...(hasCategory && newCat ? { category: newCat.trim() } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName(""); setNewCat(""); setShowNew(false)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function save(id: number) {
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/oficina/${endpoint}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), ...(hasCategory ? { category: editCat.trim() || null } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...json.data } : i))
      setEditId(null)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/oficina/${endpoint}/${id}`, { method: "DELETE" })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id))
      } else {
        const json = await res.json()
        setErro(json.message ?? "Erro ao remover.")
      }
    } catch { setErro("Erro de conexão.") }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className={`grid gap-3 ${hasCategory ? "sm:grid-cols-2" : ""}`}>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input
                type="text" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                autoFocus
              />
            </div>
            {hasCategory && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoria (opcional)</label>
                <input
                  type="text" value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                />
              </div>
            )}
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={create} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
            <button onClick={() => { setShowNew(false); setErro(null) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro && !showNew && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{erro}</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum registro cadastrado.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((item) => {
            const isEdit = editId === item.id
            const cat = hasCategory ? (item as Produto).category : null
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                {isEdit ? (
                  <>
                    <div className={`flex-1 grid gap-2 ${hasCategory ? "sm:grid-cols-2" : ""}`}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                        autoFocus
                      />
                      {hasCategory && (
                        <input
                          value={editCat}
                          onChange={(e) => setEditCat(e.target.value)}
                          placeholder="Categoria"
                          className="px-2 py-1 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                        />
                      )}
                    </div>
                    <button onClick={() => save(item.id)} disabled={saving}
                      className="p-1 text-green-600 hover:bg-green-50 rounded">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-800">{item.name}</span>
                      {cat && <span className="ml-2 text-xs text-gray-400">· {cat}</span>}
                    </div>
                    <button
                      onClick={() => { setEditId(item.id); setEditName(item.name); setEditCat(cat ?? "") }}
                      className="p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(item.id, item.name)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
