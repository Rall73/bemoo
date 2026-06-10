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

  const motivo = await prisma.workshopPauseReason.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!motivo) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, motivo.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.workshopPauseReason.update({
    where: { id: motivo.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.pausa_motivo.editado",
    entity:    "WorkshopPauseReason",
    entityId:  motivo.id,
    before:    motivo,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const motivo = await prisma.workshopPauseReason.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!motivo) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, motivo.companyId)
  if (tenantError) return tenantError

  await prisma.workshopPauseReason.update({
    where: { id: motivo.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.pausa_motivo.removido",
    entity:    "WorkshopPauseReason",
    entityId:  motivo.id,
    before:    motivo,
  })

  return noContent()
})
