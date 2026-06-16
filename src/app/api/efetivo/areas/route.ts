import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  nome:      z.string().min(1).max(200),
  areaPaiId: z.number().int().positive().optional().nullable(),
})

export const GET = withAuth(async (_req, session) => {
  const areas = await prisma.efetivoArea.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { nome: "asc" },
    include: { areaPai: { select: { id: true, nome: true } } },
  })
  return ok(areas)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const area = await prisma.efetivoArea.create({
    data: {
      companyId: session.user.companyId,
      nome:      data.nome,
      areaPaiId: data.areaPaiId ?? null,
    },
    include: { areaPai: { select: { id: true, nome: true } } },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.area.criada",
    entity:    "EfetivoArea",
    entityId:  area.id,
    after:     area,
  })

  return created(area)
})
