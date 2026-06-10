import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, badRequest, notFound, forbidden, assertSameCompany } from "@/lib/api"
import { logAction } from "@/lib/audit"
import { getIp } from "@/lib/audit"

const zFieldValue = z.object({
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

const zFinalizar = z.object({
  fieldValues:    z.array(zFieldValue),
  itemNotes:      z.array(zItemNote).optional(),
  conclusionNote: z.string().max(5000).nullable().optional(),
})

// POST /api/execucoes/[id]/finalizar
export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  if (session.user.role === "AUDITOR") return forbidden("Auditores não podem finalizar execuções.")

  const id = parseInt(params.id)
  const { data, error } = await validateBody(req, zFinalizar)
  if (error) return error

  const execution = await prisma.checklistExecution.findFirst({
    where: { id, deletedAt: null },
    include: {
      checklist: {
        include: {
          items: {
            where:   { deletedAt: null },
            orderBy: { order: "asc" },
            include: {
              fields: {
                where:   { deletedAt: null },
                orderBy: { order: "asc" },
                select:  {
                  id:           true,
                  label:        true,
                  type:         true,
                  required:     true,
                  requirePhoto: true,
                  allowNa:      true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  if (execution.status !== "IN_PROGRESS") {
    return badRequest("Esta execução já foi finalizada.")
  }

  const allFields = execution.checklist.items.flatMap((i) => i.fields)
  const submitted = new Map(data.fieldValues.map((fv) => [fv.fieldId, fv]))

  // Valida campos obrigatórios
  for (const field of allFields) {
    if (!field.required) continue
    const val = submitted.get(field.id)
    if (!val) return badRequest(`Campo obrigatório não preenchido: "${field.label}"`)
    if (val.valueNa && field.allowNa) continue

    if (field.type === "OK_NOK" || field.type === "SIM_NAO") {
      if (val.valueOkNok === null || val.valueOkNok === undefined) {
        return badRequest(`Campo obrigatório não preenchido: "${field.label}"`)
      }
    }
    if (field.type === "NUMERIC" && (val.valueNumeric === null || val.valueNumeric === undefined)) {
      return badRequest(`Campo obrigatório não preenchido: "${field.label}"`)
    }
    if (field.type === "TEXT" && !val.valueText?.trim()) {
      return badRequest(`Campo obrigatório não preenchido: "${field.label}"`)
    }
  }

  // Valida foto obrigatória por item (se algum campo do item exige foto)
  const submittedNotes = new Map((data.itemNotes ?? []).map((n) => [n.itemId, n]))
  for (const item of execution.checklist.items) {
    const needsPhoto = item.fields.some((f) => f.requirePhoto)
    if (needsPhoto && !submittedNotes.get(item.id)?.photoUrl) {
      return badRequest(`Foto obrigatória no item: "${item.label}"`)
    }
  }

  // Upsert em transação
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
    prisma.checklistExecution.update({
      where: { id },
      data: {
        status:        "COMPLETED",
        finishedAt:    new Date(),
        conclusionNote: data.conclusionNote ?? null,
      },
    }),
  ])

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "checklist.executado",
    entity:    "checklist_executions",
    entityId:  id,
    ip:        getIp(req),
  })

  return ok({ id })
})
