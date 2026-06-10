import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  name:     z.string().min(2).max(200),
  category: z.string().max(100).optional(),
})

export const GET = withAuth(async (_req, session) => {
  const produtos = await prisma.workshopProduct.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
  return ok(produtos)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const produto = await prisma.workshopProduct.create({
    data: {
      companyId: session.user.companyId,
      name:      data.name,
      category:  data.category ?? null,
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.produto.criado",
    entity:    "WorkshopProduct",
    entityId:  produto.id,
    after:     produto,
  })

  return created(produto)
})
