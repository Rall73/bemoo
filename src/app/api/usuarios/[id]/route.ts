import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, noContent, badRequest, unauthorized, forbidden, notFound } from "@/lib/api"
import { z } from "zod"

type Ctx = { params: Promise<{ id: string }> }

async function getSession() {
  return auth() as Promise<{
    user: { id: string; role: string; companyId: number }
  } | null>
}

/**
 * PATCH /api/usuarios/[id]
 * Altera o papel (role) de um membro da empresa (ADMIN only).
 * Body: { role: "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR" }
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getSession()
  if (!session?.user) return unauthorized()
  if (session.user.role !== "ADMIN") return forbidden("Apenas administradores podem alterar papéis.")

  const { id } = await params
  const userId = parseInt(id)
  if (isNaN(userId)) return badRequest("ID inválido.")

  const body   = await req.json().catch(() => null)
  const result = z.object({ role: z.enum(["ADMIN", "GESTOR", "EXECUTOR", "AUDITOR"]) }).safeParse(body)
  if (!result.success) return badRequest("Papel inválido.")

  // Garantir que o usuário pertence à empresa
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId, deletedAt: null },
    select: { id: true },
  })
  if (!user) return notFound("Usuário não encontrado.")

  await prisma.user.update({
    where: { id: userId },
    data:  { role: result.data.role },
  })

  return ok({ message: "Papel atualizado." })
}

/**
 * DELETE /api/usuarios/[id]
 * Desativa (soft delete) um membro da empresa (ADMIN only).
 * Regras: não pode desativar a si mesmo; deve restar ao menos 1 ADMIN ativo.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession()
  if (!session?.user) return unauthorized()
  if (session.user.role !== "ADMIN") return forbidden("Apenas administradores podem desativar usuários.")

  const { id } = await params
  const userId = parseInt(id)
  if (isNaN(userId)) return badRequest("ID inválido.")

  // Não pode desativar a si mesmo
  if (userId === parseInt(session.user.id)) {
    return badRequest("Você não pode desativar sua própria conta.")
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId, deletedAt: null },
    select: { id: true, role: true },
  })
  if (!user) return notFound("Usuário não encontrado.")

  // Se o alvo é ADMIN, verificar se restarão outros ADMINs ativos
  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: {
        companyId: session.user.companyId,
        role:      "ADMIN",
        deletedAt: null,
      },
    })
    if (adminCount <= 1) {
      return badRequest("A empresa deve ter pelo menos um administrador ativo.")
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data:  { deletedAt: new Date(), deletedBy: parseInt(session.user.id) },
  })

  return noContent()
}
