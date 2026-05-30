import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  ok, noContent, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zUpdate = z.object({
  label:           z.string().min(1).max(500).optional(),
  type:            z.enum(["OK_NOK", "SIM_NAO", "NUMERIC", "TEXT"]).optional(),
  unit:            z.string().max(20).nullable().optional(),
  required:        z.boolean().optional(),
  requirePhoto:    z.boolean().optional(),
  reference:       z.string().max(100).nullable().optional(),
  referenceSource: z.string().max(200).nullable().optional(),
  allowNa:         z.boolean().optional(),
  order:           z.number().int().optional(),
})

async function resolveField(
  checklistId: number,
  itemId: number,
  fieldId: number,
  companyId: number,
) {
  const field = await prisma.checklistItemField.findFirst({
    where: { id: fieldId, itemId, deletedAt: null },
    include: {
      item: {
        include: { checklist: { select: { id: true, companyId: true } } },
      },
    },
  })
  if (!field) return { field: null, tenantError: null }
  if (field.item.checklist.id !== checklistId) return { field: null, tenantError: null }

  const tenantError = assertSameCompany(companyId, field.item.checklist.companyId)
  return { field, tenantError }
}

// PATCH /api/checklists/[id]/items/[itemId]/fields/[fieldId]
export const PATCH = withAuthCtx<{ id: string; itemId: string; fieldId: string }>(
  async (req, session, params) => {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError

    const { data, error } = await validateBody(req, zUpdate)
    if (error) return error

    const { field, tenantError } = await resolveField(
      parseInt(params.id), parseInt(params.itemId), parseInt(params.fieldId),
      session.user.companyId,
    )
    if (!field) return notFound("Campo não encontrado.")
    if (tenantError) return tenantError

    const updated = await prisma.checklistItemField.update({
      where: { id: field.id },
      data: {
        ...(data.label           !== undefined && { label:           data.label }),
        ...(data.type            !== undefined && { type:            data.type }),
        ...(data.unit            !== undefined && { unit:            data.unit }),
        ...(data.required        !== undefined && { required:        data.required }),
        ...(data.requirePhoto    !== undefined && { requirePhoto:    data.requirePhoto }),
        ...(data.reference       !== undefined && { reference:       data.reference }),
        ...(data.referenceSource !== undefined && { referenceSource: data.referenceSource }),
        ...(data.allowNa         !== undefined && { allowNa:         data.allowNa }),
        ...(data.order           !== undefined && { order:           data.order }),
      },
    })

    return ok(updated)
  }
)

// DELETE /api/checklists/[id]/items/[itemId]/fields/[fieldId]
export const DELETE = withAuthCtx<{ id: string; itemId: string; fieldId: string }>(
  async (_req, session, params) => {
    const roleError = assertMinRole(session.user.role, "GESTOR")
    if (roleError) return roleError

    const { field, tenantError } = await resolveField(
      parseInt(params.id), parseInt(params.itemId), parseInt(params.fieldId),
      session.user.companyId,
    )
    if (!field) return notFound("Campo não encontrado.")
    if (tenantError) return tenantError

    await prisma.checklistItemField.update({
      where: { id: field.id },
      data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
    })

    return noContent()
  }
)
