import { withAuth, ok, badRequest } from "@/lib/api"
import { getActiveVersions, recordAcceptances, getClientIp } from "@/lib/legal"

/**
 * POST /api/legal/accept
 * Registra o aceite do usuário autenticado para uma lista de versões de documentos.
 * Body: { versionIds: number[] }
 */
export const POST = withAuth(async (req, session) => {
  const body = await req.json().catch(() => null)
  const versionIds: unknown = body?.versionIds

  // Validação básica
  if (
    !Array.isArray(versionIds) ||
    versionIds.length === 0 ||
    !versionIds.every((id) => Number.isInteger(id) && id > 0)
  ) {
    return badRequest("versionIds deve ser um array de inteiros positivos.")
  }

  // Segurança: confirma que os IDs enviados correspondem a versões ativas reais
  // (impede que o cliente aceite versões arbitrárias ou futuras)
  const active = await getActiveVersions()
  const validIds = new Set<number>(
    [active.TERMS?.id, active.PRIVACY?.id].filter((id): id is number => id != null)
  )
  const invalidIds = (versionIds as number[]).filter((id) => !validIds.has(id))
  if (invalidIds.length > 0) {
    return badRequest("Uma ou mais versões são inválidas ou ainda não estão em vigor.")
  }

  const ip = getClientIp(req)
  await recordAcceptances(parseInt(session.user.id), versionIds as number[], ip)

  return ok({ accepted: (versionIds as number[]).length })
})
