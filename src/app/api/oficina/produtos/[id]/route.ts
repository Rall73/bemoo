import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  name:     z.string().min(2).max(200).optional(),
  category: z.string().max(100).nullable().optional(),
  active:   z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const produto = await prisma.workshopProduct.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!produto) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, produto.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.workshopProduct.update({
    where: { id: produto.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.produto.editado",
    entity:    "WorkshopProduct",
    entityId:  produto.id,
    before:    produto,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const produto = await prisma.workshopProduct.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!produto) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, produto.companyId)
  if (tenantError) return tenantError

  await prisma.workshopProduct.update({
    where: { id: produto.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.produto.removido",
    entity:    "WorkshopProduct",
    entityId:  produto.id,
    before:    produto,
  })

  return noContent()
})
