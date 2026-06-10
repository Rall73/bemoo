import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { OficinaDashboard } from "./_components/OficinaDashboard"
import { inicioMesNoBrasil } from "@/lib/date"

export const metadata: Metadata = { title: "Oficina" }

export default async function OficinaPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number
  const inicioMes = inicioMesNoBrasil()

  const [porStatus, totalMes, concluidosMes, reciclado, materiaisAlerta] = await Promise.all([
    prisma.workshopServiceOrder.groupBy({
      by:     ["status"],
      where:  { companyId, deletedAt: null },
      _count: true,
    }),
    prisma.workshopServiceOrder.count({
      where: { companyId, deletedAt: null, createdAt: { gte: inicioMes } },
    }),
    prisma.workshopServiceOrder.count({
      where: { companyId, deletedAt: null, status: "CONCLUIDO", finishedAt: { gte: inicioMes } },
    }),
    prisma.workshopMaterialConsumption.aggregate({
      where: {
        order:     { companyId, deletedAt: null },
        source:    "RECICLADO",
        deletedAt: null,
        createdAt: { gte: inicioMes },
      },
      _sum: { quantity: true },
    }),
    prisma.workshopMaterial.findMany({
      where:  { companyId, deletedAt: null, active: true },
      select: { id: true, name: true, unit: true, quantity: true, minQuantity: true },
    }),
  ])

  const backlog = porStatus
    .filter((s) => s.status !== "CONCLUIDO" && s.status !== "CANCELADO")
    .reduce((acc, s) => acc + s._count, 0)

  const alertas = materiaisAlerta.filter(
    (m) => Number(m.quantity) <= Number(m.minQuantity)
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Oficina
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Visão geral das ordens de serviço e indicadores do mês.
        </p>
      </div>

      <OficinaDashboard
        porStatus={porStatus.map((s) => ({ status: s.status, total: s._count }))}
        totalMes={totalMes}
        concluidosMes={concluidosMes}
        backlog={backlog}
        recicladoKg={Number(reciclado._sum.quantity ?? 0)}
        materiaisAlerta={alertas.map((m) => ({
          id:          m.id,
          name:        m.name,
          unit:        m.unit,
          quantity:    Number(m.quantity),
          minQuantity: Number(m.minQuantity),
        }))}
        role={session.user.role}
      />
    </div>
  )
}
