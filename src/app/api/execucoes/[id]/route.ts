import { prisma } from "@/lib/prisma"
import { withAuthCtx, ok, notFound, assertSameCompany } from "@/lib/api"

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
    },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  return ok(execution)
})
