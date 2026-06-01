"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface Company { id: number; name: string }
interface ActionOption { key: string; label: string }

interface Props {
  companies:    Company[]
  actionKeys:   ActionOption[]
  filterCompany?: string
  filterAction?:  string
}

export function LogsFilters({ companies, actionKeys, filterCompany, filterAction }: Props) {
  const router = useRouter()

  function apply(overrides: { company?: string; action?: string }) {
    const params = new URLSearchParams()
    const company = overrides.company ?? filterCompany ?? ""
    const action  = overrides.action  ?? filterAction  ?? ""
    if (company) params.set("company", company)
    if (action)  params.set("action",  action)
    router.push(`/plataforma/logs${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="flex gap-2 flex-wrap mb-4">
      <select
        value={filterCompany ?? ""}
        onChange={(e) => apply({ company: e.target.value })}
        className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Todas as empresas</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        value={filterAction ?? ""}
        onChange={(e) => apply({ action: e.target.value })}
        className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Todas as ações</option>
        {actionKeys.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {(filterAction || filterCompany) && (
        <button
          onClick={() => router.push("/plataforma/logs")}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-soft hover:bg-gray-50"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
