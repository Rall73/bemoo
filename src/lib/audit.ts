import { prisma } from "@/lib/prisma"

type AuditAction =
  | "login"
  | "logout"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.invite"
  | "user.role_change"
  | "company.update"
  | "company.suspend"
  | "company.reactivate"
  | "module.enable"
  | "module.disable"
  | "password.reset_request"
  | "password.reset_complete"

interface LogActionParams {
  companyId:     number
  userId:        number
  action:        AuditAction
  entity?:       string
  entityId?:     number
  payloadBefore?: Record<string, unknown>
  payloadAfter?:  Record<string, unknown>
  ip?:           string
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).auditLog.create({
      data: {
        companyId:     params.companyId,
        userId:        params.userId,
        action:        params.action,
        entity:        params.entity ?? null,
        entityId:      params.entityId ?? null,
        payloadBefore: params.payloadBefore ? JSON.stringify(params.payloadBefore) : null,
        payloadAfter:  params.payloadAfter  ? JSON.stringify(params.payloadAfter)  : null,
        ip:            params.ip ?? null,
      },
    })
  } catch (err) {
    // Nunca deixar falha de audit derrubar a operação principal
    console.error("[Audit] Falha ao registrar log:", err)
  }
}

/** Extrai o IP real da requisição (considera proxies) */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}
