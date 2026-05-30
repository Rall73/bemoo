import { withAuth, badRequest, ok, serverError } from "@/lib/api"
import { uploadExecutionPhoto } from "@/lib/cloudinary"

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_SIZE_MB   = 15

// POST /api/upload/checklist — upload de foto durante execução
// Body: FormData com campos: file, executionId, fieldId
export const POST = withAuth(async (req, session) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return badRequest("Formato inválido — envie multipart/form-data.")
  }

  const file        = formData.get("file")        as File | null
  const executionId = formData.get("executionId") as string | null
  const fieldId     = formData.get("fieldId")     as string | null

  if (!file || !executionId || !fieldId) {
    return badRequest("Campos obrigatórios: file, executionId, fieldId.")
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return badRequest("Tipo de arquivo não permitido. Use JPG, PNG ou WEBP.")
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return badRequest(`Arquivo muito grande. Máximo ${MAX_SIZE_MB} MB.`)
  }

  try {
    const buffer   = Buffer.from(await file.arrayBuffer())
    const photoUrl = await uploadExecutionPhoto(
      buffer,
      session.user.companyId,
      parseInt(executionId),
      parseInt(fieldId),
    )
    return ok({ url: photoUrl })
  } catch (err) {
    console.error("[Upload] Erro Cloudinary:", err)
    return serverError("Erro ao fazer upload da foto.")
  }
})
