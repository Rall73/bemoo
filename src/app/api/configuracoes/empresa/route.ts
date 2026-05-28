import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, ok, forbidden } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"
import { zNome, zEmail } from "@/lib/validators"

const zEmpresaSchema = z.object({
  name:     zNome,
  document: z.string().max(30).optional(),
  email:    zEmail.optional(),
  phone:    z.string().max(20).optional(),
})

/**
 * PATCH /api/configuracoes/empresa
 * Atualiza os dados da empresa do usuário logado (ADMIN only).
 */
export const PATCH = withAuth(async (req, session) => {
  if (session.user.role !== "ADMIN") {
    return forbidden("Apenas administradores podem editar os dados da empresa.")
  }

  const { data, error } = await validateBody(req, zEmpresaSchema)
  if (error) return error

  const companyId = session.user.companyId

  const before = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { name: true, document: true, email: true },
  })

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name:     data.name,
      document: data.document ?? null,
      ...(data.email ? { email: data.email } : {}),
    },
    select: { id: true, name: true, document: true, email: true },
  })

  await logAction({
    companyId: companyId,
    userId:    parseInt(session.user.id),
    action:    "empresa.editada",
    entity:    "company",
    entityId:  companyId,
    before,
    after:     { name: data.name, document: data.document, email: data.email },
    ip:        getIp(req),
  })

  return ok(updated)
})
