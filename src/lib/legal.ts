import { prisma } from "@/lib/prisma"

// ─── Types ────────────────────────────────────────────────────────

export type PendingVersion = {
  id:          number
  type:        "TERMS" | "PRIVACY"
  version:     string
  summary:     string | null
  effectiveAt: Date
}

export type ActiveVersions = {
  TERMS:   { id: number; version: string } | null
  PRIVACY: { id: number; version: string } | null
}

// ─── Queries ──────────────────────────────────────────────────────

/**
 * Retorna a versão mais recente em vigor de cada tipo de documento.
 * Documentos com effectiveAt no futuro ainda não estão em vigor.
 */
export async function getActiveVersions(): Promise<ActiveVersions> {
  const now = new Date()
  const [terms, privacy] = await Promise.all([
    (prisma as any).legalVersion.findFirst({
      where:   { type: "TERMS",   effectiveAt: { lte: now } },
      orderBy: { effectiveAt: "desc" },
      select:  { id: true, version: true },
    }),
    (prisma as any).legalVersion.findFirst({
      where:   { type: "PRIVACY", effectiveAt: { lte: now } },
      orderBy: { effectiveAt: "desc" },
      select:  { id: true, version: true },
    }),
  ])
  return { TERMS: terms ?? null, PRIVACY: privacy ?? null }
}

/**
 * Versões que o usuário ainda NÃO aceitou.
 * Retorna array vazio se tudo estiver em dia.
 */
export async function getPendingVersions(userId: number): Promise<PendingVersion[]> {
  const active = await getActiveVersions()
  const activeIds = [active.TERMS?.id, active.PRIVACY?.id].filter(
    (id): id is number => id != null
  )
  if (activeIds.length === 0) return []

  const accepted = await (prisma as any).legalAcceptance.findMany({
    where:  { userId, legalVersionId: { in: activeIds } },
    select: { legalVersionId: true },
  })
  const acceptedSet = new Set<number>(accepted.map((a: any) => a.legalVersionId))
  const pendingIds  = activeIds.filter((id) => !acceptedSet.has(id))
  if (pendingIds.length === 0) return []

  const rows = await (prisma as any).legalVersion.findMany({
    where:   { id: { in: pendingIds } },
    select:  { id: true, type: true, version: true, summary: true, effectiveAt: true },
    orderBy: { type: "asc" },
  })
  return rows as PendingVersion[]
}

/**
 * Registra aceites para uma lista de IDs de versão.
 * skipDuplicates garante idempotência (duplo-clique, retry).
 */
export async function recordAcceptances(
  userId:     number,
  versionIds: number[],
  ip?:        string | null
): Promise<void> {
  if (versionIds.length === 0) return
  await (prisma as any).legalAcceptance.createMany({
    data: versionIds.map((legalVersionId) => ({ userId, legalVersionId, ip: ip ?? null })),
    skipDuplicates: true,
  })
}

// ─── Utilitário ───────────────────────────────────────────────────

/** Extrai o IP real do cliente dos headers da requisição. */
export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  )
}
