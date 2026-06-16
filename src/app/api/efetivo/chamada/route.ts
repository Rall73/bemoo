import { withAuth, ok }    from "@/lib/api"
import { prisma }          from "@/lib/prisma"
import { hojeNoBrasil, parseDataLocal } from "@/lib/date"
import { calculaDia }      from "@/lib/efetivo-escala"

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url)
  const dataStr  = searchParams.get("data") ?? hojeNoBrasil().toISOString().slice(0, 10)
  const turnoId  = searchParams.get("turnoId") ? Number(searchParams.get("turnoId")) : undefined
  const areaId   = searchParams.get("areaId")  ? Number(searchParams.get("areaId"))  : undefined

  const companyId = session.user.companyId
  const dataAlvo  = parseDataLocal(dataStr)

  const [colabs, eventos] = await Promise.all([
    prisma.efetivoColaborador.findMany({
      where: {
        companyId,
        status:    "ATIVO",
        deletedAt: null,
        ...(turnoId ? { turnoId } : {}),
        ...(areaId  ? { areaId  } : {}),
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
        dataInicio: { lte: dataAlvo },
        dataFim:    { gte: dataAlvo },
      },
      select: {
        id:            true,
        colaboradorId: true,
        tipo:          true,
        dataInicio:    true,
        dataFim:       true,
        horaAjuste:    true,
        observacao:    true,
        criador:       { select: { name: true } },
      },
    }),
  ])

  // Indexa eventos por colaborador
  const evMap     = new Map<number, typeof eventos[0]>()
  const evListMap = new Map<number, { tipo: string; dataInicio: Date; dataFim: Date }[]>()
  for (const ev of eventos) {
    if (!evMap.has(ev.colaboradorId)) evMap.set(ev.colaboradorId, ev)
    const list = evListMap.get(ev.colaboradorId) ?? []
    list.push({ tipo: ev.tipo, dataInicio: ev.dataInicio, dataFim: ev.dataFim })
    evListMap.set(ev.colaboradorId, list)
  }

  const colaboradores = colabs.map((c) => {
    const status = calculaDia(c.padraoEscala, c.dataAncora, dataAlvo, evListMap.get(c.id) ?? [])
    const ev     = evMap.get(c.id) ?? null
    return {
      id:        c.id,
      matricula: c.matricula,
      nome:      c.nome,
      turno:     c.turno,
      area:      c.area,
      status,
      evento: ev
        ? {
            id:           ev.id,
            tipo:         ev.tipo,
            dataInicio:   ev.dataInicio.toISOString().slice(0, 10),
            dataFim:      ev.dataFim.toISOString().slice(0, 10),
            horaAjuste:   ev.horaAjuste,
            observacao:   ev.observacao,
            criadoPorNome: ev.criador.name,
          }
        : null,
    }
  })

  return ok({ dataISO: dataStr, colaboradores })
})
