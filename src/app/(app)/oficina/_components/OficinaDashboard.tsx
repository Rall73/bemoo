"use client"

import Link from "next/link"
import {
  ClipboardList, CheckCircle2, Clock, Recycle,
  AlertTriangle, Plus, ArrowRight,
} from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  NOVO:            "Novo",
  EM_ANALISE:      "Em análise",
  PENDENTE:        "Pendente",
  EM_PRODUCAO:     "Em produção",
  ENTREGA_PARCIAL: "Entrega parcial",
  CONCLUIDO:       "Concluído",
  CANCELADO:       "Cancelado",
}

const STATUS_COLOR: Record<string, string> = {
  NOVO:            "bg-gray-100 text-gray-700",
  EM_ANALISE:      "bg-blue-100 text-blue-700",
  PENDENTE:        "bg-yellow-100 text-yellow-700",
  EM_PRODUCAO:     "bg-indigo-100 text-indigo-700",
  ENTREGA_PARCIAL: "bg-orange-100 text-orange-700",
  CONCLUIDO:       "bg-green-100 text-green-700",
  CANCELADO:       "bg-red-100 text-red-600",
}

interface Props {
  porStatus:      { status: string; total: number }[]
  totalMes:       number
  concluidosMes:  number
  backlog:        number
  recicladoKg:    number
  materiaisAlerta: { id: number; name: string; unit: string; quantity: number; minQuantity: number }[]
  role:           string
}

export function OficinaDashboard({
  porStatus, totalMes, concluidosMes, backlog, recicladoKg, materiaisAlerta, role,
}: Props) {
  const canManage = role === "ADMIN" || role === "GESTOR"

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<ClipboardList size={20} className="text-[#7C5C3E]" />}
          label="Pedidos no mês"
          value={totalMes}
          bg="bg-amber-50"
        />
        <KpiCard
          icon={<CheckCircle2 size={20} className="text-green-600" />}
          label="Concluídos no mês"
          value={concluidosMes}
          bg="bg-green-50"
        />
        <KpiCard
          icon={<Clock size={20} className="text-indigo-600" />}
          label="Backlog atual"
          value={backlog}
          bg="bg-indigo-50"
        />
        <KpiCard
          icon={<Recycle size={20} className="text-teal-600" />}
          label="Material reciclado (mês)"
          value={recicladoKg > 0 ? `${recicladoKg.toFixed(1)} un` : "—"}
          bg="bg-teal-50"
        />
      </div>

      {/* Distribuição por status + ações rápidas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Pedidos por status</h2>
          {porStatus.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum pedido cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {porStatus.map((s) => (
                <li key={s.status} className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span className="font-semibold text-gray-800">{s.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Acesso rápido</h2>
          <div className="space-y-2">
            <QuickLink href="/oficina/pedidos/novo" icon={<Plus size={16} />} label="Novo pedido" />
            <QuickLink href="/oficina/pedidos"      icon={<ClipboardList size={16} />} label="Ver todos os pedidos" />
            {canManage && (
              <>
                <QuickLink href="/oficina/estoque"   icon={<Recycle size={16} />}       label="Estoque de materiais" />
                <QuickLink href="/oficina/cadastros" icon={<ArrowRight size={16} />}    label="Cadastros (áreas, produtos...)" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de estoque */}
      {canManage && materiaisAlerta.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-yellow-600" />
            <h2 className="text-sm font-semibold text-yellow-800">
              Estoque abaixo do mínimo ({materiaisAlerta.length} item{materiaisAlerta.length > 1 ? "s" : ""})
            </h2>
          </div>
          <ul className="space-y-1">
            {materiaisAlerta.map((m) => (
              <li key={m.id} className="text-sm text-yellow-800">
                <span className="font-medium">{m.name}</span>
                {" — "}
                {m.quantity} {m.unit} (mínimo: {m.minQuantity})
              </li>
            ))}
          </ul>
          <Link href="/oficina/estoque" className="inline-flex items-center gap-1 mt-3 text-xs text-yellow-700 font-medium hover:underline">
            Gerenciar estoque <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon, label, value, bg }: {
  icon:  React.ReactNode
  label: string
  value: number | string
  bg:    string
}) {
  return (
    <div className={`${bg} rounded-lg p-4 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-600 font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
      <ArrowRight size={14} className="ml-auto text-gray-300" />
    </Link>
  )
}
