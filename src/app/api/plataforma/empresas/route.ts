import crypto from "crypto"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withPlatformAdmin, ok, badRequest, serverError } from "@/lib/api"
import { zNome, zEmail } from "@/lib/validators"
import { sendMail } from "@/lib/mailer"
import { emailRedefinirSenha } from "@/emails/redefinir-senha"
import { getActiveVersions, recordAcceptances } from "@/lib/legal"

const zNovaEmpresaSchema = z.object({
  name:    zNome,
  email:   zEmail,
  plan:    z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"]).default("FREE"),
  modules: z.array(z.string()).optional(),
})

/**
 * POST /api/plataforma/empresas
 * Cria empresa manualmente (vendas diretas).
 * Cria a empresa + usuário ADMIN com senha temporária + envia e-mail de definição de senha.
 */
export const POST = withPlatformAdmin(async (req) => {
  const body = await req.json().catch(() => null)
  const result = zNovaEmpresaSchema.safeParse(body)
  if (!result.success) {
    const errors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "_"
      if (!errors[path]) errors[path] = []
      errors[path].push(issue.message)
    }
    return badRequest("Dados inválidos.", errors)
  }

  const { name, email, plan, modules = [] } = result.data

  // E-mail já cadastrado?
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (exists) return badRequest("Este e-mail já está cadastrado.", { email: ["E-mail já em uso"] })

  try {
    // Senha temporária aleatória (usuário vai redefinir via e-mail)
    const tempPassword = crypto.randomBytes(16).toString("hex")
    const hash = await bcrypt.hash(tempPassword, 12)

    const { company, user } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name, email, plan } })

      const user = await tx.user.create({
        data: { companyId: company.id, name, email, password: hash, role: "ADMIN" },
        select: { id: true, email: true },
      })

      // Módulos iniciais
      if (modules.length > 0) {
        await tx.companyModule.createMany({
          data: modules.map((module) => ({ companyId: company.id, module })),
          skipDuplicates: true,
        })
      }

      return { company, user }
    })

    // Aceite legal retroativo
    try {
      const active = await getActiveVersions()
      const ids = [active.TERMS?.id, active.PRIVACY?.id].filter((id): id is number => id != null)
      await recordAcceptances(user.id, ids)
    } catch { /* não bloqueia */ }

    // Token de redefinição de senha (usuário define sua própria senha no primeiro acesso)
    const token = crypto.randomBytes(32).toString("hex")
    await prisma.passwordReset.create({
      data: { email, token, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) }, // 72h
    })

    sendMail({
      to: email,
      ...emailRedefinirSenha({ token }),
    }).catch((err) => console.error("[Mailer] Falha ao enviar e-mail de nova empresa:", err))

    return ok({ id: company.id, name: company.name, email: company.email })
  } catch (err) {
    console.error("[plataforma/empresas POST]", err)
    return serverError()
  }
})
