"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, ChevronRight, AlertCircle } from "lucide-react"
import { formatarData } from "@/lib/date"

const STATUS_LABEL: Record<string, string> = {
  NOVO:            "Novo",
  EM_ANALISE:      "Em análise",
  PENDENTE:        "Pendente",
  EM_PRODUCAO:     "Em produção",
  ENTREGA_PARCIAL: "Entrega parcial",
  CONCLUIDO:       "Concluído",
  CANCELADO:       "Cancelado",
}

const STATUS_STYLE: Record<string, string> = {
  NOVO:            "bg-gray-100 text-gray-700",
  EM_ANALISE:      "bg-blue-100 text-blue-700",
  PENDENTE:        "bg-yellow-100 text-yellow-800",
  EM_PRODUCAO:     "bg-indigo-100 text-indigo-700",
  ENTREGA_PARCIAL: "bg-orange-100 text-orange-700",
  CONCLUIDO:       "bg-green-100 text-green-700",
  CANCELADO:       "bg-red-100 text-red-600",
}

const STATUS_OPTIONS = ["", "NOVO", "EM_ANALISE", "PENDENTE", "EM_PRODUCAO", "ENTREGA_PARCIAL", "CONCLUIDO", "CANCELADO"]

interface Pedido {
  id:               number
  areaName:         string
  productName:      string
  productCategory:  string | null
  requesterName:    string
  assigneeName:     string | null
  quantity:         number
  quantityDelivered:number
  desiredDate:      string | null
  status:           string
  pauseReasonName:  string | null
  deliveriesCount:  number
  createdAt:        string
}

interface Props {
  pedidos: Pedido[]
  role:    string
}

export function PedidosClient({ pedidos, role }: Props) {
  const [filtroStatus, setFiltroStatus] = useState("")
  const [filtroTexto,  setFiltroTexto]  = useState("")

  const filtered = pedidos.filter((p) => {
    if (filtroStatus && p.status !== filtroStatus) return false
    if (filtroTexto) {
      const q = filtroTexto.toLowerCase()
      if (
        !p.productName.toLowerCase().includes(q) &&
        !p.areaName.toLowerCase().includes(q) &&
        !p.requesterName.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/oficina/pedidos/novo"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} strokeWidth={2} />
          Novo pedido
        </Link>

        <input
          type="text"
          placeholder="Buscar por produto, área ou solicitante..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="flex-1 min-w-48 px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? STATUS_LABEL[s] : "Todos os status"}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {filtered.map((p) => {
            const atrasado =
              p.desiredDate &&
              p.status !== "CONCLUIDO" &&
              p.status !== "CANCELADO" &&
              new Date(p.desiredDate) < new Date()

            return (
              <Link
                key={p.id}
                href={`/oficina/pedidos/${p.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                {/* Código */}
                <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">
                  OS-{String(p.id).padStart(5, "0")}
                </span>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {p.productName}
                    </span>
                    {p.productCategory && (
                      <span className="text-xs text-gray-400">· {p.productCategory}</span>
                    )}
                    {atrasado && (
                      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.areaName} · {p.requesterName}
                    {p.assigneeName && ` · Resp: ${p.assigneeName}`}
                    {p.pauseReasonName && ` · Pausa: ${p.pauseReasonName}`}
                  </p>
                </div>

                {/* Quantidade */}
                <div className="text-right flex-shrink-0 text-xs text-gray-500">
                  {p.quantityDelivered}/{p.quantity} un
                  {p.deliveriesCount > 0 && (
                    <span className="text-gray-400"> · {p.deliveriesCount} entr.</span>
                  )}
                </div>

                {/* Data */}
                <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right hidden md:block">
                  {p.desiredDate ? formatarData(p.desiredDate) : "Sem prazo"}
                </div>

                {/* Status */}
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${STATUS_STYLE[p.status] ?? ""}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>

                <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
