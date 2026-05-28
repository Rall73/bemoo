import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EmpresaConfigClient } from "./_components/EmpresaConfigClient"

export const metadata: Metadata = { title: "Configurações da empresa" }

export default async function ConfigEmpresaPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const company = await prisma.company.findUnique({
    where:  { id: session.user.companyId },
    select: { id: true, name: true, document: true, email: true, plan: true, createdAt: true },
  })
  if (!company) redirect("/dashboard")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Empresa
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados cadastrais da sua empresa no bemoo.</p>
      </div>

      <EmpresaConfigClient
        company={{
          name:      company.name,
          document:  company.document ?? "",
          email:     company.email,
          plan:      company.plan,
          createdAt: company.createdAt.toISOString(),
        }}
        isAdmin={isAdmin}
      />
    </div>
  )
}
