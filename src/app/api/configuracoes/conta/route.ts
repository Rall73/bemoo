import { z } from "zod"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

const zContaSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  // Alteração de senha — todos os três obrigatórios se qualquer um estiver presente
  currentPassword: z.string().optional(),
  newPassword:     z.string().min(8).regex(/[0-9]/, "Deve conter pelo menos um número").optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => {
  // Se qualquer campo de senha foi preenchido, os três são obrigatórios
  const anyPassword = d.currentPassword || d.newPassword || d.confirmPassword
  if (!anyPassword) return true
  return !!d.currentPassword && !!d.newPassword && !!d.confirmPassword
}, { message: "Preencha todos os campos de senha." })
 .refine((d) => {
  if (!d.newPassword || !d.confirmPassword) return true
  return d.newPassword === d.confirmPassword
}, { message: "As senhas não coincidem.", path: ["confirmPassword"] })

/**
 * PATCH /api/configuracoes/conta
 * Atualiza nome e/ou senha do usuário logado.
 */
export const PATCH = withAuth(async (req, session) => {
  const { data, error } = await validateBody(req, zContaSchema)
  if (error) return error

  const userId = parseInt(session.user.id)
  const updateData: Record<string, unknown> = {}

  if (data.name) updateData.name = data.name

  // Alteração de senha
  if (data.currentPassword && data.newPassword) {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { password: true },
    })

    // Usuário sem senha (entrou via Google)
    if (!user?.password) {
      return badRequest("Sua conta usa login com Google e não possui senha cadastrada.")
    }

    const valid = await bcrypt.compare(data.currentPassword, user.password)
    if (!valid) {
      return badRequest("Senha atual incorreta.", { currentPassword: ["Senha incorreta"] })
    }

    updateData.password = await bcrypt.hash(data.newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return badRequest("Nenhuma alteração enviada.")
  }

  const updated = await prisma.user.update({
    where:  { id: userId },
    data:   updateData,
    select: { id: true, name: true, email: true },
  })

  await logAction({
    companyId: session.user.companyId,
    userId:    userId,
    action:    "usuario.editado",
    entity:    "user",
    entityId:  userId,
    after:     { name: data.name, passwordChanged: !!data.newPassword },
    ip:        getIp(req),
  })

  return ok(updated)
})
