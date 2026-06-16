import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  nome: z.string().min(1).max(200),
})

export const GET = withAuth(async (_req, session) => {
  const cargos = await prisma.efetivoCargo.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { nome: "asc" },
  })
  return ok(cargos)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const cargo = await prisma.efetivoCargo.create({
    data: { companyId: session.user.companyId, nome: data.nome },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.cargo.criado",
    entity:    "EfetivoCargo",
    entityId:  cargo.id,
    after:     cargo,
  })

  return created(cargo)
})
