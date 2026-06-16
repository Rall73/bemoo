import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"

// ─── Respostas padronizadas ───────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(message: string, errors?: Record<string, string[]>) {
  return NextResponse.json({ ok: false, message, errors }, { status: 400 })
}

export function unauthorized(message = "Não autenticado.") {
  return NextResponse.json({ ok: false, message }, { status: 401 })
}

export function forbidden(message = "Acesso negado.") {
  return NextResponse.json({ ok: false, message }, { status: 403 })
}

export function notFound(message = "Recurso não encontrado.") {
  return NextResponse.json({ ok: false, message }, { status: 404 })
}

export function conflict(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 409 })
}

export function serverError(message = "Erro interno do servidor.") {
  return NextResponse.json({ ok: false, message }, { status: 500 })
}

// ─── Validação Zod ────────────────────────────────────────────────

/**
 * Valida o body da requisição contra um schema Zod.
 * Retorna { data } em sucesso ou { error: NextResponse } em falha.
 */
export async function validateBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return { error: badRequest("Body da requisição inválido ou ausente.") }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const errors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "_"
      if (!errors[path]) errors[path] = []
      errors[path].push(issue.message)
    }
    return { error: badRequest("Dados inválidos.", errors) }
  }

  return { data: result.data }
}

/**
 * Valida query params contra um schema Zod.
 */
export function validateParams<T extends z.ZodTypeAny>(
  params: Record<string, string | string[]>,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: NextResponse } {
  const result = schema.safeParse(params)
  if (!result.success) {
    return { error: badRequest("Parâmetros inválidos.") }
  }
  return { data: result.data }
}

// ─── Isolamento de tenant ─────────────────────────────────────────

/**
 * Verifica se o recurso pertence à empresa da sessão.
 * Lança 403 se não pertencer.
 */
export function assertSameCompany(
  sessionCompanyId: number,
  resourceCompanyId: number | null
): NextResponse | null {
  // companyId null = template de plataforma, inacessível via APIs regulares
  if (resourceCompanyId === null || sessionCompanyId !== resourceCompanyId) {
    return forbidden("Você não tem acesso a este recurso.")
  }
  return null
}

/**
 * Verifica se o usuário tem o role mínimo exigido.
 * Hierarquia: ADMIN > GESTOR > EXECUTOR > AUDITOR
 */
const ROLE_LEVEL: Record<string, number> = {
  ADMIN:    4,
  GESTOR:   3,
  EXECUTOR: 2,
  AUDITOR:  1,
}

export function assertMinRole(
  userRole: string,
  minRole: "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR"
): NextResponse | null {
  if ((ROLE_LEVEL[userRole] ?? 0) < ROLE_LEVEL[minRole]) {
    return forbidden(`Requer perfil ${minRole} ou superior.`)
  }
  return null
}

// ─── Handler autenticado ──────────────────────────────────────────

type AuthenticatedSession = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    role: string
    companyId: number
    platformAdmin: boolean
  }
}

/**
 * Wrapper para rotas autenticadas.
 * Verifica sessão automaticamente e injeta na handler.
 *
 * Uso:
 *   export const GET = withAuth(async (req, session) => { ... })
 *   export const POST = withAuth(async (req, session) => { ... }, "GESTOR")
 */
export function withAuth(
  handler: (req: Request, session: AuthenticatedSession) => Promise<NextResponse>,
  minRole?: "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR"
) {
  return async (req: Request): Promise<NextResponse> => {
    const session = await auth() as AuthenticatedSession | null

    if (!session?.user) return unauthorized()

    if (minRole) {
      const roleError = assertMinRole(session.user.role, minRole)
      if (roleError) return roleError
    }

    try {
      return await handler(req, session)
    } catch (err) {
      console.error("[API Error]", err)
      return serverError()
    }
  }
}

/**
 * Wrapper para rotas autenticadas com params dinâmicos (ex: /api/usuarios/[id]).
 *
 * Uso:
 *   export const PATCH = withAuthCtx<{ id: string }>(async (req, session, params) => {
 *     const userId = parseInt(params.id)
 *     ...
 *   })
 */
export function withAuthCtx<P extends Record<string, string>>(
  handler: (req: Request, session: AuthenticatedSession, params: P) => Promise<NextResponse>,
  minRole?: "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR"
) {
  return async (req: Request, { params }: { params: Promise<P> }): Promise<NextResponse> => {
    const session = await auth() as AuthenticatedSession | null

    if (!session?.user) return unauthorized()

    if (minRole) {
      const roleError = assertMinRole(session.user.role, minRole)
      if (roleError) return roleError
    }

    try {
      return await handler(req, session, await params)
    } catch (err) {
      console.error("[API Error]", err)
      return serverError()
    }
  }
}

/**
 * Wrapper exclusivo para platform admins.
 */
export function withPlatformAdmin(
  handler: (req: Request, session: AuthenticatedSession) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    const session = await auth() as AuthenticatedSession | null

    if (!session?.user) return unauthorized()
    if (!session.user.platformAdmin) return forbidden("Área restrita à administração da plataforma.")

    try {
      return await handler(req, session)
    } catch (err) {
      console.error("[Platform API Error]", err)
      return serverError()
    }
  }
}
