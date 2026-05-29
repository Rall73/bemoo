import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ─── Helpers de public_id ─────────────────────────────────────────

/**
 * Extrai o public_id de uma URL do Cloudinary.
 * Ex.: "https://res.cloudinary.com/dxuofx3i/image/upload/v123/bemoo/companies/1/checklists/executions/5/item-3.webp"
 * → "bemoo/companies/1/checklists/executions/5/item-3"
 */
export function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// ─── Upload ───────────────────────────────────────────────────────

/**
 * Faz upload de uma foto de item de execução.
 * Retorna a URL segura (https).
 */
export async function uploadExecutionPhoto(
  buffer:      Buffer,
  companyId:   number,
  executionId: number,
  itemId:      number,
): Promise<string> {
  const folder    = `bemoo/companies/${companyId}/checklists/executions/${executionId}`
  const publicId  = `item-${itemId}`

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     publicId,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        resource_type: "image",
        overwrite:     true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload falhou"))
        resolve(result.secure_url)
      },
    )
    stream.end(buffer)
  })
}

/**
 * Faz upload de um relatório .docx.
 * Retorna a URL segura (https).
 */
export async function uploadExecutionReport(
  buffer:      Buffer,
  companyId:   number,
  executionId: number,
): Promise<string> {
  const folder   = `bemoo/companies/${companyId}/reports`
  const publicId = `execution-${executionId}`

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     publicId,
        resource_type: "raw",   // raw = qualquer formato (não-imagem)
        overwrite:     true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload falhou"))
        resolve(result.secure_url)
      },
    )
    stream.end(buffer)
  })
}

// ─── Deleção ──────────────────────────────────────────────────────

/**
 * Deleta um arquivo do Cloudinary a partir da URL salva no banco.
 * Fire-and-forget: nunca lança — loga o erro se falhar.
 */
export async function deleteByUrl(
  url:          string,
  resourceType: "image" | "raw" = "image",
): Promise<void> {
  try {
    const publicId = extractPublicId(url)
    if (!publicId) return
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (err) {
    console.error("[Cloudinary] Falha ao deletar arquivo:", err)
  }
}

/**
 * Deleta todos os arquivos de uma execução (fotos + relatório).
 * Chamado no soft delete da execução.
 */
export async function deleteExecutionFiles(params: {
  photoUrls: (string | null)[]
  reportUrl: string | null
}): Promise<void> {
  const jobs: Promise<void>[] = []

  for (const url of params.photoUrls) {
    if (url) jobs.push(deleteByUrl(url, "image"))
  }
  if (params.reportUrl) {
    jobs.push(deleteByUrl(params.reportUrl, "raw"))
  }

  await Promise.allSettled(jobs)  // nunca rejeita — erros individuais são logados
}
