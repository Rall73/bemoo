"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, LayoutGrid, CheckSquare, AlertTriangle, Tag, Target, Inbox } from "lucide-react"
import { MODULES_CONFIG } from "@/lib/modules"

const MODULE_ICONS = {
  checklists:      CheckSquare,
  intercorrencias: AlertTriangle,
  rastreabilidade: Tag,
  planos:          Target,
  captura:         Inbox,
} as const

export default function ModulosPage() {
  const router   = useRouter()
  const { id }   = useParams<{ id: string }>()
  const companyId = parseInt(id)

  const [enabled,   setEnabled]   = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const [error,     setError]     = useState("")
  const [companyName, setCompanyName] = useState("")

  // Carrega estado atual dos módulos
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/plataforma/empresas/${companyId}/modulos`)
        if (res.ok) {
          const json = await res.json()
          setEnabled(new Set(json.enabledModules as string[]))
          setCompanyName(json.companyName ?? "")
        }
      } catch {
        setError("Erro ao carregar módulos.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId])

  async function toggleModule(key: string, currentEnabled: boolean) {
    setToggling(key)
    setError("")
    try {
      const res = await fetch(`/api/plataforma/empresas/${companyId}/modulos`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ module: key, enabled: !currentEnabled }),
      })
      if (res.ok) {
        setEnabled((prev) => {
          const next = new Set(prev)
          if (currentEnabled) next.delete(key)
          else next.add(key)
          return next
        })
      } else {
        const j = await res.json()
        setError(j.message ?? "Erro ao atualizar módulo.")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Navegação */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/plataforma/empresas/${companyId}`}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-soft hover:bg-gray-100"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 truncate" style={{ letterSpacing: "-0.02em" }}>
            Módulos
          </h1>
          {companyName && (
            <p className="text-sm text-gray-500">{companyName}</p>
          )}
        </div>
        <LayoutGrid size={20} strokeWidth={2} className="text-gray-300" />
      </div>

      {error && (
        <p className="mb-4 text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-round divide-y divide-gray-100">
          {MODULES_CONFIG.map((mod) => {
            const Icon       = MODULE_ICONS[mod.key as keyof typeof MODULE_ICONS]
            const isEnabled  = enabled.has(mod.key)
            const isToggling = toggling === mod.key

            return (
              <div key={mod.key} className="flex items-center gap-4 px-5 py-4">
                {/* Ícone */}
                <div
                  className="w-9 h-9 rounded-round flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${mod.color}18` }}
                >
                  <Icon size={18} strokeWidth={2} style={{ color: mod.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{mod.label}</p>
                  <p className="text-xs text-gray-500 truncate">{mod.description}</p>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleModule(mod.key, isEnabled)}
                  disabled={isToggling}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                    isEnabled ? "bg-primary" : "bg-gray-200"
                  }`}
                  title={isEnabled ? `Desabilitar ${mod.label}` : `Habilitar ${mod.label}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        {enabled.size} de {MODULES_CONFIG.length} módulo{MODULES_CONFIG.length !== 1 ? "s" : ""} habilitado{enabled.size !== 1 ? "s" : ""}
      </p>
    </div>
  )
}
