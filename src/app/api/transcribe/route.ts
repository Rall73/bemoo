import OpenAI from "openai"
import { withAuth, badRequest, ok, serverError } from "@/lib/api"

// Lazy singleton — não instanciar no topo (falha no build sem a env var)
let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const MAX_SIZE_MB = 25

// POST /api/transcribe
// Body: FormData com campo "audio" (arquivo de áudio gravado pelo MediaRecorder)
export const POST = withAuth(async (req) => {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return badRequest("Envie o áudio como multipart/form-data.")
  }

  const audio = formData.get("audio") as File | null
  if (!audio) return badRequest("Campo 'audio' obrigatório.")

  if (audio.size > MAX_SIZE_MB * 1024 * 1024) {
    return badRequest(`Áudio muito grande. Máximo ${MAX_SIZE_MB} MB.`)
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer())

    // Detecta extensão correta pelo mimeType do MediaRecorder
    const mime = audio.type || "audio/webm"
    const ext  = mime.includes("mp4") ? "mp4"
               : mime.includes("ogg") ? "ogg"
               : mime.includes("wav") ? "wav"
               : "webm"

    const audioFile = new File([buffer], `audio.${ext}`, { type: mime })

    const response = await getOpenAI().audio.transcriptions.create({
      file:     audioFile,
      model:    "whisper-1",
      language: "pt",
    })

    return ok({ text: response.text })
  } catch (err: any) {
    console.error("[POST /api/transcribe]", err?.message ?? err)
    return serverError("Erro ao transcrever o áudio. Tente novamente.")
  }
})
