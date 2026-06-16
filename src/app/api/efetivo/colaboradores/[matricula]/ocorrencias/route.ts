import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, created, notFound, assertSameCompany } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zOcorrencia = z.object({
  tipoId:    z.number().int().positive(),
  data:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().min(1).max(2000),
  anexoUrl:  z.string().url().max(500).optional().nullable(),
})

export const POST = withAuthCtx<{ matricula: string }>(async (req, session, params) => {
  const { data, error } = await validateBody(req, zOcorrencia)
  if (error) return error

  const colab = await prisma.efetivoColaborador.findFirst({
    where: { companyId: session.user.companyId, matricula: params.matricula, deletedAt: null },
  })
  if (!colab) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, colab.companyId)
  if (tenantError) return tenantError

  const ocorrencia = await prisma.efetivoOcorrencia.create({
    data: {
      companyId:     session.user.companyId,
      colaboradorId: colab.id,
      tipoId:        data.tipoId,
      data:          new Date(data.data),
      descricao:     data.descricao,
      anexoUrl:      data.anexoUrl ?? null,
      registradoPor: parseInt(session.user.id),
    },
    select: {
      id: true, data: true, descricao: true, anexoUrl: true, createdAt: true,
      tipo:        { select: { id: true, nome: true } },
      registrador: { select: { name: true } },
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.ocorrencia.criada",
    entity:    "EfetivoOcorrencia",
    entityId:  ocorrencia.id,
    after:     ocorrencia,
  })

  return created(ocorrencia)
})
