import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  codigo:         z.string().min(1).max(10).toUpperCase(),
  horaInicio:     z.string().regex(/^\d{2}:\d{2}$/),
  horaFim:        z.string().regex(/^\d{2}:\d{2}$/),
  cruzaMeiaNoite: z.boolean().default(false),
})

export const GET = withAuth(async (_req, session) => {
  const turnos = await prisma.efetivoTurno.findMany({
    where:   { companyId: session.user.companyId, deletedAt: null },
    orderBy: { codigo: "asc" },
  })
  return ok(turnos)
})

export const POST = withAuth(async (req, session) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const turno = await prisma.efetivoTurno.create({
    data: {
      companyId:      session.user.companyId,
      codigo:         data.codigo,
      horaInicio:     data.horaInicio,
      horaFim:        data.horaFim,
      cruzaMeiaNoite: data.cruzaMeiaNoite,
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.turno.criado",
    entity:    "EfetivoTurno",
    entityId:  turno.id,
    after:     turno,
  })

  return created(turno)
})
