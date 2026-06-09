import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest, forbidden } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { zCriarUsuarioDiretoSchema } from "@/lib/validators"
import { getUserLimit, PLAN_LABEL } from "@/lib/planLimits"

function gerarSenhaTemporaria(): string {
  // Letras e dígitos sem ambiguidade visual (0/O, 1/l/I)
  const upper  = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower  = "abcdefghjkmnpqrstuvwxyz"
  const digits = "23456789"
  const all    = upper + lower + digits

  const bytes = crypto.randomBytes(10)
  const chars: string[] = [
    upper[bytes[0]  % upper.length],   // garante >= 1 maiúscula
    digits[bytes[1] % digits.length],  // garante >= 1 dígito
  ]
  for (let i = 2; i < 10; i++) {
    chars.push(all[bytes[i] % all.length])
  }

  // Fisher-Yates com bytes adicionais
  const shuffle = crypto.randomBytes(chars.length)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}

/**
 * POST /api/usuarios/direto
 * Cria usuário diretamente com senha temporária (ADMIN only).
 * Retorna a senha gerada para o admin repassar ao novo usuário.
 */
export const POST = withAuth(async (req, session) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem criar usuários.")
  }

  const { data, error } = await validateBody(req, zCriarUsuarioDiretoSchema)
  if (error) return error

  const { name, email, role } = data
  const companyId = session.user.companyId

  // Verificar limite do plano
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { plan: true, maxUsers: true },
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

  // E-mail já cadastrado nessa empresa?
  const existing = await prisma.user.findFirst({
    where:  { email, companyId, deletedAt: null },
    select: { id: true },
  })
  if (existing) {
    return badRequest("Este e-mail já é membro da empresa.", { email: ["E-mail já cadastrado"] })
  }

  // E-mail já existe em outra empresa?
  const emailGlobal = await prisma.user.findUnique({
    where:  { email },
    select: { id: true },
  })
  if (emailGlobal) {
    return badRequest("Este e-mail já está em uso.", { email: ["E-mail já cadastrado"] })
  }

  const senhaTemporaria = gerarSenhaTemporaria()
  const hash            = await bcrypt.hash(senhaTemporaria, 12)

  const novoUsuario = await prisma.user.create({
    data: {
      companyId,
      name,
      email,
      password:           hash,
      role,
      mustChangePassword: true,
    },
    select: { id: true, name: true, email: true, role: true },
  })

  await logAction({
    companyId,
    userId:   parseInt(session.user.id),
    action:   "usuario.criado_direto",
    entity:   "user",
    entityId: novoUsuario.id,
    after:    { name, email, role, mustChangePassword: true },
    ip:       getIp(req),
  })

  return ok({
    message:          "Usuário criado com sucesso.",
    senhaTemporaria,
    usuario: novoUsuario,
  })
})
