import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, notFound, forbidden, assertSameCompany } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

// GET /api/usuarios/[id]/modulos — lista acesso a modulos do usuario
export const GET = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  if (session.user.role !== "ADMIN") return forbidden("Apenas admins podem gerenciar modulos.")

  const targetId = parseInt(params.id)
  const target   = await prisma.user.findFirst({
    where: { id: targetId, deletedAt: null },
  })
  if (!target) return notFound("Usuario nao encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, target.companyId)
  if (tenantError) return tenantError

  const access = await prisma.userModuleAccess.findMany({
    where:  { userId: targetId, companyId: session.user.companyId },
    select: { moduleKey: true },
  })

  return ok({ moduleKeys: access.map((a) => a.moduleKey) })
})

const zPut = z.object({
  moduleKeys: z.array(z.string().min(1).max(50)),
})

// PUT /api/usuarios/[id]/modulos — define conjunto de modulos do usuario
export const PUT = withAuthCtx<{ id: string }>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") return forbidden("Apenas admins podem gerenciar modulos.")

  const targetId = parseInt(params.id)
  const { data, error } = await validateBody(req, zPut)
  if (error) return error

  const [target, companyMods] = await Promise.all([
    prisma.user.findFirst({ where: { id: targetId, deletedAt: null } }),
    prisma.companyModule.findMany({
      where:  { companyId: session.user.companyId },
      select: { module: true },
    }),
  ])

  if (!target) return notFound("Usuario nao encontrado.")

  const tenantError = assertSameCompany(session.user.companyId, target.companyId)
  if (tenantError) return tenantError

  // Garante que so modulos habilitados para a empresa podem ser concedidos
  const companyKeys = new Set(companyMods.map((m) => m.module))
  const validKeys   = data.moduleKeys.filter((k) => companyKeys.has(k))

  const companyId  = session.user.companyId
  const grantorId  = parseInt(session.user.id)

  // Calcula diff para auditoria
  const existing  = await prisma.userModuleAccess.findMany({
    where:  { userId: targetId, companyId },
    select: { moduleKey: true },
  })
  const existingKeys  = new Set(existing.map((a) => a.moduleKey))
  const newKeys       = new Set(validKeys)
  const granted       = validKeys.filter((k) => !existingKeys.has(k))
  const revoked       = [...existingKeys].filter((k) => !newKeys.has(k))

  // Substitui o conjunto todo em transacao
  await prisma.$transaction([
    prisma.userModuleAccess.deleteMany({ where: { userId: targetId, companyId } }),
    ...validKeys.map((moduleKey) =>
      prisma.userModuleAccess.create({
        data: { userId: targetId, companyId, moduleKey, grantedBy: grantorId },
      })
    ),
  ])

  // Auditoria
  const ip = getIp(req)
  for (const k of granted) {
    logAction({ companyId, userId: grantorId, action: "modulo.acesso_concedido", entity: "user_module_access", entityId: targetId, ip,
      after: { moduleKey: k, targetUserId: targetId } })
  }
  for (const k of revoked) {
    logAction({ companyId, userId: grantorId, action: "modulo.acesso_revogado", entity: "user_module_access", entityId: targetId, ip,
      after: { moduleKey: k, targetUserId: targetId } })
  }

  return ok({ moduleKeys: validKeys })
})
