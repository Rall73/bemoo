import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, noContent, badRequest, unauthorized, forbidden, notFound } from "@/lib/api"
import { zNome, zEmail } from "@/lib/validators"

type Ctx = { params: Promise<{ id: string }> }

async function getAdmin() {
  const session = await auth() as any
  if (!session?.user?.platformAdmin) return null
  return session as { user: { id: string; platformAdmin: boolean } }
}

const zUpdateSchema = z.object({
  name:    zNome.optional(),
  email:   zEmail.optional(),
  plan:    z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional(),
  action:  z.enum(["suspend", "reactivate"]).optional(),
})

/**
 * PATCH /api/plataforma/empresas/[id]
 * Atualiza nome, e-mail, plano ou status de suspensão de uma empresa.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const { id } = await params
  const companyId = parseInt(id)
  if (isNaN(companyId)) return badRequest("ID inválido.")

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true },
  })
  if (!company) return notFound("Empresa não encontrada.")

  const body = await req.json().catch(() => null)
  const result = zUpdateSchema.safeParse(body)
  if (!result.success) return badRequest("Dados inválidos.")

  const { name, email, plan, action } = result.data
  const updateData: Record<string, unknown> = {}

  if (name)  updateData.name  = name
  if (email) updateData.email = email
  if (plan)  updateData.plan  = plan

  if (action === "suspend")    updateData.suspendedAt = new Date()
  if (action === "reactivate") updateData.suspendedAt = null

  await prisma.company.update({ where: { id: companyId }, data: updateData })

  return ok({ updated: true })
}

/**
 * DELETE /api/plataforma/empresas/[id]
 * Soft delete de uma empresa (raramente usado — prefira suspender).
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()
  if (!admin.user.platformAdmin) return forbidden()

  const { id } = await params
  const companyId = parseInt(id)
  if (isNaN(companyId)) return badRequest("ID inválido.")

  await prisma.company.update({
    where: { id: companyId },
    data:  { deletedAt: new Date() },
  })

  return noContent()
}
