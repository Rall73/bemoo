import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  ok, noContent, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zUpdateItem = z.object({
  label:       z.string().min(2).max(500).optional(),
  description: z.string().max(1000).nullable().optional(),
})

// PATCH /api/checklists/[id]/items/[itemId] — editar item
export const PATCH = withAuthCtx<{ id: string; itemId: string }>(
  async (req, session, params) => {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError

    const checklistId = parseInt(params.id)
    const itemId      = parseInt(params.itemId)
    const { data, error } = await validateBody(req, zUpdateItem)
    if (error) return error

    const item = await prisma.checklistItem.findFirst({
      where:   { id: itemId, checklistId, deletedAt: null },
      include: { checklist: { select: { companyId: true } } },
    })
    if (!item) return notFound("Item não encontrado.")

    const tenantError = assertSameCompany(session.user.companyId, item.checklist.companyId)
    if (tenantError) return tenantError

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(data.label       !== undefined && { label:       data.label }),
        ...(data.description !== undefined && { description: data.description }),
      },
    })

    return ok(updated)
  }
)

// DELETE /api/checklists/[id]/items/[itemId] — soft delete item
export const DELETE = withAuthCtx<{ id: string; itemId: string }>(
  async (_req, session, params) => {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError

    const checklistId = parseInt(params.id)
    const itemId      = parseInt(params.itemId)

    const item = await prisma.checklistItem.findFirst({
      where:   { id: itemId, checklistId, deletedAt: null },
      include: { checklist: { select: { companyId: true } } },
    })
    if (!item) return notFound("Item não encontrado.")

    const tenantError = assertSameCompany(session.user.companyId, item.checklist.companyId)
    if (tenantError) return tenantError

    await prisma.checklistItem.update({
      where: { id: itemId },
      data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
    })

    return noContent()
  }
)
