import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, notFound, forbidden, badRequest, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"
import { WorkshopOrderStatus } from "@prisma/client"

const zUpdate = z.object({
  status:        z.nativeEnum(WorkshopOrderStatus).optional(),
  assignedTo:    z.number().int().positive().nullable().optional(),
  pauseReasonId: z.number().int().positive().nullable().optional(),
  message:       z.string().max(2000).optional(),
})

export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
    include: {
      requester:   { select: { id: true, name: true } },
      assignee:    { select: { id: true, name: true } },
      area:        true,
      product:     true,
      pauseReason: true,
      attachments: true,
      logs: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      deliveries: {
        include: { deliverer: { select: { name: true } } },
        orderBy:  { createdAt: "asc" },
      },
      consumptions: {
        where:   { deletedAt: null },
        include: {
          material: { select: { name: true, unit: true } },
          creator:  { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  // EXECUTOR só acessa os próprios pedidos
  if (
    session.user.role === "EXECUTOR" &&
    pedido.requestedBy !== parseInt(session.user.id)
  ) {
    return forbidden()
  }

  return ok(pedido)
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  const userId = parseInt(session.user.id)

  // EXECUTOR só pode cancelar os próprios pedidos em status NOVO
  if (session.user.role === "EXECUTOR") {
    if (pedido.requestedBy !== userId) return forbidden()
    if (data.status !== "CANCELADO")   return forbidden("Solicitantes só podem cancelar pedidos.")
    if (pedido.status !== "NOVO")      return badRequest("Só é possível cancelar pedidos com status Novo.")
  } else {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError
  }

  const updateData: Record<string, unknown> = {}
  if (data.status        !== undefined) updateData.status        = data.status
  if (data.assignedTo    !== undefined) updateData.assignedTo    = data.assignedTo
  if (data.pauseReasonId !== undefined) updateData.pauseReasonId = data.pauseReasonId

  // Timestamps automáticos por status
  if (data.status === "EM_PRODUCAO" && !pedido.startedAt) updateData.startedAt = new Date()
  if (data.status === "CONCLUIDO")                        updateData.finishedAt = new Date()

  const updated = await prisma.workshopServiceOrder.update({
    where: { id: pedido.id },
    data:  updateData,
  })

  // Registra no log de negociação
  const logMsg = data.message?.trim() || statusLabel(data.status)
  if (logMsg || data.status) {
    await prisma.workshopOrderLog.create({
      data: {
        orderId:    pedido.id,
        userId,
        message:    logMsg || "Status atualizado.",
        statusFrom: data.status ? pedido.status : undefined,
        statusTo:   data.status ?? undefined,
      },
    })
  }

  logAction({
    companyId: session.user.companyId,
    userId,
    action:    data.status === "CANCELADO" ? "oficina.pedido.cancelado" : "oficina.pedido.status_alterado",
    entity:    "WorkshopServiceOrder",
    entityId:  pedido.id,
    before:    { status: pedido.status },
    after:     { status: updated.status },
  })

  return ok(updated)
})

function statusLabel(status?: WorkshopOrderStatus): string {
  const labels: Partial<Record<WorkshopOrderStatus, string>> = {
    EM_ANALISE:     "Pedido em análise.",
    PENDENTE:       "Pedido pausado aguardando definição.",
    EM_PRODUCAO:    "Produção iniciada.",
    ENTREGA_PARCIAL:"Entrega parcial registrada.",
    CONCLUIDO:      "Pedido concluído.",
    CANCELADO:      "Pedido cancelado.",
  }
  return status ? (labels[status] ?? "") : ""
}
