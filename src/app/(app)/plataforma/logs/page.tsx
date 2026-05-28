import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Search } from "lucide-react"

export const metadata: Metadata = { title: "Logs de auditoria" }

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "login":                { label: "Login",              color: "bg-gray-100 text-gray-600" },
  "logout":               { label: "Logout",             color: "bg-gray-100 text-gray-600" },
  "usuario.criado":       { label: "Usuário criado",     color: "bg-green-50 text-green-700" },
  "usuario.desativado":   { label: "Usuário desativado", color: "bg-red-50 text-error" },
  "usuario.role_alterado":{ label: "Role alterado",      color: "bg-blue-50 text-blue-700" },
  "convite.enviado":      { label: "Convite enviado",    color: "bg-blue-50 text-blue-700" },
  "convite.reenviado":    { label: "Convite reenviado",  color: "bg-blue-50 text-blue-700" },
  "convite.cancelado":    { label: "Convite cancelado",  color: "bg-yellow-50 text-yellow-700" },
  "convite.aceito":       { label: "Convite aceito",     color: "bg-green-50 text-green-700" },
  "empresa.criada":       { label: "Empresa criada",     color: "bg-green-50 text-green-700" },
  "empresa.editada":      { label: "Empresa editada",    color: "bg-blue-50 text-blue-700" },
  "empresa.suspensa":     { label: "Empresa suspensa",   color: "bg-red-50 text-error" },
  "empresa.reativada":    { label: "Empresa reativada",  color: "bg-green-50 text-green-700" },
  "modulo.habilitado":    { label: "Módulo habilitado",  color: "bg-primary-50 text-primary" },
  "modulo.desabilitado":  { label: "Módulo desabilitado",color: "bg-yellow-50 text-yellow-700" },
  "legal.aceito":         { label: "Legal aceito",       color: "bg-gray-100 text-gray-600" },
  "senha.reset_solicitado":{ label: "Reset solicitado",  color: "bg-yellow-50 text-yellow-700" },
  "senha.reset_concluido": { label: "Reset concluído",   color: "bg-gray-100 text-gray-600" },
}

const PAGE_SIZE = 50

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; company?: string }>
}) {
  const { page: pageStr, action: filterAction, company: filterCompany } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1") || 1)

  const where: Record<string, unknown> = {}
  if (filterAction)  where.action    = filterAction
  if (filterCompany) where.companyId = parseInt(filterCompany) || undefined

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: {
        company: { select: { name: true } },
        user:    { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Para o filtro de empresas
  const companies = await prisma.company.findMany({
    where:   { deletedAt: null },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  })

  // Ações únicas para o filtro
  const actionKeys = Object.keys(ACTION_LABELS)

  function buildUrl(params: Record<string, string | number | undefined>) {
    const base: Record<string, string> = {}
    if (filterAction)  base.action  = filterAction
    if (filterCompany) base.company = filterCompany
    if (page > 1)      base.page    = String(page)
    const merged = { ...base, ...Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )}
    const qs = new URLSearchParams(merged).toString()
    return `/plataforma/logs${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Logs de auditoria
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total.toLocaleString("pt-BR")} registro{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Empresa */}
        <form method="GET" action="/plataforma/logs" className="flex gap-2 flex-wrap">
          {filterAction  && <input type="hidden" name="action"  value={filterAction} />}
          <select
            name="company"
            defaultValue={filterCompany ?? ""}
            onChange={(e) => (e.target.form as HTMLFormElement).submit()}
            className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Ação */}
          <select
            name="action"
            defaultValue={filterAction ?? ""}
            onChange={(e) => (e.target.form as HTMLFormElement).submit()}
            className="px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todas as ações</option>
            {actionKeys.map((k) => (
              <option key={k} value={k}>{ACTION_LABELS[k].label}</option>
            ))}
          </select>

          {(filterAction || filterCompany) && (
            <a
              href="/plataforma/logs"
              className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-soft hover:bg-gray-50"
            >
              Limpar
            </a>
          )}
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-round overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[0.9fr_1fr_0.9fr_1.2fr_0.6fr_1fr] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Data</span>
          <span>Empresa</span>
          <span>Usuário</span>
          <span>Ação</span>
          <span>Entidade</span>
          <span>IP</span>
        </div>

        {logs.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">
            Nenhum log encontrado.
          </p>
        )}

        {logs.map((log, idx) => {
          const actionCfg = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-600" }
          return (
            <div
              key={log.id}
              className={`grid grid-cols-1 md:grid-cols-[0.9fr_1fr_0.9fr_1.2fr_0.6fr_1fr] gap-2 md:gap-4 px-4 py-3 items-center text-sm ${
                idx < logs.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              {/* Data */}
              <span className="text-xs text-gray-500 tabular-nums">
                {new Date(log.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>

              {/* Empresa */}
              <span className="text-xs text-gray-700 truncate">
                {log.company?.name ?? `#${log.companyId}`}
              </span>

              {/* Usuário */}
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">
                  {log.user?.name ?? "—"}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {log.user?.email ?? `#${log.userId}`}
                </p>
              </div>

              {/* Ação */}
              <span className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${actionCfg.color}`}>
                {actionCfg.label}
              </span>

              {/* Entidade */}
              <span className="text-xs text-gray-500">
                {log.entity ? `${log.entity}${log.entityId ? ` #${log.entityId}` : ""}` : "—"}
              </span>

              {/* IP */}
              <span className="text-xs text-gray-400 font-mono truncate">
                {log.ip ?? "—"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={buildUrl({ page: page - 1 })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-soft hover:bg-gray-50"
              >
                ← Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={buildUrl({ page: page + 1 })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-soft hover:bg-gray-50"
              >
                Próxima →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
