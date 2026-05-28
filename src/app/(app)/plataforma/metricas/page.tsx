import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Building2, Users, LayoutGrid, TrendingUp } from "lucide-react"
import { MODULES_CONFIG } from "@/lib/modules"

export const metadata: Metadata = { title: "Métricas da plataforma" }

export default async function MetricasPage() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalEmpresas,
    empresasAtivas,
    empresasSuspensas,
    totalUsuarios,
    novasEmpresas30d,
    modulosCounts,
    planosCounts,
  ] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, suspendedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
    // Contagem por módulo
    prisma.companyModule.groupBy({ by: ["module"], _count: { module: true } }),
    // Contagem por plano
    prisma.company.groupBy({
      by: ["plan"],
      where: { deletedAt: null },
      _count: { plan: true },
    }),
  ])

  const PLAN_LABELS: Record<string, string> = {
    FREE:         "Free",
    STARTER:      "Starter",
    PROFESSIONAL: "Professional",
    ENTERPRISE:   "Enterprise",
  }

  const PLAN_COLORS: Record<string, string> = {
    FREE:         "bg-gray-100 text-gray-600",
    STARTER:      "bg-blue-50 text-blue-700",
    PROFESSIONAL: "bg-primary-50 text-primary",
    ENTERPRISE:   "bg-accent-100 text-accent",
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Métricas da plataforma
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral de uso em tempo real.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Total de empresas"
          value={totalEmpresas}
          icon={Building2}
          color="text-primary bg-primary-50"
        />
        <KpiCard
          label="Empresas ativas"
          value={empresasAtivas}
          icon={TrendingUp}
          color="text-success bg-green-50"
          sub={`${empresasSuspensas} suspensa${empresasSuspensas !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Total de usuários"
          value={totalUsuarios}
          icon={Users}
          color="text-blue-600 bg-blue-50"
        />
        <KpiCard
          label="Novas (30 dias)"
          value={novasEmpresas30d}
          icon={LayoutGrid}
          color="text-accent bg-accent-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Módulos mais usados */}
        <div className="bg-white border border-gray-200 rounded-round p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Módulos habilitados</h2>
          <div className="space-y-2.5">
            {MODULES_CONFIG.map((mod) => {
              const count = modulosCounts.find((m) => m.module === mod.key)?._count.module ?? 0
              const pct   = totalEmpresas > 0 ? Math.round((count / totalEmpresas) * 100) : 0
              return (
                <div key={mod.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{mod.label}</span>
                    <span className="text-gray-400">{count} empresa{count !== 1 ? "s" : ""} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Distribuição por plano */}
        <div className="bg-white border border-gray-200 rounded-round p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Distribuição por plano</h2>
          <div className="space-y-2.5">
            {planosCounts.sort((a, b) => b._count.plan - a._count.plan).map((p) => {
              const pct = totalEmpresas > 0 ? Math.round((p._count.plan / totalEmpresas) * 100) : 0
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded w-28 text-center ${PLAN_COLORS[p.plan] ?? "bg-gray-100 text-gray-600"}`}>
                    {PLAN_LABELS[p.plan] ?? p.plan}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{p._count.plan}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

function KpiCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string
  value: number
  icon:  React.ElementType
  color: string
  sub?:  string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-round p-4">
      <div className={`w-9 h-9 rounded-soft flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
