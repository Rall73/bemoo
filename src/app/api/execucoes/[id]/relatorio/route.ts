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

// Monta URL de download com fl_attachment para forçar download
// IMPORTANTE: não passar nome com ponto no fl_attachment — Cloudinary interpreta
// o ponto como separador de formato e retorna 400. A extensão .docx fica no publicId.
function withDownloadFlag(url: string): string {
  return url.replace("/upload/", "/upload/fl_attachment/")
}

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
            valueNa:       fv.valueNa,
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

    // ── Nome do arquivo ──────────────────────────────────────────────────
    const checklistSlug = execution.checklist.name
      .normalize("NFD").replace(/[̀-ͯ]/g, "")  // remove acentos
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .slice(0, 40)
    const filename = `checklist-${checklistSlug}-${execId}-${data.tipo}.docx`

    // ── Sobe pro Cloudinary ──────────────────────────────────────────────
    // publicId inclui .docx → URL final já tem a extensão correta
    // fl_attachment sem nome customizado usa o publicId como nome do arquivo
    const folder   = `bemoo/companies/${session.user.companyId}/reports`
    const publicId = `execucao-${execId}-${data.tipo}.docx`

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

    // fl_attachment sem nome customizado — extensão vem do publicId (.docx)
    const downloadUrl = withDownloadFlag(uploadResult.secure_url)

    // ── Salva URL na execução (campo separado por tipo) ──────────────────
    await prisma.checklistExecution.update({
      where: { id: execId },
      data: {
        reportGeneratedAt: new Date(),
        ...(data.tipo === "basico"
          ? { reportUrl:   downloadUrl }
          : { reportIaUrl: downloadUrl }),
      },
    })

    return ok({ url: downloadUrl, filename })
  } catch (err) {
    console.error("[POST /api/execucoes/[id]/relatorio]", err)
    return serverError("Erro ao gerar o relatório.")
  }
})
