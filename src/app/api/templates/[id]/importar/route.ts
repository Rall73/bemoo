import { prisma } from "@/lib/prisma"
import { withAuthCtx, assertMinRole, notFound, created } from "@/lib/api"
import { logAction, getIp } from "@/lib/audit"

// POST /api/templates/[id]/importar — clona o template para a empresa do usuário
export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const templateId = parseInt(params.id)

  // Busca o template com todos os itens e campos
  const template = await prisma.checklist.findFirst({
    where:   { id: templateId, isTemplate: true, active: true, deletedAt: null },
    include: {
      items: {
        where:   { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          fields: {
            where:   { deletedAt: null },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  })

  if (!template) return notFound("Template não encontrado.")

  // Clona em transação: checklist → itens → campos
  const clone = await prisma.$transaction(async (tx) => {
    const newChecklist = await tx.checklist.create({
      data: {
        companyId:      session.user.companyId,
        name:           template.name,
        description:    template.description,
        active:         true,
        isTemplate:     false,
        templateSource: template.templateSource,
        createdBy:      parseInt(session.user.id),
      },
    })

    for (const item of template.items) {
      const newItem = await tx.checklistItem.create({
        data: {
          checklistId: newChecklist.id,
          label:       item.label,
          description: item.description,
          order:       item.order,
        },
      })

      for (const field of item.fields) {
        await tx.checklistItemField.create({
          data: {
            itemId:          newItem.id,
            label:           field.label,
            type:            field.type,
            unit:            field.unit,
            required:        field.required,
            requirePhoto:    field.requirePhoto,
            reference:       field.reference,
            referenceSource: field.referenceSource,
            allowNa:         field.allowNa,
            order:           field.order,
          },
        })
      }
    }

    return newChecklist
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "checklist.importado_template",
    entity:    "checklists",
    entityId:  clone.id,
    ip:        getIp(req),
  })

  return created({ id: clone.id })
})
