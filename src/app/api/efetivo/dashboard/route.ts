import { withAuth, ok } from "@/lib/api"
import { prisma }       from "@/lib/prisma"
import { hojeNoBrasil } from "@/lib/date"
import { calculaDia }   from "@/lib/efetivo-escala"

// Verifica se um turno está em andamento no horário atual de Brasília
function ativoAgora(
  turno: { horaInicio: string; horaFim: string; cruzaMeiaNoite: boolean },
  brtTotalMin: number
): boolean {
  const [hi, mi] = turno.horaInicio.split(":").map(Number)
  const [hf, mf] = turno.horaFim.split(":").map(Number)
  const ini = hi * 60 + mi
  const fim = hf * 60 + mf
  return turno.cruzaMeiaNoite
    ? brtTotalMin >= ini || brtTotalMin < fim
    : brtTotalMin >= ini && brtTotalMin < fim
}

export const GET = withAuth(async (_req, session) => {
  const companyId = session.user.companyId
  const hoje      = hojeNoBrasil()

  // Hora atual em Brasília (minutos desde meia-noite)
  const agora      = new Date()
  const brtTotalMin = ((agora.getUTCHours() - 3 + 24) % 24) * 60 + agora.getUTCMinutes()
  const horaAtualBRT = `${String(Math.floor(brtTotalMin / 60)).padStart(2, "0")}:${String(brtTotalMin % 60).padStart(2, "0")}`

  const [colabs, eventosHoje, turnos] = await Promise.all([
    prisma.efetivoColaborador.findMany({
      where:  { companyId, status: "ATIVO", deletedAt: null },
      select: {
        id:         true,
        matricula:  true,
        nome:       true,
        dataAncora: true,
        padraoEscala: {
          select: { modo: true, diasSemana: true, diasTrabalho: true, diasFolga: true },
        },
        turno: { select: { id: true, codigo: true, horaInicio: true, horaFim: true, cruzaMeiaNoite: true } },
        area:  { select: { id: true, nome: true } },
      },
      orderBy: [{ area: { nome: "asc" } }, { turno: { codigo: "asc" } }, { nome: "asc" }],
    }),
    prisma.efetivoEvento.findMany({
      where: {
        companyId,
        deletedAt:  null,
        dataInicio: { lte: hoje },
        dataFim:    { gte: hoje },
      },
      select: {
        id:            true,
        colaboradorId: true,
        tipo:          true,
        dataInicio:    true,
        dataFim:       true,
        observacao:    true,
      },
    }),
    prisma.efetivoTurno.findMany({
      where:   { companyId, deletedAt: null, ativo: true },
      select:  { id: true, codigo: true, horaInicio: true, horaFim: true, cruzaMeiaNoite: true },
      orderBy: { codigo: "asc" },
    }),
  ])

  // Mapeia eventos por colaborador
  const evMap = new Map<number, { tipo: string; dataInicio: Date; dataFim: Date }[]>()
  const evPorColab = new Map<number, typeof eventosHoje[0]>()
  for (const ev of eventosHoje) {
    const list = evMap.get(ev.colaboradorId) ?? []
    list.push({ tipo: ev.tipo, dataInicio: ev.dataInicio, dataFim: ev.dataFim })
    evMap.set(ev.colaboradorId, list)
    // Guarda o primeiro evento de hoje por colaborador (para exibir na chamada)
    if (!evPorColab.has(ev.colaboradorId)) evPorColab.set(ev.colaboradorId, ev)
  }

  // Calcula status de hoje para cada colaborador
  const colabsHoje = colabs.map((c) => {
    const statusHoje = calculaDia(c.padraoEscala, c.dataAncora, hoje, evMap.get(c.id) ?? [])
    const ev         = evPorColab.get(c.id) ?? null
    return {
      id:        c.id,
      matricula: c.matricula,
      nome:      c.nome,
      turno:     c.turno,
      area:      c.area,
      statusHoje,
      eventoHoje: ev
        ? {
            id:         ev.id,
            tipo:       ev.tipo,
            dataInicio: ev.dataInicio.toISOString().slice(0, 10),
            dataFim:    ev.dataFim.toISOString().slice(0, 10),
            observacao: ev.observacao,
          }
        : null,
    }
  })

  // Contagens por status
  const contagem: Record<string, number> = {}
  for (const c of colabsHoje) {
    contagem[c.statusHoje] = (contagem[c.statusHoje] ?? 0) + 1
  }

  // Turnos com headcount de hoje
  const turnosComCount = turnos.map((t) => {
    const trabalha = colabsHoje.filter((c) => c.turno.id === t.id && c.statusHoje === "TRABALHA").length
    const ausentes  = colabsHoje.filter((c) => c.turno.id === t.id && c.eventoHoje !== null && c.statusHoje !== "TRABALHA" && c.statusHoje !== "FOLGA").length
    return {
      ...t,
      ativoAgora: ativoAgora(t, brtTotalMin),
      trabalha,
      ausentes,
    }
  })

  return ok({
    hojeISO:      hoje.toISOString().slice(0, 10),
    horaAtualBRT,
    contagem: {
      trabalha:            contagem["TRABALHA"]           ?? 0,
      folga:               (contagem["FOLGA"]             ?? 0)
                         + (contagem["FOLGA_DOMINICAL"]   ?? 0)
                         + (contagem["FOLGA_FERIADO"]     ?? 0),
      ferias:              contagem["FERIAS"]             ?? 0,
      atestado:            contagem["ATESTADO"]           ?? 0,
      afastamentoInss:     contagem["AFASTAMENTO_INSS"]  ?? 0,
      faltaJustificada:    contagem["FALTA_JUSTIFICADA"]  ?? 0,
      faltaInjustificada:  contagem["FALTA_INJUSTIFICADA"] ?? 0,
      total:               colabsHoje.length,
    },
    turnos:        turnosComCount,
    colaboradores: colabsHoje,
  })
})
