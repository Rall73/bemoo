import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, badRequest, unauthorized, notFound } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

type Ctx = { params: Promise<{ id: string }> }

async function getAdmin() {
  const session = await auth() as any
  if (!session?.user?.platformAdmin) return null
  return session
}

const zToggleSchema = z.object({
  module:  z.string().min(1),
  enabled: z.boolean(),
})

/**
 * GET /api/plataforma/empresas/[id]/modulos
 * Retorna os módulos habilitados para a empresa.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const admin = await getAdmin()
  if (!admin) return unauthorized()

  const { id } = await params
  const companyId = parseInt(id)
  if (isNaN(companyId)) return badRequest("ID inválido.")

  const company = await prisma.company.findFirst({
    where: { id: companyId, deletedAt: null },
    select: { id: true, name: true },
  })
  if (!company) return notFound("Empresa não encontrada.")

  const modules = await prisma.companyModule.findMany({
    where:  { companyId },
    select: { module: true },
  })

  return ok({
    companyName:    company.name,
    enabledModules: modules.map((m) => m.module),
  })
}

/**
 * PATCH /api/plataforma/empresas/[id]/modulos
 * Habilita ou desabilita um módulo para uma empresa.
 * Body: { module: string, enabled: boolean }
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
  const result = zToggleSchema.safeParse(body)
  if (!result.success) return badRequest("Dados inválidos.")

  const { module, enabled } = result.data

  if (enabled) {
    await prisma.companyModule.upsert({
      where:  { companyId_module: { companyId, module } },
      update: {},
      create: { companyId, module },
    })
  } else {
    await prisma.companyModule.deleteMany({ where: { companyId, module } })
  }

  await logAction({
    companyId: companyId,
    userId:    parseInt(admin.user.id),
    action:    enabled ? "modulo.habilitado" : "modulo.desabilitado",
    entity:    "module",
    after:     { module, enabled },
    ip:        getIp(req),
  })

  return ok({ module, enabled })
}
