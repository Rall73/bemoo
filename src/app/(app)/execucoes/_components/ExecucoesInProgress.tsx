"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, Trash2, Play, Loader2 } from "lucide-react"

interface InProgressExecution {
  id:            number
  checklistName: string
  executorName:  string
  startedAt:     string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export function ExecucoesInProgress({ executions: initial }: { executions: InProgressExecution[] }) {
  const [executions, setExecutions] = useState(initial)
  const [deleting, setDeleting]     = useState<number | null>(null)
  const [error, setError]           = useState("")

  async function handleDelete(id: number) {
    if (!confirm("Excluir esta execução em andamento? O progresso será perdido.")) return
    setDeleting(id)
    setError("")
    try {
      const res = await fetch(`/api/execucoes/${id}`, { method: "DELETE" })
      if (res.ok) {
        setExecutions((prev) => prev.filter((e) => e.id !== id))
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.message ?? "Erro ao excluir.")
      }
    } catch {
      setError("Erro de conexão ao excluir.")
    } finally {
      setDeleting(null)
    }
  }

  if (executions.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-0.5">Em andamento</p>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-soft px-3 py-2 text-xs text-error">{error}</div>
      )}
      {executions.map((ex) => (
        <div
          key={ex.id}
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-round p-4"
        >
          <div className="w-9 h-9 rounded-soft bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-amber-600" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{ex.checklistName}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {ex.executorName} · iniciado em {fmtDate(ex.startedAt)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/execucoes/${ex.id}`}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-soft bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
            >
              <Play size={12} strokeWidth={2.5} /> Continuar
            </Link>
            <button
              type="button"
              onClick={() => handleDelete(ex.id)}
              disabled={deleting === ex.id}
              title="Excluir execução"
              className="flex items-center justify-center w-8 h-8 rounded-soft border border-red-200 text-error hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting === ex.id
                ? <Loader2 size={14} className="animate-spin" />
                : <Trash2 size={14} strokeWidth={2} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
