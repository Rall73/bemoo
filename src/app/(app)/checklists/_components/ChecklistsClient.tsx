"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Plus, CheckSquare, ChevronRight, Pencil, Trash2,
  CircleCheck, CircleDot, Search, Play, Layers,
  BookOpen, Download, ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Checklist {
  id:          number
  name:        string
  description: string | null
  active:      boolean
  itemCount:   number
  createdBy:   string
  createdAt:   string
}

interface Template {
  id:             number
  name:           string
  description:    string | null
  templateSource: string | null
  itemCount:      number
}

interface Props {
  initialChecklists:  Checklist[]
  availableTemplates: Template[]
  canManage:          boolean
  canExecute:         boolean
  userInProgress:     Record<number, number>  // checklistId → executionId
}

export function ChecklistsClient({ initialChecklists, availableTemplates, canManage, canExecute, userInProgress }: Props) {
  const router = useRouter()

  const [checklists,  setChecklists]  = useState(initialChecklists)
  const [startingId,  setStartingId]  = useState<number | null>(null)

  async function handleExecutar(checklistId: number) {
    setStartingId(checklistId)
    try {
      const res  = await fetch("/api/execucoes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ checklistId }),
      })
      const json = await res.json()
      if (res.ok) router.push(`/execucoes/${json.data.id}`)
    } finally {
      setStartingId(null)
    }
  }

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active")

  // ─── Novo checklist ──────────────────────────────────────────────
  const [showForm,  setShowForm]  = useState(false)
  const [formName,  setFormName]  = useState("")
  const [formDesc,  setFormDesc]  = useState("")
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true); setFormError("")
    try {
      const res  = await fetch("/api/checklists", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: formName, description: formDesc || undefined }),
      })
      const json = await res.json()
      if (res.ok) {
        router.push(`/checklists/${json.data.id}`)
      } else {
        setFormError(json.message ?? "Erro ao criar checklist.")
        setSaving(false)
      }
    } catch {
      setFormError("Erro de conexão.")
      setSaving(false)
    }
  }

  // ─── Deletar ─────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<number | null>(null)

  async function handleDelete(id: number) {
    if (!confirm("Excluir este checklist? Esta ação não pode ser desfeita.")) return
    setDeleting(id)
    try {
      await fetch(`/api/checklists/${id}`, { method: "DELETE" })
      setChecklists((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  // ─── Importar template ────────────────────────────────────────────
  const [importingId,    setImportingId]    = useState<number | null>(null)
  const [showTemplates,  setShowTemplates]  = useState(availableTemplates.length > 0)

  async function handleImport(templateId: number) {
    setImportingId(templateId)
    try {
      const res  = await fetch(`/api/templates/${templateId}/importar`, { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        router.push(`/checklists/${json.data.id}`)
      }
    } finally {
      setImportingId(null)
    }
  }

  // ─── Filtros ─────────────────────────────────────────────────────
  const filtered = checklists.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "all"      ? true :
      filter === "active"   ? c.active :
      !c.active
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">

      {/* ── Templates disponíveis ── */}
      {availableTemplates.length > 0 && (
        <div className="bg-primary-50/50 border border-primary-100 rounded-round overflow-hidden">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-primary-50/80 transition-colors"
          >
            <Layers size={18} className="text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">Templates disponíveis</p>
              <p className="text-xs text-primary/70 mt-0.5">
                {availableTemplates.length} template{availableTemplates.length !== 1 ? "s" : ""} prontos para usar —
                importe e personalize para sua empresa
              </p>
            </div>
            {showTemplates
              ? <ChevronUp size={16} className="text-primary flex-shrink-0" />
              : <ChevronDown size={16} className="text-primary flex-shrink-0" />
            }
          </button>

          {showTemplates && (
            <div className="border-t border-primary-100 divide-y divide-primary-100/60">
              {availableTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-3.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-soft bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={15} className="text-primary" strokeWidth={2} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.templateSource && (
                        <span className="text-[10px] bg-primary-50 text-primary px-1.5 py-0.5 rounded font-medium">
                          {t.templateSource}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">
                        {t.itemCount} {t.itemCount === 1 ? "seção" : "seções"}
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      onClick={() => handleImport(t.id)}
                      disabled={importingId === t.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-soft border border-primary text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-60 flex-shrink-0"
                    >
                      <Download size={13} strokeWidth={2} />
                      {importingId === t.id ? "Importando..." : "Usar template"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Checklists da empresa ── */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["active", "inactive", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-soft text-xs font-medium transition-colors",
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-primary-200"
                )}
              >
                {f === "active" ? "Ativos" : f === "inactive" ? "Inativos" : "Todos"}
              </button>
            ))}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar checklist..."
                className="w-full pl-8 pr-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
              />
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setShowForm(true); setFormError("") }}
              >
                <Plus size={15} strokeWidth={2.5} />
                Novo
              </Button>
            )}
          </div>
        </div>

        {/* Formulário de criação */}
        {showForm && canManage && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-primary-200 rounded-round p-5 space-y-3"
          >
            <h3 className="text-sm font-semibold text-gray-700">Novo checklist</h3>
            <Input
              label="Nome"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex.: Abertura de loja"
              autoFocus
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Descrição (opcional)</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Breve descrição do objetivo deste checklist..."
                rows={2}
                className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none"
              />
            </div>
            {formError && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {formError}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setShowForm(false); setFormName(""); setFormDesc("") }}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                Criar e adicionar itens
              </Button>
            </div>
          </form>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckSquare size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
            <p className="text-sm">
              {search ? "Nenhum checklist encontrado." : "Nenhum checklist criado ainda."}
            </p>
            {canManage && !search && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Criar primeiro checklist
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const myExecId = userInProgress[c.id]
              return (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 rounded-round p-4 flex items-center gap-4 hover:border-gray-300 transition-colors group"
                >
                  <div className={cn(
                    "w-9 h-9 rounded-soft flex items-center justify-center flex-shrink-0",
                    c.active ? "bg-primary-50" : "bg-gray-50"
                  )}>
                    {c.active
                      ? <CircleCheck size={18} className="text-primary" strokeWidth={2} />
                      : <CircleDot   size={18} className="text-gray-400" strokeWidth={2} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      {!c.active && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                          Inativo
                        </span>
                      )}
                      {myExecId && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex-shrink-0">
                          Em andamento
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{c.description}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {c.itemCount} {c.itemCount === 1 ? "item" : "itens"} · Criado por {c.createdBy}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canExecute && c.active && (
                      myExecId ? (
                        <Link
                          href={`/execucoes/${myExecId}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-soft text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                          <RotateCcw size={12} strokeWidth={2.5} />
                          Continuar
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleExecutar(c.id)}
                          disabled={startingId === c.id}
                          title="Executar"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-soft text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          <Play size={12} strokeWidth={2.5} />
                          {startingId === c.id ? "..." : "Executar"}
                        </button>
                      )
                    )}
                    {canManage && (
                      <>
                        <Link
                          href={`/checklists/${c.id}`}
                          className="p-1.5 rounded-soft text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={15} strokeWidth={2} />
                        </Link>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="p-1.5 rounded-soft text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} strokeWidth={2} />
                        </button>
                      </>
                    )}
                    <Link
                      href={`/checklists/${c.id}`}
                      className="p-1.5 rounded-soft text-gray-300 group-hover:text-gray-500 transition-colors"
                    >
                      <ChevronRight size={16} strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
