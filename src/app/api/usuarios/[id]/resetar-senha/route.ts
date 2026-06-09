import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, ok, badRequest, forbidden, notFound } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { gerarSenhaTemporaria } from "@/lib/senha"

type P = { id: string }

/**
 * POST /api/usuarios/[id]/resetar-senha
 * Admin reseta a senha de um membro, gerando senha temporária.
 * O usuário deverá criar nova senha no próximo acesso.
 */
export const POST = withAuthCtx<P>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem resetar senhas.")
  }

  const userId = parseInt(params.id)
  if (isNaN(userId)) return badRequest("ID inválido.")

  if (userId === parseInt(session.user.id)) {
    return badRequest("Use 'Minha conta' para alterar sua própria senha.")
  }

  const user = await prisma.user.findFirst({
    where:  { id: userId, companyId: session.user.companyId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!user) return notFound("Usuário não encontrado.")

  const senhaTemporaria = gerarSenhaTemporaria()
  const hash            = await bcrypt.hash(senhaTemporaria, 12)

  await prisma.user.update({
    where: { id: userId },
    data:  { password: hash, mustChangePassword: true },
  })

  await logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "usuario.senha_resetada",
    entity:    "user",
    entityId:  userId,
    after:     { mustChangePassword: true, resetadoPor: parseInt(session.user.id) },
    ip:        getIp(req),
  })

  return ok({
    message:         `Senha de ${user.name} resetada com sucesso.`,
    senhaTemporaria,
    usuario:         user,
  })
})
