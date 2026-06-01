import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, ok, noContent, badRequest, forbidden, notFound } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { sendMail } from "@/lib/mailer"
import { emailConvite } from "@/emails/convite"

type P = { id: string }

/**
 * DELETE /api/usuarios/convite/[id]
 * Cancela (exclui) um convite pendente (ADMIN only).
 */
export const DELETE = withAuthCtx<P>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem cancelar convites.")
  }

  const inviteId = parseInt(params.id)
  if (isNaN(inviteId)) return badRequest("ID inválido.")

  const invite = await prisma.invite.findFirst({
    where:  { id: inviteId, companyId: session.user.companyId },
    select: { id: true, email: true, acceptedAt: true },
  })
  if (!invite) return notFound("Convite não encontrado.")
  if (invite.acceptedAt) return badRequest("Convite já aceito — não é possível cancelar.")

  await prisma.invite.delete({ where: { id: inviteId } })

  await logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "convite.cancelado",
    entity:    "invite",
    entityId:  inviteId,
    before:    { email: invite.email },
    ip:        getIp(req),
  })

  return noContent()
})

/**
 * POST /api/usuarios/convite/[id]
 * Reenvia o e-mail de um convite (gera novo token, reinicia prazo) (ADMIN only).
 */
export const POST = withAuthCtx<P>(async (req, session, params) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem reenviar convites.")
  }

  const inviteId = parseInt(params.id)
  if (isNaN(inviteId)) return badRequest("ID inválido.")

  const invite = await prisma.invite.findFirst({
    where:  { id: inviteId, companyId: session.user.companyId },
    select: { id: true, email: true, role: true, acceptedAt: true },
  })
  if (!invite) return notFound("Convite não encontrado.")
  if (invite.acceptedAt) return badRequest("Convite já aceito.")

  const token     = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await prisma.invite.update({ where: { id: inviteId }, data: { token, expiresAt } })

  const company = await prisma.company.findUnique({
    where:  { id: session.user.companyId },
    select: { name: true },
  })

  // Tentar reenviar e aguardar resultado
  let emailOk   = false
  let emailErro = ""
  const remetente = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@bemoo.net"

  try {
    await sendMail({
      to: invite.email,
      ...emailConvite({
        nomeConvidado:  invite.email,
        nomeEmpresa:    company?.name ?? "bemoo",
        nomeConvidador: session.user.name ?? session.user.email ?? "Administrador",
        token,
      }),
    })
    emailOk = true
  } catch (err: any) {
    emailErro = err?.message ?? "Erro desconhecido"
    console.error("[Mailer] Falha ao reenviar convite:", err)
  }

  await logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "convite.reenviado",
    entity:    "invite",
    entityId:  inviteId,
    after: {
      email:        invite.email,
      emailEnviado: emailOk,
      remetente,
      ...(emailErro && { emailErro }),
    },
    ip: getIp(req),
  })

  if (!emailOk) {
    return ok({
      message: "Convite atualizado, mas o e-mail não pôde ser entregue. Tente novamente em alguns minutos.",
      emailFalhou: true,
    })
  }

  return ok({ message: "Convite reenviado." })
})
