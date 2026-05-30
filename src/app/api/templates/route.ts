import { prisma } from "@/lib/prisma"
import { withAuth, ok } from "@/lib/api"

// GET /api/templates — lista templates disponíveis para importação
export const GET = withAuth(async (_req, _session) => {
  const templates = await prisma.checklist.findMany({
    where:   { isTemplate: true, active: true, deletedAt: null },
    include: {
      _count: {
        select: {
          items: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return ok(
    templates.map((t) => ({
      id:             t.id,
      name:           t.name,
      description:    t.description,
      templateSource: t.templateSource,
      itemCount:      t._count.items,
    }))
  )
})
