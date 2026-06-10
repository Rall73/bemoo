import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CadastrosClient } from "../_components/CadastrosClient"

export const metadata: Metadata = { title: "Cadastros — Oficina" }

export default async function CadastrosPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number
  const role      = session.user.role as string

  if (role !== "ADMIN") redirect("/oficina")

  const [areas, produtos, motivos] = await Promise.all([
    prisma.workshopArea.findMany({
      where: { companyId, deletedAt: null }, orderBy: { name: "asc" },
    }),
    prisma.workshopProduct.findMany({
      where: { companyId, deletedAt: null }, orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.workshopPauseReason.findMany({
      where: { companyId, deletedAt: null }, orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Cadastros
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gerencie as tabelas de configuração do módulo Oficina.
        </p>
      </div>

      <CadastrosClient
        areas={areas.map((a) => ({ id: a.id, name: a.name, active: a.active }))}
        produtos={produtos.map((p) => ({ id: p.id, name: p.name, category: p.category, active: p.active }))}
        motivos={motivos.map((m) => ({ id: m.id, name: m.name, active: m.active }))}
      />
    </div>
  )
}
