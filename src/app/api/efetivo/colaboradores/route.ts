import { prisma } from "@/lib/prisma"
import { withAuth, ok } from "@/lib/api"

export const GET = withAuth(async (req, session) => {
  const { searchParams } = new URL(req.url)
  const q      = searchParams.get("q")?.trim() ?? ""
  const status = searchParams.get("status") ?? ""
  const areaId = searchParams.get("areaId") ? parseInt(searchParams.get("areaId")!) : undefined
  const turnoId = searchParams.get("turnoId") ? parseInt(searchParams.get("turnoId")!) : undefined

  const colaboradores = await prisma.efetivoColaborador.findMany({
    where: {
      companyId: session.user.companyId,
      deletedAt: null,
      ...(status === "ATIVO" || status === "DESLIGADO" ? { status } : {}),
      ...(areaId  ? { areaId }  : {}),
      ...(turnoId ? { turnoId } : {}),
      ...(q ? {
        OR: [
          { nome:      { contains: q } },
          { matricula: { contains: q } },
        ],
      } : {}),
    },
    orderBy: { nome: "asc" },
    select: {
      id:         true,
      matricula:  true,
      nome:       true,
      status:     true,
      cargo:      { select: { nome: true } },
      area:       { select: { nome: true } },
      turno:      { select: { codigo: true, horaInicio: true, horaFim: true } },
    },
  })

  return ok(colaboradores)
})
