import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  name:   z.string().min(2).max(200).optional(),
  active: z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const area = await prisma.workshopArea.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!area) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, area.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.workshopArea.update({
    where: { id: area.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.area.editada",
    entity:    "WorkshopArea",
    entityId:  area.id,
    before:    area,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const area = await prisma.workshopArea.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!area) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, area.companyId)
  if (tenantError) return tenantError

  await prisma.workshopArea.update({
    where: { id: area.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.area.removida",
    entity:    "WorkshopArea",
    entityId:  area.id,
    before:    area,
  })

  return noContent()
})
