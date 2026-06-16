import { prisma } from "@/lib/prisma"
import { withAuthCtx, noContent, notFound, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

export const DELETE = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const ocorrencia = await prisma.efetivoOcorrencia.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!ocorrencia) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, ocorrencia.companyId)
  if (tenantError) return tenantError

  await prisma.efetivoOcorrencia.update({
    where: { id: ocorrencia.id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.ocorrencia.removida",
    entity:    "EfetivoOcorrencia",
    entityId:  ocorrencia.id,
    before:    ocorrencia,
  })

  return noContent()
})
