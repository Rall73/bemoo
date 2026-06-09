import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, badRequest, forbidden } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { zCriarUsuarioDiretoSchema } from "@/lib/validators"
import { getUserLimit, PLAN_LABEL } from "@/lib/planLimits"
import { gerarSenhaTemporaria } from "@/lib/senha"

/**
 * POST /api/usuarios/direto
 * Cria (ou reativa) usuário com senha temporária (ADMIN only).
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

  // Verificar limite do plano (conta usuários ativos)
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

  const senhaTemporaria = gerarSenhaTemporaria()
  const hash            = await bcrypt.hash(senhaTemporaria, 12)

  // Verifica se e-mail já existe no banco (ativo ou soft-deleted)
  const emailExistente = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, companyId: true, deletedAt: true, name: true },
  })

  if (emailExistente) {
    // Usuário ativo
    if (!emailExistente.deletedAt) {
      const msg = emailExistente.companyId === companyId
        ? "Este e-mail já é membro ativo da empresa."
        : "Este e-mail já está em uso em outra empresa."
      return badRequest(msg, { email: ["E-mail já cadastrado"] })
    }

    // Usuário soft-deleted de outra empresa — não pode reativar
    if (emailExistente.companyId !== companyId) {
      return badRequest("Este e-mail pertence a um usuário de outra empresa.", {
        email: ["E-mail não disponível"],
      })
    }

    // Usuário soft-deleted da mesma empresa → reativar
    const reativado = await prisma.user.update({
      where: { id: emailExistente.id },
      data:  {
        name,
        role,
        password:           hash,
        mustChangePassword: true,
        deletedAt:          null,
        deletedBy:          null,
      },
      select: { id: true, name: true, email: true, role: true },
    })

    await logAction({
      companyId,
      userId:   parseInt(session.user.id),
      action:   "usuario.criado_direto",
      entity:   "user",
      entityId: reativado.id,
      before:   { deletedAt: emailExistente.deletedAt },
      after:    { name, email, role, mustChangePassword: true, reativado: true },
      ip:       getIp(req),
    })

    return ok({
      message:         "Usuário reativado com nova senha temporária.",
      senhaTemporaria,
      usuario:         reativado,
    })
  }

  // E-mail novo — criar usuário
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
    message:         "Usuário criado com sucesso.",
    senhaTemporaria,
    usuario:         novoUsuario,
  })
})
