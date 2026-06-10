import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { MODULES_CONFIG } from "@/lib/modules"
import { CheckSquare, AlertTriangle, Tag, Target, Inbox, Wrench, ArrowRight } from "lucide-react"
import Link from "next/link"

const MODULE_ICONS: Record<string, React.ElementType> = {
  checklists:      CheckSquare,
  intercorrencias: AlertTriangle,
  rastreabilidade: Tag,
  planos:          Target,
  captura:         Inbox,
  oficina:         Wrench,
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const companyModules = await prisma.companyModule.findMany({
    where: { companyId: session.user.companyId as number },
    select: { module: true },
  })
  const enabledKeys = companyModules.map((m) => m.module)
  const enabledModules = MODULES_CONFIG.filter((m) => enabledKeys.includes(m.key))

  const firstName = (session.user.name ?? "").split(" ")[0]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Saudação */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Olá, {firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Bem-vindo ao bemoo. Selecione um módulo para começar.
        </p>
      </div>

      {/* Grid de módulos */}
      {enabledModules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enabledModules.map((mod) => {
            const Icon = MODULE_ICONS[mod.key] ?? ArrowRight
            return (
              <Link
                key={mod.key}
                href={mod.href}
                className="group bg-white rounded-round border border-gray-200 p-5 hover:shadow-md hover:border-primary-100 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-soft bg-primary-50 flex items-center justify-center">
                    <Icon size={20} className="text-primary" strokeWidth={2} />
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-300 group-hover:text-primary transition-colors mt-1"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{mod.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{mod.description}</p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Nenhum módulo habilitado para esta empresa.</p>
          {(session.user.platformAdmin as boolean) && (
            <Link
              href="/plataforma/empresas"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
            >
              Gerenciar módulos <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
