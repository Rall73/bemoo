import { prisma } from "@/lib/prisma"
import { validateBody, created, badRequest, serverError } from "@/lib/api"
import { zCadastroSchema } from "@/lib/validators"
import { sendMail } from "@/lib/mailer"
import { emailBoasVindas } from "@/emails/boas-vindas"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const { data, error } = await validateBody(req, zCadastroSchema)
  if (error) return error

  // Verificar e-mail único
  const exists = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  })
  if (exists) {
    return badRequest("Este e-mail já está cadastrado.", { email: ["E-mail já em uso"] })
  }

  // Criar empresa + usuário em transação
  const hash = await bcrypt.hash(data.password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name:  data.empresa,
        email: data.email,
        plan:  "FREE",
      },
    })

    return tx.user.create({
      data: {
        companyId:     company.id,
        name:          data.empresa, // nome inicial = nome da empresa; usuário atualiza no onboarding
        email:         data.email,
        password:      hash,
        role:          "ADMIN",
        platformAdmin: false,
      },
      select: {
        id:      true,
        name:    true,
        email:   true,
        company: { select: { name: true } },
      },
    })
  })

  // Enviar boas-vindas (sem bloquear a resposta)
  sendMail({
    to:      user.email,
    ...emailBoasVindas({ nome: user.name, empresa: user.company.name }),
  }).catch((err) => console.error("[Mailer] Falha ao enviar boas-vindas:", err))

  return created({ id: user.id, email: user.email })
}
