import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { PedidoDetalhe } from "../../_components/PedidoDetalhe"

export const metadata: Metadata = { title: "Pedido — Oficina" }

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const { id } = await params
  const pedidoId  = parseInt(id)
  const companyId = session.user.companyId as number
  const userId    = parseInt(session.user.id)
  const role      = session.user.role as string

  const pedido = await prisma.workshopServiceOrder.findFirst({
    where: { id: pedidoId, companyId, deletedAt: null },
    include: {
      requester:   { select: { id: true, name: true } },
      assignee:    { select: { id: true, name: true } },
      area:        true,
      product:     true,
      pauseReason: true,
      attachments: { orderBy: { createdAt: "asc" } },
      logs: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      deliveries: {
        include: { deliverer: { select: { name: true } } },
        orderBy:  { createdAt: "asc" },
      },
      consumptions: {
        where:   { deletedAt: null },
        include: {
          material: { select: { name: true, unit: true, unitCost: true } },
          creator:  { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!pedido) notFound()

  // EXECUTOR só vê os próprios pedidos
  if (role === "EXECUTOR" && pedido.requestedBy !== userId) notFound()

  const [usuarios, materiais, motivosPausa] = await Promise.all([
    role !== "EXECUTOR"
      ? prisma.user.findMany({
          where:   { companyId, deletedAt: null },
          select:  { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    role !== "EXECUTOR"
      ? prisma.workshopMaterial.findMany({
          where:   { companyId, active: true, deletedAt: null },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    role !== "EXECUTOR"
      ? prisma.workshopPauseReason.findMany({
          where:   { companyId, active: true, deletedAt: null },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PedidoDetalhe
        pedido={{
          id:               pedido.id,
          areaName:         pedido.area.name,
          productName:      pedido.product.name,
          productCategory:  pedido.product.category,
          requester:        pedido.requester,
          assignee:         pedido.assignee,
          quantity:         pedido.quantity,
          quantityDelivered:pedido.quantityDelivered,
          desiredDate:      pedido.desiredDate?.toISOString() ?? null,
          details:          pedido.details,
          status:           pedido.status,
          pauseReasonId:    pedido.pauseReasonId,
          pauseReasonName:  pedido.pauseReason?.name ?? null,
          startedAt:        pedido.startedAt?.toISOString() ?? null,
          finishedAt:       pedido.finishedAt?.toISOString() ?? null,
          createdAt:        pedido.createdAt.toISOString(),
          attachments:      pedido.attachments.map((a) => ({ id: a.id, url: a.url, fileName: a.fileName })),
          logs: pedido.logs.map((l) => ({
            id:         l.id,
            message:    l.message,
            statusFrom: l.statusFrom,
            statusTo:   l.statusTo,
            userName:   l.user.name,
            userRole:   l.user.role,
            createdAt:  l.createdAt.toISOString(),
          })),
          deliveries: pedido.deliveries.map((d) => ({
            id:           d.id,
            quantity:     d.quantity,
            note:         d.note,
            delivererName:d.deliverer.name,
            createdAt:    d.createdAt.toISOString(),
          })),
          consumptions: pedido.consumptions.map((c) => ({
            id:           c.id,
            materialName: c.material.name,
            unit:         c.material.unit,
            unitCost:     c.material.unitCost ? Number(c.material.unitCost) : null,
            quantity:     Number(c.quantity),
            source:       c.source,
            note:         c.note,
            creatorName:  c.creator.name,
            createdAt:    c.createdAt.toISOString(),
          })),
        }}
        currentUserId={userId}
        role={role}
        usuarios={usuarios.map((u) => ({ id: u.id, name: u.name, role: u.role }))}
        materiais={materiais.map((m) => ({
          id:       m.id,
          name:     m.name,
          unit:     m.unit,
          quantity: Number(m.quantity),
        }))}
        motivosPausa={motivosPausa.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  )
}
