import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, conflict, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  codigo:         z.string().min(1).max(10).toUpperCase().optional(),
  horaInicio:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horaFim:        z.string().regex(/^\d{2}:\d{2}$/).optional(),
  cruzaMeiaNoite: z.boolean().optional(),
  ativo:          z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const turno = await prisma.efetivoTurno.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!turno) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, turno.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.efetivoTurno.update({
    where: { id: turno.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.turno.editado",
    entity:    "EfetivoTurno",
    entityId:  turno.id,
    before:    turno,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const turno = await prisma.efetivoTurno.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!turno) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, turno.companyId)
  if (tenantError) return tenantError

  const emUso = await prisma.efetivoColaborador.count({
    where: { turnoId: turno.id, deletedAt: null },
  })
  if (emUso > 0) return conflict(`Turno em uso por ${emUso} colaborador(es).`)

  await prisma.efetivoTurno.update({
    where: { id: turno.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.turno.removido",
    entity:    "EfetivoTurno",
    entityId:  turno.id,
    before:    turno,
  })

  return noContent()
})
