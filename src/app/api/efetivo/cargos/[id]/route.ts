import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, notFound, conflict, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zUpdate = z.object({
  nome:  z.string().min(1).max(200).optional(),
  ativo: z.boolean().optional(),
})

export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const cargo = await prisma.efetivoCargo.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!cargo) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, cargo.companyId)
  if (tenantError) return tenantError

  const updated = await prisma.efetivoCargo.update({
    where: { id: cargo.id },
    data,
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.cargo.editado",
    entity:    "EfetivoCargo",
    entityId:  cargo.id,
    before:    cargo,
    after:     updated,
  })

  return ok(updated)
})

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const cargo = await prisma.efetivoCargo.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!cargo) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, cargo.companyId)
  if (tenantError) return tenantError

  const emUso = await prisma.efetivoColaborador.count({
    where: { cargoId: cargo.id, deletedAt: null },
  })
  if (emUso > 0) return conflict(`Cargo em uso por ${emUso} colaborador(es).`)

  await prisma.efetivoCargo.update({
    where: { id: cargo.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.cargo.removido",
    entity:    "EfetivoCargo",
    entityId:  cargo.id,
    before:    cargo,
  })

  return noContent()
})
