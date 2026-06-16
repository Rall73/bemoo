import { z }              from "zod"
import { withAuth, validateBody, ok, assertMinRole } from "@/lib/api"
import { prisma }         from "@/lib/prisma"
import { logAction, getIp } from "@/lib/audit"
import { parseMes, diasDoMes, calculaDia } from "@/lib/efetivo-escala"

const zPublicar = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/, "Formato esperado: YYYY-MM"),
})

export const POST = withAuth(async (req, session) => {
  const roleErr = assertMinRole(session.user.role, "GESTOR")
  if (roleErr) return roleErr

  const { data, error } = await validateBody(req, zPublicar)
  if (error) return error

  const { mes } = data
  const companyId = session.user.companyId
  const userId    = parseInt(session.user.id)

  const { ano, mesNum } = parseMes(mes)
  const diasDates = diasDoMes(ano, mesNum)
  const inicioMes = diasDates[0]
  const fimMes    = diasDates[diasDates.length - 1]

  // Carrega todos colaboradores ativos + eventos do mês
  const [colaboradores, eventos] = await Promise.all([
    prisma.efetivoColaborador.findMany({
      where:  { companyId, status: "ATIVO", deletedAt: null },
      select: {
        id:        true,
        turnoId:   true,
        dataAncora: true,
        padraoEscala: {
          select: { modo: true, diasSemana: true, diasTrabalho: true, diasFolga: true },
        },
      },
    }),
    prisma.efetivoEvento.findMany({
      where: {
        companyId,
        deletedAt:  null,
        dataInicio: { lte: fimMes },
        dataFim:    { gte: inicioMes },
      },
      select: { colaboradorId: true, tipo: true, dataInicio: true, dataFim: true },
    }),
  ])

  const evMap = new Map<number, { tipo: string; dataInicio: Date; dataFim: Date }[]>()
  for (const ev of eventos) {
    const list = evMap.get(ev.colaboradorId) ?? []
    list.push({ tipo: ev.tipo, dataInicio: ev.dataInicio, dataFim: ev.dataFim })
    evMap.set(ev.colaboradorId, list)
  }

  // Gera linhas: um registro por (colaborador × dia)
  type Linha = {
    colaboradorId: number
    data:          Date
    turnoId:       number
    status:        string
  }
  const linhas: Linha[] = []
  for (const c of colaboradores) {
    const evs = evMap.get(c.id) ?? []
    for (const d of diasDates) {
      linhas.push({
        colaboradorId: c.id,
        data:          d,
        turnoId:       c.turnoId,
        status:        calculaDia(c.padraoEscala, c.dataAncora, d, evs),
      })
    }
  }

  // Salva atomicamente: apaga snapshot anterior (se existir) e cria novo
  const snapshot = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.efetivoSnapshot.findUnique({
        where: { companyId_mes: { companyId, mes } },
      })
      if (existing) {
        await tx.efetivoEscalaPublicada.deleteMany({ where: { snapshotId: existing.id } })
        await tx.efetivoSnapshot.delete({ where: { id: existing.id } })
      }

      const snap = await tx.efetivoSnapshot.create({
        data: { companyId, mes, publicadoPor: userId },
      })

      await tx.efetivoEscalaPublicada.createMany({
        data: linhas.map((l) => ({ snapshotId: snap.id, ...l })),
      })

      return snap
    },
    { timeout: 30_000 }
  )

  logAction({
    companyId,
    userId,
    action:   "efetivo.escala.publicada",
    entity:   "EfetivoSnapshot",
    entityId: snapshot.id,
    after:    { mes, totalLinhas: linhas.length },
    ip:       getIp(req),
  })

  return ok({
    id:          snapshot.id,
    mes:         snapshot.mes,
    publicadoEm: snapshot.publicadoEm.toISOString(),
    totalLinhas: linhas.length,
  })
})
