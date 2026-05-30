import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, noContent, badRequest, unauthorized, forbidden, notFound, validateBody } from "@/lib/api"

type Ctx = { params: Promise<{ id: string }> }

async function getAdmin() {
  const session = await auth() as any
  if (!session?.user?.platformAdmin) return null
  return session as { user: { id: string; platformAdmin: boolean } }
}

// PATCH /api/plataforma/templates/[id]
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const { id: idStr } = await params
  const id = parseInt(idStr)

  const { data, error } = await validateBody(req, z.object({
    name:           z.string().min(1).max(200).optional(),
    description:    z.string().max(1000).nullable().optional(),
    templateSource: z.string().max(200).nullable().optional(),
    active:         z.boolean().optional(),
  }))
  if (error) return error

  const template = await prisma.checklist.findFirst({
    where: { id, isTemplate: true, deletedAt: null },
  })
  if (!template) return notFound("Template não encontrado.")

  const updated = await prisma.checklist.update({
    where: { id },
    data: {
      ...(data.name           !== undefined && { name:           data.name }),
      ...(data.description    !== undefined && { description:    data.description }),
      ...(data.templateSource !== undefined && { templateSource: data.templateSource }),
      ...(data.active         !== undefined && { active:         data.active }),
    },
  })

  return ok({ id: updated.id, name: updated.name, active: updated.active })
}

// DELETE /api/plataforma/templates/[id]
export async function DELETE(req: Request, { params }: Ctx) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const { id: idStr } = await params
  const id = parseInt(idStr)

  const template = await prisma.checklist.findFirst({
    where: { id, isTemplate: true, deletedAt: null },
  })
  if (!template) return notFound("Template não encontrado.")

  await prisma.checklist.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: parseInt(admin.user.id),
    },
  })

  return noContent()
}
