import { z }            from "zod"
import { NextResponse }  from "next/server"
import { prisma }        from "@/lib/prisma"
import { withAuth, ok, validateBody, assertMinRole, conflict } from "@/lib/api"
import { logAction }     from "@/lib/audit"

const zNovo = z.object({
  matricula:      z.string().min(1).max(20),
  nome:           z.string().min(2).max(200),
  cargoId:        z.number().int().positive(),
  areaId:         z.number().int().positive(),
  padraoEscalaId: z.number().int().positive(),
  turnoId:        z.number().int().positive(),
  dataAdmissao:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataAncora:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

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

export const POST = withAuth(async (req, session) => {
  const roleErr = assertMinRole(session.user.role, "GESTOR")
  if (roleErr) return roleErr

  const { data, error } = await validateBody(req, zNovo)
  if (error) return error

  const { matricula, nome, cargoId, areaId, padraoEscalaId, turnoId, dataAdmissao, dataAncora } = data
  const companyId = session.user.companyId

  const existente = await prisma.efetivoColaborador.findFirst({
    where: { companyId, matricula, deletedAt: null },
  })
  if (existente) return conflict(`Matrícula ${matricula} já está em uso.`)

  const colab = await prisma.efetivoColaborador.create({
    data: {
      companyId,
      matricula,
      nome,
      cargoId,
      areaId,
      padraoEscalaId,
      turnoId,
      dataAdmissao:  new Date(dataAdmissao + "T12:00:00Z"),
      dataAncora:    dataAncora ? new Date(dataAncora + "T12:00:00Z") : null,
      status:        "ATIVO",
    },
  })

  await prisma.efetivoMovimentacaoVinculo.create({
    data: {
      companyId,
      colaboradorId: colab.id,
      tipo:          "ADMISSAO",
      data:          new Date(dataAdmissao + "T12:00:00Z"),
      registradoPor: parseInt(session.user.id),
    },
  })

  logAction({
    companyId,
    userId: parseInt(session.user.id),
    action: "efetivo.colaborador.criado",
    after:  { id: colab.id, matricula, nome },
  })

  return ok({ id: colab.id, matricula: colab.matricula }, 201)
})
