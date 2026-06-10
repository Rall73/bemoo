import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, badRequest, notFound, forbidden, assertSameCompany } from "@/lib/api"

const zFieldValuePartial = z.object({
  fieldId:      z.number().int().positive(),
  valueOkNok:   z.boolean().nullable().optional(),
  valueNumeric: z.number().nullable().optional(),
  valueText:    z.string().max(2000).nullable().optional(),
  valueNa:      z.boolean().optional(),
})

const zItemNote = z.object({
  itemId:        z.number().int().positive(),
  photoUrl:      z.string().url().nullable().optional(),
  annotation:    z.string().max(2000).nullable().optional(),
  transcription: z.string().max(5000).nullable().optional(),
})

const zSalvar = z.object({
  fieldValues: z.array(zFieldValuePartial),
  itemNotes:   z.array(zItemNote).optional(),
})

// POST /api/execucoes/[id]/salvar — salva progresso parcial sem finalizar
export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  if (session.user.role === "AUDITOR") return forbidden("Auditores não podem salvar execuções.")

  const id = parseInt(params.id)
  const { data, error } = await validateBody(req, zSalvar)
  if (error) return error

  const execution = await prisma.checklistExecution.findFirst({
    where: { id, deletedAt: null },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  if (execution.status !== "IN_PROGRESS") return badRequest("Execução já finalizada.")

  await prisma.$transaction([
    ...data.fieldValues.map((fv) =>
      prisma.executionFieldValue.upsert({
        where:  { executionId_fieldId: { executionId: id, fieldId: fv.fieldId } },
        create: {
          executionId:  id,
          fieldId:      fv.fieldId,
          valueOkNok:   fv.valueNa ? null : (fv.valueOkNok ?? null),
          valueNumeric: fv.valueNa ? null : (fv.valueNumeric != null ? fv.valueNumeric : null),
          valueText:    fv.valueNa ? null : (fv.valueText ?? null),
          valueNa:      fv.valueNa ?? false,
        },
        update: {
          valueOkNok:   fv.valueNa ? null : (fv.valueOkNok ?? null),
          valueNumeric: fv.valueNa ? null : (fv.valueNumeric != null ? fv.valueNumeric : null),
          valueText:    fv.valueNa ? null : (fv.valueText ?? null),
          valueNa:      fv.valueNa ?? false,
        },
      })
    ),
    ...(data.itemNotes ?? []).map((note) =>
      prisma.executionItemNote.upsert({
        where:  { executionId_itemId: { executionId: id, itemId: note.itemId } },
        create: {
          executionId:   id,
          itemId:        note.itemId,
          photoUrl:      note.photoUrl      ?? null,
          annotation:    note.annotation    ?? null,
          transcription: note.transcription ?? null,
        },
        update: {
          photoUrl:      note.photoUrl      ?? null,
          annotation:    note.annotation    ?? null,
          transcription: note.transcription ?? null,
        },
      })
    ),
  ])

  return ok({ id })
})
