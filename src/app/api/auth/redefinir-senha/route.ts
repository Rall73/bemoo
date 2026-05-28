import { prisma } from "@/lib/prisma"
import { validateBody, ok, serverError } from "@/lib/api"
import { sendMail } from "@/lib/mailer"
import { emailRedefinirSenha } from "@/emails/redefinir-senha"
import { zResetSenhaSchema } from "@/lib/validators"
import crypto from "crypto"

export async function POST(req: Request) {
  const { data, error } = await validateBody(req, zResetSenhaSchema)
  if (error) return error

  try {
    const user = await prisma.user.findUnique({
      where: { email: data.email, deletedAt: null },
      select: { id: true, email: true },
    })

    // Sempre retornar sucesso — nunca revelar se o e-mail existe (previne enumeração)
    if (user) {
      // Invalidar tokens anteriores do mesmo e-mail
      await prisma.passwordReset.updateMany({
        where: { email: data.email, usedAt: null },
        data:  { usedAt: new Date() },
      })

      // Criar novo token (expira em 1h)
      const token     = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.passwordReset.create({
        data: { email: data.email, token, expiresAt },
      })

      // Enviar e-mail sem bloquear resposta
      sendMail({
        to: data.email,
        ...emailRedefinirSenha({ token }),
      }).catch((err) => console.error("[Mailer] Falha ao enviar reset:", err))
    }

    return ok({ message: "Se o e-mail existir, você receberá as instruções em breve." })
  } catch (err) {
    console.error("[Reset Senha]", err)
    return serverError()
  }
}
