import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, created, ok, notFound, badRequest, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"
import { WorkshopMaterialSource } from "@prisma/client"

const zCreate = z.object({
  materialId: z.number().int().positive(),
  quantity:   z.number().positive(),
  source:     z.nativeEnum(WorkshopMaterialSource),
  note:       z.string().max(500).optional(),
})

export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  const consumos = await prisma.workshopMaterialConsumption.findMany({
    where:   { orderId: pedido.id, deletedAt: null },
    include: {
      material: { select: { name: true, unit: true, unitCost: true } },
      creator:  { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return ok(consumos)
})

export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const [pedido, material] = await Promise.all([
    prisma.workshopServiceOrder.findFirst({
      where: { id: parseInt(params.id), deletedAt: null },
    }),
    prisma.workshopMaterial.findFirst({
      where: { id: data.materialId, deletedAt: null },
    }),
  ])
  if (!pedido)   return notFound("Pedido não encontrado.")
  if (!material) return notFound("Material não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError
  const tenantMat = assertSameCompany(session.user.companyId, material.companyId)
  if (tenantMat) return tenantMat

  if (pedido.status === "CONCLUIDO" || pedido.status === "CANCELADO") {
    return badRequest("Não é possível apontar consumo em pedido concluído ou cancelado.")
  }

  const novoEstoque = Number(material.quantity) - data.quantity
  const userId = parseInt(session.user.id)

  const [consumo] = await prisma.$transaction([
    prisma.workshopMaterialConsumption.create({
      data: {
        orderId:    pedido.id,
        materialId: data.materialId,
        quantity:   data.quantity,
        source:     data.source,
        note:       data.note ?? null,
        createdBy:  userId,
      },
    }),
    // Baixa no estoque apenas para material comprado
    ...(data.source === "COMPRADO"
      ? [prisma.workshopMaterial.update({
          where: { id: material.id },
          data:  { quantity: Math.max(0, novoEstoque) },
        })]
      : []),
  ])

  logAction({
    companyId: session.user.companyId,
    userId,
    action:    "oficina.consumo.registrado",
    entity:    "WorkshopMaterialConsumption",
    entityId:  consumo.id,
    after:     { materialId: data.materialId, quantity: data.quantity, source: data.source },
  })

  // Alerta de estoque mínimo
  if (data.source === "COMPRADO" && novoEstoque <= Number(material.minQuantity)) {
    console.warn(
      `[Oficina] Estoque baixo: ${material.name} (${novoEstoque} ${material.unit}) abaixo do mínimo (${material.minQuantity})`
    )
    // TODO: enviar e-mail de alerta via sendMail quando o destinatário for configurável
  }

  return created(consumo)
})
