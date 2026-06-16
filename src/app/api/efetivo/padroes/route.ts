import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  nome:         z.string().min(1).max(100),
  modo:         z.enum(["FIXO_SEMANAL", "ROTATIVO"]),
  diasSemana:   z.string().max(50).optional().nullable(),
  diasTrabalho: z.number().int().positive().optional().nullable(),
  diasFolga:    z.number().int().positive().optional().nullable(),
})

export const GET = withAuth(async (_req, session) => {
  const padroes = await prisma.efetivoPadraoEscala.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { nome: "asc" },
  })
  return ok(padroes)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const padrao = await prisma.efetivoPadraoEscala.create({
    data: {
      companyId:    session.user.companyId,
      nome:         data.nome,
      modo:         data.modo,
      diasSemana:   data.diasSemana   ?? null,
      diasTrabalho: data.diasTrabalho ?? null,
      diasFolga:    data.diasFolga    ?? null,
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.padrao.criado",
    entity:    "EfetivoPadraoEscala",
    entityId:  padrao.id,
    after:     padrao,
  })

  return created(padrao)
})
