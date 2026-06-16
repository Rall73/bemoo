import { withAuthCtx, notFound, noContent, assertSameCompany, assertMinRole } from "@/lib/api"
import { prisma }   from "@/lib/prisma"
import { logAction, getIp } from "@/lib/audit"
import { hojeNoBrasil }     from "@/lib/date"

export const DELETE = withAuthCtx<{ id: string }>(async (req, session, { id }) => {
  const roleErr = assertMinRole(session.user.role, "GESTOR")
  if (roleErr) return roleErr

  const evento = await prisma.efetivoEvento.findFirst({
    where:  { id: parseInt(id), deletedAt: null },
    select: { id: true, companyId: true, tipo: true, colaboradorId: true },
  })
  if (!evento) return notFound("Evento não encontrado.")

  const tenantErr = assertSameCompany(session.user.companyId, evento.companyId)
  if (tenantErr) return tenantErr

  await prisma.efetivoEvento.update({
    where: { id: evento.id },
    data:  { deletedAt: hojeNoBrasil(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.evento.removido",
    entity:    "EfetivoEvento",
    entityId:  evento.id,
    before:    { tipo: evento.tipo, colaboradorId: evento.colaboradorId },
    ip:        getIp(req),
  })

  return noContent()
})
