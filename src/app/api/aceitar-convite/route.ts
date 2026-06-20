import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { ok, badRequest, serverError } from "@/lib/api"
import { zNome, zSenha } from "@/lib/validators"
import { getActiveVersions, recordAcceptances, getClientIp } from "@/lib/legal"
import { z } from "zod"

const zAceitarConviteSchema = z
  .object({
    token:    z.string().min(1),
    name:     zNome,
    password: zSenha,
    confirm:  z.string().min(1),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path:    ["confirm"],
  })

/**
 * POST /api/aceitar-convite
 * Rota pública — cria o usuário convidado e registra o aceite do convite.
 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return badRequest("Body inválido.")
  }

  const result = zAceitarConviteSchema.safeParse(body)
  if (!result.success) {
    const errors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "_"
      if (!errors[path]) errors[path] = []
      errors[path].push(issue.message)
    }
    return badRequest("Dados inválidos.", errors)
  }

  const { token, name, password } = result.data

  // Validar convite
  const invite = await prisma.invite.findUnique({
    where:  { token },
    select: { id: true, companyId: true, email: true, role: true, expiresAt: true, acceptedAt: true },
  })

  if (!invite)           return badRequest("Convite inválido ou não encontrado.")
  if (invite.acceptedAt) return badRequest("Este convite já foi utilizado. Faça login para acessar.")
  if (invite.expiresAt < new Date()) return badRequest("Este convite expirou. Solicite um novo ao administrador.")

  // E-mail já cadastrado (em qualquer empresa)?
  const emailEmUso = await prisma.user.findFirst({
    where:  { email: invite.email, deletedAt: null },
    select: { id: true, companyId: true },
  })
  if (emailEmUso) {
    if (emailEmUso.companyId === invite.companyId) {
      return badRequest("Este e-mail já possui uma conta ativa na empresa. Faça login para acessar.")
    }
    return badRequest(
      "Este e-mail já está vinculado a outra conta no bemoo. " +
      "Entre em contato com o suporte para resolver."
    )
  }

  try {
    const hash = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          companyId: invite.companyId,
          name,
          email:    invite.email,
          password: hash,
          role:     invite.role,
        },
        select: { id: true },
      })

      // Marcar convite como aceito
      await tx.invite.update({
        where: { id: invite.id },
        data:  { acceptedAt: new Date() },
      })

      return newUser
    })

    // Registrar aceite dos documentos legais vigentes
    try {
      const active     = await getActiveVersions()
      const versionIds = [active.TERMS?.id, active.PRIVACY?.id].filter(
        (id): id is number => id != null
      )
      const ip = getClientIp(req)
      await recordAcceptances(user.id, versionIds, ip)
    } catch (err) {
      console.error("[Legal] Falha ao registrar aceite no convite:", err)
    }

    return ok({ email: invite.email })
  } catch (err) {
    console.error("[aceitar-convite]", err)
    return serverError()
  }
}
