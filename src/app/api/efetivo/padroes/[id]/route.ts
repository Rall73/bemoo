import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, conflict, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  nome:         z.string().min(1).max(100).optional(),
  modo:         z.enum(["FIXO_SEMANAL", "ROTATIVO"]).optional(),
  diasSemana:   z.string().max(50).nullable().optional(),
  diasTrabalho: z.number().int().positive().nullable().optional(),
  diasFolga:    z.number().int().positive().nullable().optional(),
  ativo:        z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const padrao = await prisma.efetivoPadraoEscala.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!padrao) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, padrao.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.efetivoPadraoEscala.update({
    where: { id: padrao.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.padrao.editado",
    entity:    "EfetivoPadraoEscala",
    entityId:  padrao.id,
    before:    padrao,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const padrao = await prisma.efetivoPadraoEscala.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!padrao) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, padrao.companyId)
  if (tenantError) return tenantError

  const emUso = await prisma.efetivoColaborador.count({
    where: { padraoEscalaId: padrao.id, deletedAt: null },
  })
  if (emUso > 0) return conflict(`Padrão em uso por ${emUso} colaborador(es).`)

  await prisma.efetivoPadraoEscala.update({
    where: { id: padrao.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.padrao.removido",
    entity:    "EfetivoPadraoEscala",
    entityId:  padrao.id,
    before:    padrao,
  })

  return noContent()
})
