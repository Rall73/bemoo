import { prisma } from "@/lib/prisma"
import { validateBody, ok, badRequest, serverError } from "@/lib/api"
import { zNovaSenhaSchema } from "@/lib/validators"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const { data, error } = await validateBody(req, zNovaSenhaSchema)
  if (error) return error

  try {
    const reset = await prisma.passwordReset.findUnique({
      where: { token: data.token },
    })

    if (!reset) {
      return badRequest("Link inválido ou expirado.")
    }

    if (reset.usedAt) {
      return badRequest("Este link já foi utilizado.")
    }

    if (reset.expiresAt < new Date()) {
      return badRequest("Link expirado. Solicite um novo.")
    }

    const hash = await bcrypt.hash(data.password, 12)

    // Atualizar senha + marcar token como usado em transação
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { email: reset.email, deletedAt: null },
        data:  { password: hash },
      }),
      prisma.passwordReset.update({
        where: { token: data.token },
        data:  { usedAt: new Date() },
      }),
    ])

    return ok({ message: "Senha redefinida com sucesso." })
  } catch (err) {
    console.error("[Confirmar Senha]", err)
    return serverError()
  }
}
