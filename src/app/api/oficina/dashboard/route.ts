import { prisma } from "@/lib/prisma"
import { withAuth, ok } from "@/lib/api"
import { inicioMesNoBrasil } from "@/lib/date"

export const GET = withAuth(async (_req, session) => {
  const companyId = session.user.companyId
  const inicioMes = inicioMesNoBrasil()

  const [
    porStatus,
    totalMes,
    concluidosMes,
    leadTimeMes,
    consumoEsgMes,
    estoqueBaixo,
  ] = await Promise.all([
    // Contagem por status (pedidos ativos)
    prisma.workshopServiceOrder.groupBy({
      by:    ["status"],
      where: { companyId, deletedAt: null },
      _count: true,
    }),

    // Total de pedidos no mês
    prisma.workshopServiceOrder.count({
      where: { companyId, deletedAt: null, createdAt: { gte: inicioMes } },
    }),

    // Concluídos no mês
    prisma.workshopServiceOrder.count({
      where: {
        companyId,
        deletedAt:  null,
        status:     "CONCLUIDO",
        finishedAt: { gte: inicioMes },
      },
    }),

    // Lead time médio (dias) dos pedidos concluídos no mês com startedAt
    prisma.workshopServiceOrder.findMany({
      where: {
        companyId,
        deletedAt:  null,
        status:     "CONCLUIDO",
        finishedAt: { gte: inicioMes },
        startedAt:  { not: null },
      },
      select: { startedAt: true, finishedAt: true },
    }),

    // Consumo ESG no mês: total de material reciclado (kg/unidades)
    prisma.workshopMaterialConsumption.aggregate({
      where: {
        order:    { companyId, deletedAt: null },
        source:   "RECICLADO",
        deletedAt: null,
        createdAt: { gte: inicioMes },
      },
      _sum: { quantity: true },
    }),

    // Materiais abaixo do estoque mínimo
    prisma.workshopMaterial.findMany({
      where: {
        companyId,
        deletedAt: null,
        active:    true,
      },
      select: { id: true, name: true, unit: true, quantity: true, minQuantity: true },
    }),
  ])

  // Calcula lead time médio
  const leadTimes = leadTimeMes
    .filter((p) => p.startedAt && p.finishedAt)
    .map((p) => (p.finishedAt!.getTime() - p.startedAt!.getTime()) / (1000 * 60 * 60 * 24))
  const leadTimeMediaDias =
    leadTimes.length > 0
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
      : null

  // Backlog: pedidos que não estão concluídos nem cancelados
  const statusAtivos = porStatus
    .filter((s) => s.status !== "CONCLUIDO" && s.status !== "CANCELADO")
    .reduce((acc, s) => acc + s._count, 0)

  // Materiais em alerta
  const materiaisAlerta = estoqueBaixo.filter(
    (m) => Number(m.quantity) <= Number(m.minQuantity)
  )

  return ok({
    porStatus:           porStatus.map((s) => ({ status: s.status, total: s._count })),
    totalMes,
    concluidosMes,
    backlog:             statusAtivos,
    leadTimeMediaDias,
    reciclado:           Number(consumoEsgMes._sum.quantity ?? 0),
    materiaisAlerta,
  })
})
