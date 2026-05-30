import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, created, unauthorized, validateBody } from "@/lib/api"

async function getAdmin() {
  const session = await auth() as any
  if (!session?.user?.platformAdmin) return null
  return session as { user: { id: string; platformAdmin: boolean } }
}

// GET /api/plataforma/templates — lista todos os templates (incluindo inativos)
export async function GET(_req: Request) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const templates = await prisma.checklist.findMany({
    where:   { isTemplate: true, deletedAt: null },
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: "desc" },
  })

  return ok(
    templates.map((t) => ({
      id:             t.id,
      name:           t.name,
      description:    t.description,
      templateSource: t.templateSource,
      active:         t.active,
      itemCount:      t._count.items,
      createdAt:      t.createdAt.toISOString(),
    }))
  )
}

// POST /api/plataforma/templates — cria novo template vazio
export async function POST(req: Request) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const { data, error } = await validateBody(req, z.object({
    name:           z.string().min(1).max(200),
    description:    z.string().max(1000).optional().nullable(),
    templateSource: z.string().max(200).optional().nullable(),
  }))
  if (error) return error

  const template = await prisma.checklist.create({
    data: {
      companyId:      null,
      name:           data.name,
      description:    data.description ?? null,
      templateSource: data.templateSource ?? null,
      isTemplate:     true,
      active:         true,
      createdBy:      parseInt(admin.user.id),
    },
  })

  return created({ id: template.id, name: template.name })
}
