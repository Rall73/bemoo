import { z } from "zod"
import { withAuth, withPlatformAdmin, ok, badRequest } from "@/lib/api"
import { getActiveVersions } from "@/lib/legal"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/legal/versions
 * Retorna as versões ativas de cada documento (qualquer usuário autenticado).
 */
export const GET = withAuth(async () => {
  const active = await getActiveVersions()
  return ok(active)
})

/**
 * POST /api/legal/versions
 * Publica uma nova versão de documento legal (somente platform admin).
 * Após publicar, todos os usuários serão solicitados a aceitar na próxima entrada.
 *
 * Body: { type, version, summary, effectiveAt? }
 */
const zPublishSchema = z.object({
  type:        z.enum(["TERMS", "PRIVACY"]),
  version:     z.string().min(1).max(20),
  summary:     z.string().min(10).max(2000),
  // Se omitido, entra em vigor imediatamente
  effectiveAt: z.string().datetime({ offset: true }).optional(),
})

export const POST = withPlatformAdmin(async (req, session) => {
  const body = await req.json().catch(() => null)
  const result = zPublishSchema.safeParse(body)
  if (!result.success) {
    return badRequest("Dados inválidos.")
  }

  const { type, version, summary, effectiveAt } = result.data

  // Impede duplicata de versão para o mesmo tipo
  const exists = await (prisma as any).legalVersion.findFirst({
    where:  { type, version },
    select: { id: true },
  })
  if (exists) {
    return badRequest(`A versão "${version}" já existe para ${type === "TERMS" ? "Termos de Uso" : "Política de Privacidade"}.`)
  }

  const newVersion = await (prisma as any).legalVersion.create({
    data: {
      type,
      version,
      summary,
      effectiveAt: effectiveAt ? new Date(effectiveAt) : new Date(),
      createdBy:   parseInt(session.user.id),
    },
  })

  return ok(newVersion)
})
