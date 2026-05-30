import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  withAuthCtx, validateBody,
  ok, noContent, notFound, assertSameCompany, assertMinRole,
} from "@/lib/api"

const zUpdate = z.object({
  name:        z.string().min(2).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  active:      z.boolean().optional(),
})

// GET /api/checklists/[id] — detalhe com itens
export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const id = parseInt(params.id)

  const checklist = await prisma.checklist.findFirst({
    where:   { id, deletedAt: null },
    include: {
      items: {
        where:   { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          fields: {
            where:   { deletedAt: null },
            orderBy: { order: "asc" },
          },
        },
      },
      creator: { select: { name: true } },
    },
  })

  if (!checklist) return notFound("Checklist não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, checklist.companyId)
  if (tenantError) return tenantError

  return ok(checklist)
})

// PATCH /api/checklists/[id] — editar nome/descrição/ativo (ADMIN/GESTOR)
export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const id = parseInt(params.id)
  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const checklist = await prisma.checklist.findFirst({
    where: { id, deletedAt: null },
  })
  if (!checklist) return notFound("Checklist não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, checklist.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.checklist.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.active      !== undefined && { active:      data.active }),
    },
  })

  return ok(updated)
})

// DELETE /api/checklists/[id] — soft delete (ADMIN/GESTOR)
export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const id = parseInt(params.id)

  const checklist = await prisma.checklist.findFirst({
    where: { id, deletedAt: null },
  })
  if (!checklist) return notFound("Checklist não encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, checklist.companyId)
  if (tenantError) return tenantError

  await prisma.checklist.update({
    where: { id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  return noContent()
})
