import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, conflict, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  nome:      z.string().min(1).max(200).optional(),
  areaPaiId: z.number().int().positive().nullable().optional(),
  ativo:     z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const area = await prisma.efetivoArea.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!area) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, area.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.efetivoArea.update({
    where:   { id: area.id },
    data,
    include: { areaPai: { select: { id: true, nome: true } } },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.area.editada",
    entity:    "EfetivoArea",
    entityId:  area.id,
    before:    area,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const area = await prisma.efetivoArea.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!area) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, area.companyId)
  if (tenantError) return tenantError

  const emUso = await prisma.efetivoColaborador.count({
    where: { areaId: area.id, deletedAt: null },
  })
  if (emUso > 0) return conflict(`Área em uso por ${emUso} colaborador(es).`)

  await prisma.efetivoArea.update({
    where: { id: area.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.area.removida",
    entity:    "EfetivoArea",
    entityId:  area.id,
    before:    area,
  })

  return noContent()
})
