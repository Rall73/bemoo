import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, forbidden } from "@/lib/api"

const zCreate = z.object({
  checklistId: z.number().int().positive(),
})

// POST /api/execucoes — inicia uma execução
export const POST = withAuth(async (req, session) => {
  // AUDITOR não pode executar
  if (session.user.role === "AUDITOR") return forbidden("Auditores não podem executar checklists.")

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  // verifica que o checklist pertence à empresa e está ativo
  const checklist = await prisma.checklist.findFirst({
    where: {
      id:        data.checklistId,
      companyId: session.user.companyId,
      active:    true,
      deletedAt: null,
    },
  })
  if (!checklist) return forbidden("Checklist não disponível.")

  const execution = await prisma.checklistExecution.create({
    data: {
      checklistId: data.checklistId,
      companyId:   session.user.companyId,
      executedBy:  parseInt(session.user.id),
      status:      "IN_PROGRESS",
    },
  })

  return created({ id: execution.id })
})
