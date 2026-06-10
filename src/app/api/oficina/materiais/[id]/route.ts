import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  name:        z.string().min(2).max(200).optional(),
  unit:        z.string().min(1).max(30).optional(),
  quantity:    z.number().min(0).optional(),
  minQuantity: z.number().min(0).optional(),
  unitCost:    z.number().min(0).nullable().optional(),
  active:      z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const material = await prisma.workshopMaterial.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!material) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, material.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.workshopMaterial.update({
    where: { id: material.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.material.editado",
    entity:    "WorkshopMaterial",
    entityId:  material.id,
    before:    material,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const material = await prisma.workshopMaterial.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!material) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, material.companyId)
  if (tenantError) return tenantError

  await prisma.workshopMaterial.update({
    where: { id: material.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.material.removido",
    entity:    "WorkshopMaterial",
    entityId:  material.id,
    before:    material,
  })

  return noContent()
})
