"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Plus, FileText, Pencil, Trash2, ToggleLeft, ToggleRight,
  BookOpen, ChevronRight, Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface Template {
  id:             number
  name:           string
  description:    string | null
  templateSource: string | null
  active:         boolean
  itemCount:      number
  createdAt:      string
}

interface Props {
  initialTemplates: Template[]
}

export function TemplatesAdminClient({ initialTemplates }: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)

  // ─── Criar template ───────────────────────────────────────────────
  const [showForm,  setShowForm]  = useState(false)
  const [formName,  setFormName]  = useState("")
  const [formDesc,  setFormDesc]  = useState("")
  const [formSrc,   setFormSrc]   = useState("")
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    setSaving(true); setFormError("")
    try {
      const res  = await fetch("/api/plataforma/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:           formName.trim(),
          description:    formDesc.trim() || null,
          templateSource: formSrc.trim()  || null,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        // Redireciona para o editor de checklist para adicionar itens/campos
        router.push(`/checklists/${json.data.id}`)
      } else {
        setFormError(json.message ?? "Erro ao criar template.")
        setSaving(false)
      }
    } catch {
      setFormError("Erro de conexão.")
      setSaving(false)
    }
  }

  // ─── Toggle ativo ─────────────────────────────────────────────────
  const [toggling, setToggling] = useState<number | null>(null)

  async function handleToggle(id: number, active: boolean) {
    setToggling(id)
    try {
      await fetch(`/api/plataforma/templates/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ active: !active }),
      })
      setTemplates((prev) =>
        prev.map((t) => t.id === id ? { ...t, active: !active } : t)
      )
    } finally {
      setToggling(null)
    }
  }

  // ─── Deletar ──────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<number | null>(null)

  async function handleDelete(id: number) {
    if (!confirm("Excluir este template? Empresas que já o importaram não serão afetadas.")) return
    setDeleting(id)
    try {
      await fetch(`/api/plataforma/templates/${id}`, { method: "DELETE" })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => { setShowForm(true); setFormError("") }}
        >
          <Plus size={15} strokeWidth={2.5} /> Novo template
        </Button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-primary-200 rounded-round p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-700">Novo template</h3>
          <Input
            label="Nome do template"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex.: Auditoria ISO 9001:2015"
            autoFocus
            required
          />
          <Input
            label="Fonte / norma (opcional)"
            value={formSrc}
            onChange={(e) => setFormSrc(e.target.value)}
            placeholder="Ex.: ISO 9001:2015, NR-12, Procedimento Interno..."
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Descrição (opcional)</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={2}
              placeholder="Breve descrição do objetivo deste template..."
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-none"
            />
          </div>
          {formError && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
              {formError}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Após criar, você será redirecionado para adicionar seções e campos ao template.
          </p>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { setShowForm(false); setFormName(""); setFormDesc(""); setFormSrc("") }}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              Criar e editar
            </Button>
          </div>
        </form>
      )}

      {/* Lista */}
      {templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Nenhum template criado ainda.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Criar primeiro template
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white border border-gray-200 rounded-round p-4 flex items-center gap-4 hover:border-gray-300 transition-colors group"
            >
              <div className={cn(
                "w-9 h-9 rounded-soft flex items-center justify-center flex-shrink-0",
                t.active ? "bg-primary-50" : "bg-gray-50"
              )}>
                <FileText size={18} className={t.active ? "text-primary" : "text-gray-400"} strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {!t.active && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inativo</span>
                  )}
                </div>
                {t.templateSource && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <BookOpen size={10} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{t.templateSource}</span>
                  </div>
                )}
                {t.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{t.description}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {t.itemCount} {t.itemCount === 1 ? "seção" : "seções"} ·{" "}
                  {new Date(t.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Toggle ativo */}
                <button
                  onClick={() => handleToggle(t.id, t.active)}
                  disabled={toggling === t.id}
                  title={t.active ? "Desativar" : "Ativar"}
                  className="p-1.5 rounded-soft text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                >
                  {t.active
                    ? <ToggleRight size={18} className="text-primary" strokeWidth={2} />
                    : <ToggleLeft  size={18} strokeWidth={2} />
                  }
                </button>
                {/* Editar (abre o editor de checklist) */}
                <Link
                  href={`/checklists/${t.id}`}
                  className="p-1.5 rounded-soft text-gray-400 hover:text-primary hover:bg-primary-50 transition-colors"
                  title="Editar conteúdo"
                >
                  <Pencil size={15} strokeWidth={2} />
                </Link>
                {/* Deletar */}
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="p-1.5 rounded-soft text-gray-400 hover:text-error hover:bg-red-50 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
                <Link
                  href={`/checklists/${t.id}`}
                  className="p-1.5 rounded-soft text-gray-300 group-hover:text-gray-500 transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
