import crypto from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ok, noContent, badRequest, unauthorized, forbidden, notFound } from "@/lib/api"
import { sendMail } from "@/lib/mailer"
import { emailConvite } from "@/emails/convite"

type Ctx = { params: Promise<{ id: string }> }

async function getSession() {
  return auth() as Promise<{
    user: { id: string; name?: string | null; email?: string | null; role: string; companyId: number }
  } | null>
}

/**
 * DELETE /api/usuarios/convite/[id]
 * Cancela (exclui) um convite pendente (ADMIN only).
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getSession()
  if (!session?.user) return unauthorized()
  if (session.user.role !== "ADMIN") return forbidden("Apenas administradores podem cancelar convites.")

  const { id } = await params
  const inviteId = parseInt(id)
  if (isNaN(inviteId)) return badRequest("ID inválido.")

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, companyId: session.user.companyId },
    select: { id: true, acceptedAt: true },
  })
  if (!invite) return notFound("Convite não encontrado.")
  if (invite.acceptedAt) return badRequest("Convite já aceito — não é possível cancelar.")

  await prisma.invite.delete({ where: { id: inviteId } })
  return noContent()
}

/**
 * POST /api/usuarios/convite/[id]
 * Reenvia o e-mail de um convite (gera novo token, reinicia prazo) (ADMIN only).
 */
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getSession()
  if (!session?.user) return unauthorized()
  if (session.user.role !== "ADMIN") return forbidden("Apenas administradores podem reenviar convites.")

  const { id } = await params
  const inviteId = parseInt(id)
  if (isNaN(inviteId)) return badRequest("ID inválido.")

  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, companyId: session.user.companyId },
    select: { id: true, email: true, role: true, acceptedAt: true },
  })
  if (!invite) return notFound("Convite não encontrado.")
  if (invite.acceptedAt) return badRequest("Convite já aceito.")

  // Novo token + novo prazo
  const token     = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await prisma.invite.update({
    where: { id: inviteId },
    data:  { token, expiresAt },
  })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  sendMail({
    to: invite.email,
    ...emailConvite({
      nomeConvidado:  invite.email,
      nomeEmpresa:    company?.name ?? "bemoo",
      nomeConvidador: session.user.name ?? session.user.email ?? "Administrador",
      token,
    }),
  }).catch((err) => console.error("[Mailer] Falha ao reenviar convite:", err))

  return ok({ message: "Convite reenviado." })
}
