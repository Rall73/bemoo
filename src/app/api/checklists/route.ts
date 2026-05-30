import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"

const zCreate = z.object({
  name:        z.string().min(2, "Mínimo 2 caracteres").max(200),
  description: z.string().max(1000).optional(),
})

// GET /api/checklists — lista os checklists da empresa
export const GET = withAuth(async (_req, session) => {
  const companyId = session.user.companyId

  const checklists = await prisma.checklist.findMany({
    where:   { companyId, deletedAt: null },
    include: {
      _count: { select: { items: { where: { deletedAt: null } } } },
      creator: { select: { name: true } },
      items: {
        where:   { deletedAt: null },
        select:  { _count: { select: { fields: { where: { deletedAt: null } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return ok(checklists)
})

// POST /api/checklists — cria um checklist (ADMIN/GESTOR)
export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const checklist = await prisma.checklist.create({
    data: {
      companyId:   session.user.companyId,
      name:        data.name,
      description: data.description ?? null,
      createdBy:   parseInt(session.user.id),
    },
  })

  return created(checklist)
})
