"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, CircleCheck, CircleX } from "lucide-react"

// ─── Tipos e constantes ───────────────────────────────────────────

interface Company {
  id:          number
  name:        string
  email:       string
  plan:        string
  createdAt:   string
  suspendedAt: string | null
  userCount:   number
  moduleCount: number
}

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE:         { label: "Free",         className: "bg-gray-100 text-gray-600" },
  STARTER:      { label: "Starter",      className: "bg-blue-50 text-blue-700" },
  PROFESSIONAL: { label: "Professional", className: "bg-primary-50 text-primary" },
  ENTERPRISE:   { label: "Enterprise",   className: "bg-accent-100 text-accent" },
}

function PlanBadge({ plan }: { plan: string }) {
  const cfg = PLAN_CONFIG[plan] ?? { label: plan, className: "bg-gray-100 text-gray-600" }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${cfg.className}`}>{cfg.label}</span>
  )
}

// ─── Componente ───────────────────────────────────────────────────

export function EmpresasClient({ companies }: { companies: Company[] }) {
  const router = useRouter()
  const [search,       setSearch]       = useState("")
  const [filterPlan,   setFilterPlan]   = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [feedback,     setFeedback]     = useState("")

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    const matchPlan   = !filterPlan   || c.plan === filterPlan
    const matchStatus = !filterStatus || (filterStatus === "ativa" ? !c.suspendedAt : !!c.suspendedAt)
    return matchSearch && matchPlan && matchStatus
  })

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 3000)
  }

  async function toggleSuspend(company: Company) {
    const action = company.suspendedAt ? "reactivate" : "suspend"
    setActionLoading(company.id)
    try {
      const res = await fetch(`/api/plataforma/empresas/${company.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (res.ok) {
        showFeedback(action === "suspend" ? `${company.name} suspensa.` : `${company.name} reativada.`)
        router.refresh()
      } else {
        const j = await res.json()
        showFeedback(j.message ?? "Erro na operação.")
      }
    } catch { showFeedback("Erro de conexão.") }
    finally  { setActionLoading(null) }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
          <input
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos os planos</option>
          {Object.entries(PLAN_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos os status</option>
          <option value="ativa">Ativas</option>
          <option value="suspensa">Suspensas</option>
        </select>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="mb-3 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-round text-sm text-primary-700">
          {feedback}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-round overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[1.5fr_1.4fr_0.8fr_0.6fr_0.5fr_0.8fr_2rem] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Empresa</span>
          <span>E-mail</span>
          <span>Plano</span>
          <span>Usuários</span>
          <span>Módulos</span>
          <span>Status</span>
          <span />
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">
            {companies.length === 0 ? "Nenhuma empresa cadastrada." : "Nenhuma empresa encontrada."}
          </p>
        )}

        {filtered.map((company, idx) => {
          const suspended = !!company.suspendedAt
          const loading   = actionLoading === company.id
          return (
            <div
              key={company.id}
              className={`grid grid-cols-1 md:grid-cols-[1.5fr_1.4fr_0.8fr_0.6fr_0.5fr_0.8fr_2rem] gap-2 md:gap-4 px-4 py-3.5 items-center ${
                idx < filtered.length - 1 ? "border-b border-gray-100" : ""
              } ${suspended ? "opacity-60" : ""}`}
            >
              <div className="font-medium text-gray-900 text-sm truncate">{company.name}</div>
              <div className="text-gray-500 text-xs truncate">{company.email}</div>
              <div><PlanBadge plan={company.plan} /></div>
              <div className="text-sm text-gray-600">{company.userCount}</div>
              <div className="text-sm text-gray-600">{company.moduleCount}</div>

              {/* Status + toggle rápido */}
              <button
                onClick={() => toggleSuspend(company)}
                disabled={loading}
                title={suspended ? "Reativar empresa" : "Suspender empresa"}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-50 ${
                  suspended
                    ? "bg-red-50 text-error hover:bg-red-100"
                    : "bg-green-50 text-success hover:bg-green-100"
                }`}
              >
                {loading ? (
                  <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : suspended ? (
                  <CircleX size={13} strokeWidth={2} />
                ) : (
                  <CircleCheck size={13} strokeWidth={2} />
                )}
                {suspended ? "Suspensa" : "Ativa"}
              </button>

              {/* Link detalhe */}
              <Link
                href={`/plataforma/empresas/${company.id}`}
                className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-soft transition-colors"
              >
                <ChevronRight size={16} strokeWidth={2} />
              </Link>
            </div>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          {filtered.length} de {companies.length} empresa{companies.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
