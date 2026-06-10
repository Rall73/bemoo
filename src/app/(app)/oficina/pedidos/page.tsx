import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { PedidosClient } from "../_components/PedidosClient"

export const metadata: Metadata = { title: "Pedidos — Oficina" }

export default async function PedidosPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number
  const userId    = parseInt(session.user.id)
  const role      = session.user.role as string
  const isExecutor = role === "EXECUTOR"

  const pedidos = await prisma.workshopServiceOrder.findMany({
    where: {
      companyId,
      deletedAt:   null,
      ...(isExecutor ? { requestedBy: userId } : {}),
    },
    include: {
      requester:   { select: { name: true } },
      assignee:    { select: { name: true } },
      area:        { select: { name: true } },
      product:     { select: { name: true, category: true } },
      pauseReason: { select: { name: true } },
      _count:      { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            {isExecutor ? "Meus pedidos" : "Pedidos"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isExecutor
              ? "Acompanhe o status das suas solicitações."
              : "Gerencie a fila de ordens de serviço."}
          </p>
        </div>
      </div>

      <PedidosClient
        pedidos={pedidos.map((p) => ({
          id:               p.id,
          areaName:         p.area.name,
          productName:      p.product.name,
          productCategory:  p.product.category,
          requesterName:    p.requester.name,
          assigneeName:     p.assignee?.name ?? null,
          quantity:         p.quantity,
          quantityDelivered:p.quantityDelivered,
          desiredDate:      p.desiredDate?.toISOString() ?? null,
          status:           p.status,
          pauseReasonName:  p.pauseReason?.name ?? null,
          deliveriesCount:  p._count.deliveries,
          createdAt:        p.createdAt.toISOString(),
        }))}
        role={role}
      />
    </div>
  )
}
