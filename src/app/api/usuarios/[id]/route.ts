import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, noContent, badRequest, forbidden, notFound } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

type P = { id: string }

/**
 * PATCH /api/usuarios/[id]
 * Altera o papel (role) de um membro da empresa (ADMIN only).
 * Body: { role: "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR" }
 */
export const PATCH = withAuthCtx<P>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem alterar papéis.")
  }

  const userId = parseInt(params.id)
  if (isNaN(userId)) return badRequest("ID inválido.")

  const { data, error } = await validateBody(req, z.object({
    role: z.enum(["ADMIN", "GESTOR", "EXECUTOR", "AUDITOR"]),
  }))
  if (error) return error

  // Garantir que pertence à mesma empresa
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId, deletedAt: null },
    select: { id: true, role: true, name: true },
  })
  if (!user) return notFound("Usuário não encontrado.")

  // Não pode rebaixar o próprio papel
  if (userId === parseInt(session.user.id) && data.role !== user.role) {
    return badRequest("Você não pode alterar o seu próprio papel.")
  }

  await prisma.user.update({ where: { id: userId }, data: { role: data.role } })

  await logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "usuario.role_alterado",
    entity:    "user",
    entityId:  userId,
    before:    { role: user.role },
    after:     { role: data.role },
    ip:        getIp(req),
  })

  return ok({ message: "Papel atualizado." })
})

/**
 * DELETE /api/usuarios/[id]
 * Desativa (soft delete) um membro da empresa (ADMIN only).
 * Regras: não pode desativar a si mesmo; deve restar ao menos 1 ADMIN ativo.
 */
export const DELETE = withAuthCtx<P>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem desativar usuários.")
  }

  const userId = parseInt(params.id)
  if (isNaN(userId)) return badRequest("ID inválido.")

  if (userId === parseInt(session.user.id)) {
    return badRequest("Você não pode desativar sua própria conta.")
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId, deletedAt: null },
    select: { id: true, role: true, name: true, email: true },
  })
  if (!user) return notFound("Usuário não encontrado.")

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { companyId: session.user.companyId, role: "ADMIN", deletedAt: null },
    })
    if (adminCount <= 1) {
      return badRequest("A empresa deve ter pelo menos um administrador ativo.")
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  await logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "usuario.desativado",
    entity:    "user",
    entityId:  userId,
    before:    { name: user.name, email: user.email, role: user.role },
    ip:        getIp(req),
  })

  return noContent()
})
