import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  created, ok, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zField = z.object({
  label:        z.string().min(1, "Rótulo obrigatório").max(500),
  type:         z.enum(["OK_NOK", "SIM_NAO", "NUMERIC", "TEXT"]).default("OK_NOK"),
  unit:         z.string().max(20).optional().nullable(),
  required:     z.boolean().default(true),
  requirePhoto: z.boolean().default(false),
})

// GET /api/checklists/[id]/items/[itemId]/fields — lista campos do item
export const GET = withAuthCtx<{ id: string; itemId: string }>(
  async (_req, session, params) => {
    const checklistId = parseInt(params.id)
    const itemId      = parseInt(params.itemId)

    const item = await prisma.checklistItem.findFirst({
      where:   { id: itemId, checklistId, deletedAt: null },
      include: { checklist: { select: { companyId: true } } },
    })
    if (!item) return notFound("Item não encontrado.")

    const tenantError = assertSameCompany(session.user.companyId, item.checklist.companyId)
    if (tenantError) return tenantError

    const fields = await prisma.checklistItemField.findMany({
      where:   { itemId, deletedAt: null },
      orderBy: { order: "asc" },
    })

    return ok(fields)
  }
)

// POST /api/checklists/[id]/items/[itemId]/fields — adiciona campo (ADMIN/GESTOR)
export const POST = withAuthCtx<{ id: string; itemId: string }>(
  async (req, session, params) => {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError

    const checklistId = parseInt(params.id)
    const itemId      = parseInt(params.itemId)
    const { data, error } = await validateBody(req, zField)
    if (error) return error

    const item = await prisma.checklistItem.findFirst({
      where:   { id: itemId, checklistId, deletedAt: null },
      include: { checklist: { select: { companyId: true } } },
    })
    if (!item) return notFound("Item não encontrado.")

    const tenantError = assertSameCompany(session.user.companyId, item.checklist.companyId)
    if (tenantError) return tenantError

    const last = await prisma.checklistItemField.findFirst({
      where:   { itemId, deletedAt: null },
      orderBy: { order: "desc" },
    })

    const field = await prisma.checklistItemField.create({
      data: {
        itemId,
        label:        data.label,
        type:         data.type,
        unit:         data.unit ?? null,
        required:     data.required,
        requirePhoto: data.requirePhoto,
        order:        (last?.order ?? 0) + 1,
      },
    })

    return created(field)
  }
)
