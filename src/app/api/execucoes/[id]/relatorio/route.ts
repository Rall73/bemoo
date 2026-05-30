import { z } from "zod"
import { v2 as cloudinary } from "cloudinary"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, notFound, assertSameCompany, serverError } from "@/lib/api"
import { gerarRelatorioDocx, type ReportData } from "@/lib/reportDocx"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const zBody = z.object({
  tipo:    z.enum(["basico", "ia"]),
  analise: z.string().optional(),   // obrigatório quando tipo = "ia"
})

// POST /api/execucoes/[id]/relatorio
export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const execId = parseInt(params.id)
  const { data, error } = await validateBody(req, zBody)
  if (error) return error

  const execution = await prisma.checklistExecution.findFirst({
    where: { id: execId, deletedAt: null },
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
              },
            },
          },
        },
      },
      executor:    { select: { name: true } },
      company:     { select: { name: true } },
      fieldValues: true,
    },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  // ── Monta ReportData ────────────────────────────────────────────────────
  const valueMap = new Map(execution.fieldValues.map((fv) => [fv.fieldId, fv]))

  const reportData: ReportData = {
    checklistName:        execution.checklist.name,
    checklistDescription: execution.checklist.description,
    executorName:         execution.executor.name,
    companyName:          execution.company.name,
    startedAt:            execution.startedAt,
    finishedAt:           execution.finishedAt,
    conclusionNote:       execution.conclusionNote,
    sections: execution.checklist.items.map((item) => ({
      label: item.label,
      fields: item.fields.map((field) => {
        const fv = valueMap.get(field.id)
        return {
          id:    field.id,
          label: field.label,
          type:  field.type as any,
          unit:  field.unit,
          value: fv ? {
            valueOkNok:    fv.valueOkNok,
            valueNumeric:  fv.valueNumeric != null ? Number(fv.valueNumeric) : null,
            valueText:     fv.valueText,
            photoUrl:      fv.photoUrl,
            annotation:    fv.annotation,
            transcription: fv.transcription,
          } : null,
        }
      }),
    })),
  }

  try {
    // ── Gera DOCX ────────────────────────────────────────────────────────
    const buffer = await gerarRelatorioDocx(reportData, data.tipo === "ia" ? data.analise : undefined)

    // ── Sobe pro Cloudinary ──────────────────────────────────────────────
    const folder    = `bemoo/companies/${session.user.companyId}/reports`
    const publicId  = `execucao-${execId}-${data.tipo}`
    const filename  = `checklist-${execution.checklist.name.replace(/\s+/g, "-").toLowerCase()}-${execId}.docx`

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, resource_type: "raw", overwrite: true },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error("Upload falhou"))
          resolve(res as { secure_url: string })
        },
      )
      stream.end(buffer)
    })

    // ── Salva URL na execução ────────────────────────────────────────────
    await prisma.checklistExecution.update({
      where: { id: execId },
      data:  { reportUrl: uploadResult.secure_url, reportGeneratedAt: new Date() },
    })

    return ok({ url: uploadResult.secure_url, filename })
  } catch (err) {
    console.error("[POST /api/execucoes/[id]/relatorio]", err)
    return serverError("Erro ao gerar o relatório.")
  }
})
