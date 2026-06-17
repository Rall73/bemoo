import { withAuth, ok } from "@/lib/api"
import { prisma }       from "@/lib/prisma"
import { hojeNoBrasil } from "@/lib/date"
import { parseMes, diasDoMes, calculaDia, diaSemanaAbrev } from "@/lib/efetivo-escala"

// Resolve a dataAncora efetiva para um dia `d` respeitando o histórico de alterações.
// O histórico deve estar ordenado por dataVigencia crescente.
function resolveAncora(
  base: Date | null,
  historico: { dataAncora: Date; dataVigencia: Date }[],
  d: Date
): Date | null {
  let ancora = base
  for (const h of historico) {
    if (h.dataVigencia.getTime() <= d.getTime()) ancora = h.dataAncora
  }
  return ancora
}

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url)

  const hoje = hojeNoBrasil()
  const mesPadrao = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`
  const mes = searchParams.get("mes") ?? mesPadrao

  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return ok({ mes, dias: [], diasSemana: [], colaboradores: [], eventos: [], snapshot: null })
  }

  const turnoIdParam = searchParams.get("turnoId")
  const areaIdParam  = searchParams.get("areaId")
  const turnoId      = turnoIdParam ? parseInt(turnoIdParam) : undefined
  const areaId       = areaIdParam  ? parseInt(areaIdParam)  : undefined
  const companyId    = session.user.companyId

  const { ano, mesNum } = parseMes(mes)
  const diasDates = diasDoMes(ano, mesNum)
  const inicioMes = diasDates[0]
  const fimMes    = diasDates[diasDates.length - 1]

  const [colaboradores, eventos, snapshot] = await Promise.all([
    prisma.efetivoColaborador.findMany({
      where: {
        companyId,
        status:    "ATIVO",
        deletedAt: null,
        ...(turnoId ? { turnoId } : {}),
        ...(areaId  ? { areaId }  : {}),
      },
      select: {
        id:         true,
        matricula:  true,
        nome:       true,
        dataAncora: true,
        padraoEscala: {
          select: { modo: true, diasSemana: true, diasTrabalho: true, diasFolga: true },
        },
        turno: { select: { id: true, codigo: true } },
        area:  { select: { id: true, nome: true } },
      },
      orderBy: [{ area: { nome: "asc" } }, { turno: { codigo: "asc" } }, { nome: "asc" }],
    }),
    prisma.efetivoEvento.findMany({
      where: {
        companyId,
        deletedAt:  null,
        dataInicio: { lte: fimMes },
        dataFim:    { gte: inicioMes },
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
    prisma.efetivoSnapshot.findFirst({
      where:  { companyId, mes },
      select: { mes: true, publicadoEm: true },
    }),
  ])

  // Carrega histórico de âncoras para resolver a âncora correta por dia (sem retroatividade)
  const ancoraMap = new Map<number, { dataAncora: Date; dataVigencia: Date }[]>()
  const ancoraHistorico = await prisma.efetivoAncoraHistorico.findMany({
    where:   { companyId, colaboradorId: { in: colaboradores.map((c) => c.id) } },
    select:  { colaboradorId: true, dataAncora: true, dataVigencia: true },
    orderBy: { dataVigencia: "asc" },
  })
  for (const h of ancoraHistorico) {
    const list = ancoraMap.get(h.colaboradorId) ?? []
    list.push({ dataAncora: h.dataAncora, dataVigencia: h.dataVigencia })
    ancoraMap.set(h.colaboradorId, list)
  }

  // Agrupar eventos por colaborador para busca O(1) no cálculo
  const evMap = new Map<number, { tipo: string; dataInicio: Date; dataFim: Date }[]>()
  for (const ev of eventos) {
    const list = evMap.get(ev.colaboradorId) ?? []
    list.push({ tipo: ev.tipo, dataInicio: ev.dataInicio, dataFim: ev.dataFim })
    evMap.set(ev.colaboradorId, list)
  }

  const resultColabs = colaboradores.map((c) => ({
    id:        c.id,
    matricula: c.matricula,
    nome:      c.nome,
    turno:     c.turno,
    area:      c.area,
    escala:    Object.fromEntries(
      diasDates.map((d) => [
        d.getUTCDate(),
        calculaDia(
          c.padraoEscala,
          resolveAncora(c.dataAncora, ancoraMap.get(c.id) ?? [], d),
          d,
          evMap.get(c.id) ?? []
        ),
      ])
    ),
  }))

  return ok({
    mes,
    dias:          diasDates.map((d) => d.getUTCDate()),
    diasSemana:    diasDates.map(diaSemanaAbrev),
    colaboradores: resultColabs,
    eventos: eventos.map((ev) => ({
      id:            ev.id,
      colaboradorId: ev.colaboradorId,
      tipo:          ev.tipo,
      dataInicio:    ev.dataInicio.toISOString().slice(0, 10),
      dataFim:       ev.dataFim.toISOString().slice(0, 10),
      observacao:    ev.observacao,
    })),
    snapshot: snapshot
      ? { mes: snapshot.mes, publicadoEm: snapshot.publicadoEm.toISOString() }
      : null,
  })
})
