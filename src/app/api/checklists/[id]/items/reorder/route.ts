import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  ok, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zReorder = z.object({
  // array de ids na nova ordem
  itemIds: z.array(z.number().int()).min(1),
})

// PATCH /api/checklists/[id]/items/reorder
export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const checklistId = parseInt(params.id)
  const { data, error } = await validateBody(req, zReorder)
  if (error) return error

  const checklist = await prisma.checklist.findFirst({
    where: { id: checklistId, deletedAt: null },
  })
  if (!checklist) return notFound("Checklist não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, checklist.companyId)
  if (tenantError) return tenantError

  // atualiza a ordem de cada item em paralelo
  await Promise.all(
    data.itemIds.map((itemId, index) =>
      prisma.checklistItem.updateMany({
        where: { id: itemId, checklistId, deletedAt: null },
        data:  { order: index + 1 },
      })
    )
  )

  return ok({ reordered: data.itemIds.length })
})
