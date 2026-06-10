import { prisma } from "@/lib/prisma"
import { withAuthCtx, ok, notFound, badRequest, forbidden, assertSameCompany } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

// GET /api/execucoes/[id] — dados completos da execução
export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const id = parseInt(params.id)

  const execution = await prisma.checklistExecution.findFirst({
    where: { id, deletedAt: null },
    include: {
      checklist: {
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
        },
      },
      executor:    { select: { name: true } },
      fieldValues: true,
      itemNotes:   true,
    },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  return ok(execution)
})

// DELETE /api/execucoes/[id] — exclui execução em andamento (soft delete)
export const DELETE = withAuthCtx<{ id: string }>(async (req, session, params) => {
  if (session.user.role === "AUDITOR") return forbidden("Auditores não podem excluir execuções.")

  const id = parseInt(params.id)

  const execution = await prisma.checklistExecution.findFirst({
    where: { id, deletedAt: null },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  if (execution.status !== "IN_PROGRESS") {
    return badRequest("Apenas execuções em andamento podem ser excluídas.")
  }

  await prisma.checklistExecution.update({
    where: { id },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "checklist.excluido",
    entity:    "checklist_executions",
    entityId:  id,
    ip:        getIp(req),
  })

  return ok({ id })
})
