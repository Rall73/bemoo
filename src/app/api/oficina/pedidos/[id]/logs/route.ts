import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, validateBody, created, notFound, forbidden, assertSameCompany } from "@/lib/api"

const zCreate = z.object({
  message: z.string().min(1).max(2000),
})

export const POST = withAuthCtx<{ id: string }>(async (req, session, params) => {
  const { data, error } = await validateBody(req, zCreate)
  if (error) return error

  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: parseInt(params.id), deletedAt: null },
  })
  if (!pedido) return notFound()
  const tenantError = assertSameCompany(session.user.companyId, pedido.companyId)
  if (tenantError) return tenantError

  // EXECUTOR só comenta nos próprios pedidos
  if (
    session.user.role === "EXECUTOR" &&
    pedido.requestedBy !== parseInt(session.user.id)
  ) {
    return forbidden()
  }

  const log = await prisma.workshopOrderLog.create({
    data: {
      orderId: pedido.id,
      userId:  parseInt(session.user.id),
      message: data.message,
    },
    include: { user: { select: { name: true, role: true } } },
  })

  return created(log)
})
