import { prisma } from "@/lib/prisma"
import { withAuth, ok } from "@/lib/api"

export const GET = withAuth(async (_req, session) => {
  const tipos = await prisma.efetivoTipoOcorrencia.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { nome: "asc" },
    select:  { id: true, nome: true },
  })
  return ok(tipos)
})
