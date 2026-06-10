import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuth, validateBody, created, ok, badRequest } from "@/lib/api"
import { logAction } from "@/lib/audit"

const zCreate = z.object({
  areaId:      z.number().int().positive(),
  productId:   z.number().int().positive(),
  quantity:    z.number().int().min(1),
  desiredDate: z.string().optional(),
  details:     z.string().max(2000).optional(),
})

export const GET = withAuth(async (req, session) => {
  const companyId = session.user.companyId
  const url       = new URL(req.url)
  const status    = url.searchParams.get("status") ?? undefined
  const myOrders  = url.searchParams.get("meus") === "1"

  const pedidos = await prisma.workshopServiceOrder.findMany({
    where: {
      companyId,
      deletedAt:   null,
      ...(status      ? { status: status as any } : {}),
      // EXECUTOR vê apenas os próprios pedidos (a menos que ?meus não seja forçado)
      ...(session.user.role === "EXECUTOR" || myOrders
        ? { requestedBy: parseInt(session.user.id) }
        : {}),
    },
    include: {
      requester:   { select: { name: true } },
      assignee:    { select: { name: true } },
      area:        { select: { name: true } },
      product:     { select: { name: true, category: true } },
      pauseReason: { select: { name: true } },
      _count:      { select: { deliveries: true, attachments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return ok(pedidos)
})

export const POST = withAuth(async (req, session) => {
  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  // Valida que área e produto pertencem à empresa
  const [area, produto] = await Promise.all([
    prisma.workshopArea.findFirst({
      where: { id: data.areaId, companyId: session.user.companyId, deletedAt: null },
    }),
    prisma.workshopProduct.findFirst({
      where: { id: data.productId, companyId: session.user.companyId, deletedAt: null },
    }),
  ])
  if (!area)    return badRequest("Área não encontrada.")
  if (!produto) return badRequest("Produto/serviço não encontrado.")

  const pedido = await prisma.workshopServiceOrder.create({
    data: {
      companyId:   session.user.companyId,
      requestedBy: parseInt(session.user.id),
      areaId:      data.areaId,
      productId:   data.productId,
      quantity:    data.quantity,
      desiredDate: data.desiredDate ? new Date(data.desiredDate) : null,
      details:     data.details ?? null,
    },
  })

  // Log inicial automático
  await prisma.workshopOrderLog.create({
    data: {
      orderId:  pedido.id,
      userId:   parseInt(session.user.id),
      message:  "Pedido criado.",
      statusTo: "NOVO",
    },
  })

  logAction({
    companyId: session.user.companyId,
    userId:    parseInt(session.user.id),
    action:    "oficina.pedido.criado",
    entity:    "WorkshopServiceOrder",
    entityId:  pedido.id,
    after:     { ...pedido, areaName: area.name, productName: produto.name },
  })

  return created(pedido)
})
