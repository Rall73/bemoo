import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  created, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zAddItem = z.object({
  label:       z.string().min(2, "Mínimo 2 caracteres").max(500),
  description: z.string().max(1000).optional(),
  type:        z.enum(["BOOLEAN", "TEXT", "NUMBER", "TEMPERATURE"]).default("BOOLEAN"),
  required:    z.boolean().default(true),
})

// POST /api/checklists/[id]/items — adiciona item ao checklist (ADMIN/GESTOR)
export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const checklistId = parseInt(params.id)
  const { data, error } = await validateBody(req, zAddItem)
  if (error) return error

  const checklist = await prisma.checklist.findFirst({
    where: { id: checklistId, deletedAt: null },
  })
  if (!checklist) return notFound("Checklist não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, checklist.companyId)
  if (tenantError) return tenantError

  // posição: último item + 1
  const lastItem = await prisma.checklistItem.findFirst({
    where:   { checklistId, deletedAt: null },
    orderBy: { order: "desc" },
  })
  const order = (lastItem?.order ?? 0) + 1

  const item = await prisma.checklistItem.create({
    data: {
      checklistId,
      label:       data.label,
      description: data.description ?? null,
      type:        data.type,
      required:    data.required,
      order,
    },
  })

  return created(item)
})
