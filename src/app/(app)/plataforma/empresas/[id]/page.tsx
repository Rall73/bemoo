import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, LayoutGrid } from "lucide-react"
import { EmpresaClient } from "./_components/EmpresaClient"

export const metadata: Metadata = { title: "Detalhes da empresa" }

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const companyId = parseInt(id)
  if (isNaN(companyId)) notFound()

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: {
      id:          true,
      name:        true,
      email:       true,
      document:    true,
      plan:        true,
      createdAt:   true,
      suspendedAt: true,
    },
  })
  if (!company) notFound()

  const [users, modules] = await Promise.all([
    prisma.user.findMany({
      where:   { companyId, deletedAt: null },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.companyModule.findMany({
      where:  { companyId },
      select: { module: true },
    }),
  ])

  const enabledModules = modules.map((m) => m.module)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Navegação */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/plataforma/empresas"
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-soft hover:bg-gray-100"
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900 truncate" style={{ letterSpacing: "-0.02em" }}>
            {company.name}
          </h1>
          <p className="text-sm text-gray-500">
            Criada em {new Date(company.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          href={`/plataforma/empresas/${company.id}/modulos`}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary-100 bg-primary-50 rounded-soft hover:bg-primary-100 transition-colors"
        >
          <LayoutGrid size={15} strokeWidth={2} />
          Módulos
        </Link>
      </div>

      <EmpresaClient
        company={{
          id:          company.id,
          name:        company.name,
          email:       company.email,
          document:    company.document ?? "",
          plan:        company.plan,
          suspendedAt: company.suspendedAt?.toISOString() ?? null,
        }}
        users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
        enabledModules={enabledModules}
      />
    </div>
  )
}
