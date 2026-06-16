import { z }                               from "zod"
import { withAuth, validateBody, created, notFound, badRequest, assertSameCompany } from "@/lib/api"
import { prisma }                          from "@/lib/prisma"
import { logAction, getIp }               from "@/lib/audit"
import { parseDataLocal }                  from "@/lib/date"

const zEvento = z.object({
  colaboradorId: z.number().int().positive(),
  tipo: z.enum([
    "FERIAS",
    "FOLGA_FERIADO",
    "FOLGA_DOMINICAL",
    "ATESTADO",
    "AFASTAMENTO_INSS",
    "FALTA_JUSTIFICADA",
    "FALTA_INJUSTIFICADA",
    "ATRASO",
    "SAIDA_ANTECIPADA",
    "HORA_EXTRA",
    "TROCA_TURNO_SAIDA",
    "TROCA_TURNO_ENTRADA",
  ]),
  dataInicio:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaAjuste:  z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  observacao:  z.string().max(500).nullable().optional(),
})

export const POST = withAuth(async (req, session) => {
  const { data, error } = await validateBody(req, zEvento)
  if (error) return error

  if (data.dataFim < data.dataInicio) {
    return badRequest("Data fim deve ser igual ou posterior à data início.")
  }

  const colab = await prisma.efetivoColaborador.findFirst({
    where:  { id: data.colaboradorId, deletedAt: null },
    select: { id: true, companyId: true },
  })
  if (!colab) return notFound("Colaborador não encontrado.")

  const tenantErr = assertSameCompany(session.user.companyId, colab.companyId)
  if (tenantErr) return tenantErr

  const evento = await prisma.efetivoEvento.create({
    data: {
      companyId:     session.user.companyId,
      colaboradorId: data.colaboradorId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tipo:          data.tipo as any,
      dataInicio:    parseDataLocal(data.dataInicio),
      dataFim:       parseDataLocal(data.dataFim),
      horaAjuste:    data.horaAjuste ?? null,
      observacao:    data.observacao ?? null,
      criadoPor:     parseInt(session.user.id),
    },
    select: { id: true, tipo: true, dataInicio: true, dataFim: true },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.evento.criado",
    entity:    "EfetivoEvento",
    entityId:  evento.id,
    after:     data,
    ip:        getIp(req),
  })

  return created({
    ...evento,
    dataInicio: evento.dataInicio.toISOString().slice(0, 10),
    dataFim:    evento.dataFim.toISOString().slice(0, 10),
  })
})
