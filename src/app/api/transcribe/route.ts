import OpenAI from "openai"
import { withAuth, badRequest, ok, serverError } from "@/lib/api"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_SIZE_MB   = 25 // limite do Whisper
const ALLOWED_TYPES = [
  "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg",
  "audio/wav", "audio/x-m4a", "audio/mp3",
]

// POST /api/transcribe
// Body: FormData com campo "audio" (arquivo de áudio)
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

  // Whisper aceita vários formatos — converte o File para o formato esperado
  const buffer = Buffer.from(await audio.arrayBuffer())

  // Cria um File com extensão correta para o Whisper
  const ext      = audio.type.includes("ogg") ? "ogg"
                 : audio.type.includes("mp4") || audio.type.includes("m4a") ? "mp4"
                 : audio.type.includes("wav") ? "wav"
                 : "webm"
  const audioFile = new File([buffer], `audio.${ext}`, { type: audio.type || "audio/webm" })

  try {
    const response = await openai.audio.transcriptions.create({
      file:     audioFile,
      model:    "whisper-1",
      language: "pt",   // português — melhora muito a precisão
    })

    return ok({ text: response.text })
  } catch (err: any) {
    console.error("[Transcribe] Erro Whisper:", err?.message ?? err)
    return serverError("Erro ao transcrever o áudio. Tente novamente.")
  }
})
