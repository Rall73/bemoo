import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { ChecklistDetailClient } from "./_components/ChecklistDetailClient"

export const metadata: Metadata = { title: "Editar checklist" }

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const checklistId = parseInt(id)
  if (isNaN(checklistId)) notFound()

  const checklist = await prisma.checklist.findFirst({
    where:   { id: checklistId, companyId: session.user.companyId, deletedAt: null },
    include: {
      items:   { where: { deletedAt: null }, orderBy: { order: "asc" } },
      creator: { select: { name: true } },
    },
  })

  if (!checklist) notFound()

  const canManage = session.user.role === "ADMIN" || session.user.role === "GESTOR"

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ChecklistDetailClient
        checklist={{
          id:          checklist.id,
          name:        checklist.name,
          description: checklist.description,
          active:      checklist.active,
          createdBy:   checklist.creator.name,
          createdAt:   checklist.createdAt.toISOString(),
          items:       checklist.items.map((item) => ({
            id:          item.id,
            order:       item.order,
            label:       item.label,
            description: item.description,
            type:        item.type,
            required:    item.required,
          })),
        }}
        canManage={canManage}
      />
    </div>
  )
}
