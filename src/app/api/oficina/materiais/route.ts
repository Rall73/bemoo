import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  name:        z.string().min(2).max(200),
  unit:        z.string().min(1).max(30),
  quantity:    z.number().min(0).default(0),
  minQuantity: z.number().min(0).default(0),
  unitCost:    z.number().min(0).nullable().optional(),
})

export const GET = withAuth(async (_req, session) => {
  const materiais = await prisma.workshopMaterial.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { name: "asc" },
  })
  return ok(materiais)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const material = await prisma.workshopMaterial.create({
    data: {
      companyId:   session.user.companyId,
      name:        data.name,
      unit:        data.unit,
      quantity:    data.quantity,
      minQuantity: data.minQuantity,
      unitCost:    data.unitCost ?? null,
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.material.criado",
    entity:    "WorkshopMaterial",
    entityId:  material.id,
    after:     material,
  })

  return created(material)
})
