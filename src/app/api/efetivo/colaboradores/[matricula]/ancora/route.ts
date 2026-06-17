import { z }        from "zod"
import { prisma }   from "@/lib/prisma"
import { withAuthCtx, ok, validateBody, assertMinRole, notFound } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zAncora = z.object({
  dataAncora:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  dataVigencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
})

// POST /api/efetivo/colaboradores/[matricula]/ancora
// Registra uma alteração de data-âncora com vigência a partir de dataVigencia.
// A escala API resolve a âncora correta por dia usando este histórico.
export const POST = withAuthCtx<{ matricula: string }>(async (req, session, params) => {
  const roleErr = assertMinRole(session.user.role, "GESTOR")
  if (roleErr) return roleErr

  const { data, error } = await validateBody(req, zAncora)
  if (error) return error

  const { dataAncora, dataVigencia } = data
  const companyId = session.user.companyId

  const colab = await prisma.efetivoColaborador.findFirst({
    where: { companyId, matricula: params.matricula, deletedAt: null },
    select: { id: true, dataAncora: true },
  })
  if (!colab) return notFound("Colaborador não encontrado.")

  const registro = await prisma.efetivoAncoraHistorico.create({
    data: {
      companyId,
      colaboradorId: colab.id,
      dataAncora:    new Date(dataAncora   + "T12:00:00Z"),
      dataVigencia:  new Date(dataVigencia + "T12:00:00Z"),
      criadoPor:     parseInt(session.user.id),
    },
  })

  logAction({
    companyId,
    userId:  parseInt(session.user.id),
    action:  "efetivo.ancora.alterada",
    before:  { dataAncora: colab.dataAncora },
    after:   { dataAncora, dataVigencia, registroId: registro.id },
  })

  return ok({ id: registro.id, dataAncora, dataVigencia })
})

// GET — lista histórico de âncoras do colaborador
export const GET = withAuthCtx<{ matricula: string }>(async (req, session, params) => {
  const roleErr = assertMinRole(session.user.role, "GESTOR")
  if (roleErr) return roleErr

  const companyId = session.user.companyId

  const colab = await prisma.efetivoColaborador.findFirst({
    where: { companyId, matricula: params.matricula, deletedAt: null },
    select: { id: true },
  })
  if (!colab) return notFound("Colaborador não encontrado.")

  const historico = await prisma.efetivoAncoraHistorico.findMany({
    where:   { colaboradorId: colab.id },
    orderBy: { dataVigencia: "desc" },
    select:  {
      id:           true,
      dataAncora:   true,
      dataVigencia: true,
      createdAt:    true,
      criador:      { select: { name: true } },
    },
  })

  return ok(historico.map((h) => ({
    id:            h.id,
    dataAncora:    h.dataAncora.toISOString().slice(0, 10),
    dataVigencia:  h.dataVigencia.toISOString().slice(0, 10),
    criadoEm:      h.createdAt.toISOString(),
    criadoPorNome: h.criador.name,
  })))
})
