import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, created, ok, notFound, badRequest, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"
import { WorkshopOrderStatus } from "@prisma/client"

const zCreate = z.object({
  quantity: z.number().int().min(1),
  note:     z.string().max(1000).optional(),
})

export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  const entregas = await prisma.workshopOrderDelivery.findMany({
    where:   { orderId: pedido.id },
    include: { deliverer: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })
  return ok(entregas)
})

export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  if (pedido.status === "CONCLUIDO" || pedido.status === "CANCELADO") {
    return badRequest("Não é possível registrar entrega em pedido concluído ou cancelado.")
  }

  const novoTotal = pedido.quantityDelivered + data.quantity
  if (novoTotal > pedido.quantity) {
    return badRequest(
      `Quantidade excede o total do pedido. Faltam ${pedido.quantity - pedido.quantityDelivered} unidade(s).`
    )
  }

  const userId = parseInt(session.user.id)
  const novoStatus: WorkshopOrderStatus =
    novoTotal >= pedido.quantity ? "CONCLUIDO" : "ENTREGA_PARCIAL"

  const [entrega] = await prisma.$transaction([
    prisma.workshopOrderDelivery.create({
      data: {
        orderId:     pedido.id,
        quantity:    data.quantity,
        note:        data.note ?? null,
        deliveredBy: userId,
      },
    }),
    prisma.workshopServiceOrder.update({
      where: { id: pedido.id },
      data: {
        quantityDelivered: novoTotal,
        status:    novoStatus,
        finishedAt: novoStatus === "CONCLUIDO" ? new Date() : undefined,
      },
    }),
    prisma.workshopOrderLog.create({
      data: {
        orderId:    pedido.id,
        userId,
        message:    `Entrega de ${data.quantity} unidade(s) registrada.${data.note ? ` Obs: ${data.note}` : ""}`,
        statusFrom: pedido.status,
        statusTo:   novoStatus,
      },
    }),
  ])

  logAction({
    companyId: session.user.companyId,
    userId,
    action:    "oficina.pedido.entrega_parcial",
    entity:    "WorkshopServiceOrder",
    entityId:  pedido.id,
    after:     { quantity: data.quantity, totalDelivered: novoTotal, newStatus: novoStatus },
  })

  return created(entrega)
})
