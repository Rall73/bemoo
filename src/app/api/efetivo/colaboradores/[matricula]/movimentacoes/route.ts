import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, ok, notFound, badRequest, assertSameCompany, assertMinRole } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zMovimentacao = z.object({
  tipo:   z.enum(["DESLIGAMENTO", "READMISSAO"]),
  data:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo: z.string().max(1000).optional().nullable(),
})

export const POST = withAuthCtx<{ matricula: string }>(async (req, session, params) => {
  const roleError = assertMinRole(session.user.role, "GESTOR")
  if (roleError) return roleError

  const { data, error } = await validateBody(req, zMovimentacao)
  if (error) return error

  const colab = await prisma.efetivoColaborador.findFirst({
    where: { companyId: session.user.companyId, matricula: params.matricula, deletedAt: null },
  })
  if (!colab) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, colab.companyId)
  if (tenantError) return tenantError

  if (data.tipo === "DESLIGAMENTO" && colab.status !== "ATIVO")
    return badRequest("Só é possível desligar um colaborador ativo.")
  if (data.tipo === "READMISSAO" && colab.status !== "DESLIGADO")
    return badRequest("Só é possível readmitir um colaborador desligado.")

  const dataEfetiva = new Date(data.data)

  const [movimentacao] = await prisma.$transaction(async (tx) => {
    const mov = await tx.efetivoMovimentacaoVinculo.create({
      data: {
        companyId:     session.user.companyId,
        colaboradorId: colab.id,
        tipo:          data.tipo,
        data:          dataEfetiva,
        motivo:        data.motivo ?? null,
        registradoPor: parseInt(session.user.id),
      },
      select: {
        id: true, tipo: true, data: true, motivo: true, createdAt: true,
        registrador: { select: { name: true } },
      },
    })

    const updateStatus =
      data.tipo === "DESLIGAMENTO"
        ? { status: "DESLIGADO" as const, dataDesligamento: dataEfetiva }
        : { status: "ATIVO"     as const, dataDesligamento: null }

    await tx.efetivoColaborador.update({
      where: { id: colab.id },
      data:  updateStatus,
    })

    return [mov]
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "efetivo.movimentacao.criada",
    entity:    "EfetivoMovimentacaoVinculo",
    entityId:  movimentacao.id,
    after:     movimentacao,
  })

  return ok({ movimentacao, novoStatus: data.tipo === "DESLIGAMENTO" ? "DESLIGADO" : "ATIVO" })
})
