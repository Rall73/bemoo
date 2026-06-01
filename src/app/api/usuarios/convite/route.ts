import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest, forbidden } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { zConviteSchema } from "@/lib/validators"
import { sendMail } from "@/lib/mailer"
import { emailConvite } from "@/emails/convite"
import { getUserLimit, PLAN_LABEL } from "@/lib/planLimits"

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

  // Verificar limite de usuários do plano
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { name: true, plan: true, maxUsers: true },
  })
  if (company) {
    const limit       = getUserLimit(company.plan, company.maxUsers)
    const activeCount = await prisma.user.count({ where: { companyId, deletedAt: null } })
    if (limit !== null && activeCount >= limit) {
      const planLabel = PLAN_LABEL[company.plan] ?? company.plan
      return badRequest(
        `Limite de ${limit} usuário${limit !== 1 ? "s" : ""} atingido no plano ${planLabel}. ` +
        `Entre em contato para fazer upgrade.`
      )
    }
  }

  // E-mail já é membro ativo?
  const existingUser = await prisma.user.findFirst({
    where:  { email, companyId, deletedAt: null },
    select: { id: true },
  })
  if (existingUser) {
    return badRequest("Este e-mail já é membro da empresa.", { email: ["E-mail já cadastrado"] })
  }

  // Já existe convite pendente não expirado?
  const existingInvite = await prisma.invite.findFirst({
    where:  { companyId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
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
  const invite    = await prisma.invite.create({ data: { companyId, email, role, token, expiresAt } })

  // Tentar enviar e-mail — aguarda resultado para registrar no audit log
  let emailOk   = false
  let emailErro = ""
  const remetente = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@bemoo.net"

  try {
    await sendMail({
      to: email,
      ...emailConvite({
        nomeConvidado:  email,
        nomeEmpresa:    company?.name ?? "bemoo",
        nomeConvidador: session.user.name ?? session.user.email ?? "Administrador",
        token,
      }),
    })
    emailOk = true
  } catch (err: any) {
    emailErro = err?.message ?? "Erro desconhecido"
    console.error("[Mailer] Falha ao enviar convite:", err)
  }

  // Registra no audit log com resultado real do envio
  await logAction({
    companyId,
    userId:  parseInt(session.user.id),
    action:  "convite.enviado",
    entity:  "invite",
    entityId: invite.id,
    after: {
      email,
      role,
      emailEnviado: emailOk,
      remetente,
      ...(emailErro && { emailErro }),
    },
    ip: getIp(req),
  })

  // Convite criado mesmo se e-mail falhou — ADMIN pode reenviar
  if (!emailOk) {
    return ok({
      message: "Convite criado, mas o e-mail não pôde ser entregue. Use 'Reenviar' para tentar novamente.",
      emailFalhou: true,
    })
  }

  return ok({ message: "Convite enviado." })
})
