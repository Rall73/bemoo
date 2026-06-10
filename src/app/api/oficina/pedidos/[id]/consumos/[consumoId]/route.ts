import { prisma } from "@/lib/prisma"
import { withAuthCtx, noContent, notFound, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

export const DELETE = withAuthCtx<{ id: string; consumoId: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const consumo = await prisma.workshopMaterialConsumption.findFirst({
    where:   { id: parseInt(params.consumoId), deletedAt: null },
    include: { order: { select: { companyId: true } }, material: true },
  })
  if (!consumo) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, consumo.order.companyId)
  if (tenantError) return tenantError

  const userId = parseInt(session.user.id)

  await prisma.$transaction([
    prisma.workshopMaterialConsumption.update({
      where: { id: consumo.id },
      data:  { deletedAt: new Date(), deletedBy: userId },
    }),
    // Estorna no estoque se era material comprado
    ...(consumo.source === "COMPRADO"
      ? [prisma.workshopMaterial.update({
          where: { id: consumo.materialId },
          data:  { quantity: { increment: Number(consumo.quantity) } },
        })]
      : []),
  ])

  logAction({
    companyId: session.user.companyId,
    userId,
    action:    "oficina.consumo.removido",
    entity:    "WorkshopMaterialConsumption",
    entityId:  consumo.id,
    before:    consumo,
  })

  return noContent()
})
