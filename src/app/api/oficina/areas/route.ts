import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  name: z.string().min(2).max(200),
})

export const GET = withAuth(async (_req, session) => {
  const areas = await prisma.workshopArea.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { name: "asc" },
  })
  return ok(areas)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "ADMIN")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const area = await prisma.workshopArea.create({
    data: { companyId: session.user.companyId, name: data.name },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.area.criada",
    entity:    "WorkshopArea",
    entityId:  area.id,
    after:     area,
  })

  return created(area)
})
