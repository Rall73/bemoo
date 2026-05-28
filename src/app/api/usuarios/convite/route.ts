import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest, forbidden } from "@/lib/api"
import { zConviteSchema } from "@/lib/validators"
import { sendMail } from "@/lib/mailer"
import { emailConvite } from "@/emails/convite"

/**
 * POST /api/usuarios/convite
 * Envia convite por e-mail para um novo colaborador (ADMIN only).
 */
export const POST = withAuth(async (req, session) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem convidar usuários.")
  }

  const { data, error } = await validateBody(req, zConviteSchema)
  if (error) return error

  const { email, role } = data
  const companyId = session.user.companyId

  // E-mail já é membro ativo?
  const existingUser = await prisma.user.findFirst({
    where: { email, companyId, deletedAt: null },
    select: { id: true },
  })
  if (existingUser) {
    return badRequest("Este e-mail já é membro da empresa.", { email: ["E-mail já cadastrado"] })
  }

  // Já existe convite pendente não expirado?
  const existingInvite = await prisma.invite.findFirst({
    where: { companyId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  })
  if (existingInvite) {
    return badRequest("Já existe um convite pendente para este e-mail.", {
      email: ["Convite já enviado — aguardando aceite ou reenvie"],
    })
  }

  // Criar convite (token hex 32 bytes, 48h de validade)
  const token     = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await prisma.invite.create({ data: { companyId, email, role, token, expiresAt } })

  // Buscar nome da empresa para o e-mail
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  })

  sendMail({
    to: email,
    ...emailConvite({
      nomeConvidado:  email,
      nomeEmpresa:    company?.name ?? "bemoo",
      nomeConvidador: session.user.name ?? session.user.email ?? "Administrador",
      token,
    }),
  }).catch((err) => console.error("[Mailer] Falha ao enviar convite:", err))

  return ok({ message: "Convite enviado." })
})
