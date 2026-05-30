import { NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { auth } from "@/auth"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_SIZE_MB   = 15
const ALLOWED_EXT   = ["jpg", "jpeg", "png", "webp", "heic", "heif"]

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 })

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Arquivo maior que ${MAX_SIZE_MB}MB.` }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!ALLOWED_EXT.includes(ext) && !ALLOWED_EXT.some((e) => file.type.includes(e))) {
      return NextResponse.json({ error: "Formato não permitido." }, { status: 400 })
    }

    // Base64 data URI — abordagem simples e confiável (idêntica ao projeto check-list)
    const bytes   = await file.arrayBuffer()
    const base64  = Buffer.from(bytes).toString("base64")
    const dataUri = `data:${file.type || "image/jpeg"};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:        `bemoo/companies/${(session.user as any).companyId}/checklists`,
      resource_type: "image",
    })

    return NextResponse.json({ url: result.secure_url }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/upload]", err)
    return NextResponse.json({ error: "Erro ao enviar a foto." }, { status: 500 })
  }
}
