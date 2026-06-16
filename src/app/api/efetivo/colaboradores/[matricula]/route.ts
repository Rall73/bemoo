import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, notFound, conflict, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const INCLUDE_FULL = {
  cargo:        { select: { id: true, nome: true } },
  area:         { select: { id: true, nome: true, areaPaiId: true, areaPai: { select: { id: true, nome: true } } } },
  turno:        { select: { id: true, codigo: true, horaInicio: true, horaFim: true, cruzaMeiaNoite: true } },
  padraoEscala: { select: { id: true, nome: true, modo: true, diasTrabalho: true, diasFolga: true } },
  movimentacoes: {
    where:   { deletedAt: null },
    orderBy: { data: "desc" as const },
    select: {
      id:    true,
      tipo:  true,
      data:  true,
      motivo: true,
      createdAt: true,
      registrador: { select: { name: true } },
    },
  },
  ocorrencias: {
    where:   { deletedAt: null },
    orderBy: { data: "desc" as const },
    select: {
      id:        true,
      data:      true,
      descricao: true,
      anexoUrl:  true,
      createdAt: true,
      tipo:        { select: { id: true, nome: true } },
      registrador: { select: { name: true } },
    },
  },
  vinculo: {
    where: { deletedAt: null },
    select: { encarregadoId: true },
  },
}

export const GET = withAuthCtx<{ matricula: string }>(async (_req, session, params) => {
  const colab = await prisma.efetivoColaborador.findFirst({
    where:   { companyId: session.user.companyId, matricula: params.matricula, deletedAt: null },
    include: INCLUDE_FULL,
  })
  if (!colab) return notFound()

  return ok(colab)
})

const zUpdate = z.object({
  nome:          z.string().min(1).max(200).optional(),
  cargoId:       z.number().int().positive().optional(),
  areaId:        z.number().int().positive().optional(),
  turnoId:       z.number().int().positive().optional(),
  padraoEscalaId:z.number().int().positive().optional(),
  dataAncora:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  dataAdmissao:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ocorrencia: z.object({
    tipoId:    z.number().int().positive(),
    data:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    descricao: z.string().min(1),
  }).optional(),
})

export const PATCH = withAuthCtx<{ matricula: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zUpdate)
  if (error) return error

  const colab = await prisma.efetivoColaborador.findFirst({
    where: { companyId: session.user.companyId, matricula: params.matricula, deletedAt: null },
  })
  if (!colab) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, colab.companyId)
  if (tenantError) return tenantError

  const { ocorrencia, ...updateFields } = data

  const updateData: Record<string, unknown> = { ...updateFields }
  if ("dataAncora"   in updateFields) updateData.dataAncora   = updateFields.dataAncora   ? new Date(updateFields.dataAncora)   : null
  if ("dataAdmissao" in updateFields) updateData.dataAdmissao = updateFields.dataAdmissao ? new Date(updateFields.dataAdmissao) : undefined

  const [updated] = await prisma.$transaction(async (tx) => {
    const updatedColab = await tx.efetivoColaborador.update({
      where:   { id: colab.id },
      data:    updateData,
      include: INCLUDE_FULL,
    })

    if (ocorrencia) {
      await tx.efetivoOcorrencia.create({
        data: {
          companyId:     session.user.companyId,
          colaboradorId: colab.id,
          tipoId:        ocorrencia.tipoId,
          data:          new Date(ocorrencia.data),
          descricao:     ocorrencia.descricao,
          registradoPor: parseInt(session.user.id),
        },
      })
    }

    return [updatedColab]
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.colaborador.editado",
    entity:    "EfetivoColaborador",
    entityId:  colab.id,
    before:    colab,
    after:     updated,
  })

  return ok(updated)
})
