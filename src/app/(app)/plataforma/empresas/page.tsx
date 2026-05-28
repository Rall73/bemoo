import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { EmpresasClient } from "./_components/EmpresasClient"

export const metadata: Metadata = { title: "Empresas" }

export default async function PlataformaEmpresasPage() {
  const companies = await prisma.company.findMany({
    where:   { deletedAt: null },
    select: {
      id:          true,
      name:        true,
      email:       true,
      plan:        true,
      createdAt:   true,
      suspendedAt: true,
      _count: {
        select: {
          users:   { where: { deletedAt: null } },
          modules: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const total      = companies.length
  const ativas     = companies.filter((c) => !c.suspendedAt).length
  const suspensas  = companies.filter((c) => c.suspendedAt).length
  const pagas      = companies.filter((c) => c.plan !== "FREE").length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Empresas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie todas as empresas da plataforma.</p>
        </div>
        <Link
          href="/plataforma/empresas/nova"
          className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-soft hover:bg-primary-700 transition-colors"
        >
          + Nova empresa
        </Link>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",     value: total,    color: "text-gray-900" },
          { label: "Ativas",    value: ativas,   color: "text-success" },
          { label: "Suspensas", value: suspensas, color: "text-error" },
          { label: "Plano pago",value: pagas,    color: "text-primary" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-round px-4 py-3">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <EmpresasClient
        companies={companies.map((c) => ({
          id:          c.id,
          name:        c.name,
          email:       c.email,
          plan:        c.plan,
          createdAt:   c.createdAt.toISOString(),
          suspendedAt: c.suspendedAt?.toISOString() ?? null,
          userCount:   c._count.users,
          moduleCount: c._count.modules,
        }))}
      />
    </div>
  )
}
