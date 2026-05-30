import { v2 as cloudinary } from "cloudinary"
import { withAuth, badRequest, ok, serverError } from "@/lib/api"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"]
const MAX_SIZE_MB  = 15

// POST /api/upload/checklist — upload de foto durante execução
// Body: FormData com: file, executionId, fieldId
export const POST = withAuth(async (req, session) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return badRequest("Envie como multipart/form-data.")
  }

  const file = formData.get("file") as File | null
  if (!file) return badRequest("Campo 'file' obrigatório.")

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return badRequest(`Arquivo maior que ${MAX_SIZE_MB} MB.`)
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (!ALLOWED_EXT.includes(ext) && !ALLOWED_EXT.some((e) => file.type.includes(e))) {
    return badRequest("Formato não permitido. Use JPG, PNG, WEBP ou HEIC.")
  }

  try {
    // Usa base64 data URI — abordagem mais simples e confiável no servidor
    const bytes   = await file.arrayBuffer()
    const base64  = Buffer.from(bytes).toString("base64")
    const dataUri = `data:${file.type || "image/jpeg"};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        `bemoo/companies/${session.user.companyId}/checklists`,
      resource_type: "image",
    })

    return ok({ url: result.secure_url })
  } catch (err) {
    console.error("[POST /api/upload/checklist]", err)
    return serverError("Erro ao enviar a foto.")
  }
})
