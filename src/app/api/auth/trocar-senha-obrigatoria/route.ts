import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest, forbidden } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { zSenha } from "@/lib/validators"

const zTrocarSenhaSchema = z
  .object({
    password: zSenha,
    confirm:  z.string().min(1, "Confirmação obrigatória"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  })

/**
 * POST /api/auth/trocar-senha-obrigatoria
 * Troca a senha temporária por uma senha definitiva.
 * Só pode ser chamado por usuários com mustChangePassword=true.
 */
export const POST = withAuth(async (req, session) => {
  // Verificar no banco (não apenas no JWT) para evitar bypass
  const userId = parseInt(session.user.id)
  const user   = await prisma.user.findUnique({
    where:  { id: userId, deletedAt: null },
    select: { mustChangePassword: true },
  })

  if (!user?.mustChangePassword) {
    return forbidden("Esta operação não é necessária para sua conta.")
  }

  const { data, error } = await validateBody(req, zTrocarSenhaSchema)
  if (error) return error

  const hash = await bcrypt.hash(data.password, 12)

  await prisma.user.update({
    where: { id: userId },
    data:  { password: hash, mustChangePassword: false },
  })

  await logAction({
    companyId: session.user.companyId,
    userId,
    action:    "senha.trocada_obrigatoria",
    entity:    "user",
    entityId:  userId,
    ip:        getIp(req),
  })

  return ok({ message: "Senha alterada com sucesso." })
})
