import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EstoqueClient } from "../_components/EstoqueClient"

export const metadata: Metadata = { title: "Estoque — Oficina" }

export default async function EstoquePage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number
  const role      = session.user.role as string

  if (role === "EXECUTOR") redirect("/oficina")

  const materiais = await prisma.workshopMaterial.findMany({
    where:   { companyId, deletedAt: null },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Estoque de materiais
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Controle de insumos e alertas de reposição.
          </p>
        </div>
      </div>

      <EstoqueClient
        materiais={materiais.map((m) => ({
          id:          m.id,
          name:        m.name,
          unit:        m.unit,
          quantity:    Number(m.quantity),
          minQuantity: Number(m.minQuantity),
          unitCost:    m.unitCost ? Number(m.unitCost) : null,
          active:      m.active,
        }))}
        canEdit={role === "ADMIN" || role === "GESTOR"}
      />
    </div>
  )
}
