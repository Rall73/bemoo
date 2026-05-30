import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChecklistsClient } from "./_components/ChecklistsClient"

export const metadata: Metadata = { title: "Checklists" }

export default async function ChecklistsPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number
  const role      = session.user.role as string

  const checklists = await prisma.checklist.findMany({
    where:   { companyId, deletedAt: null },
    include: {
      _count:  { select: { items: { where: { deletedAt: null } } } },
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const canManage  = role === "ADMIN" || role === "GESTOR"
  const canExecute = role !== "AUDITOR"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Checklists
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Modelos de verificação da sua empresa.
          </p>
        </div>
      </div>

      <ChecklistsClient
        initialChecklists={checklists.map((c) => ({
          id:          c.id,
          name:        c.name,
          description: c.description,
          active:      c.active,
          itemCount:   c._count.items,
          createdBy:   c.creator.name,
          createdAt:   c.createdAt.toISOString(),
        }))}
        canManage={canManage}
        canExecute={canExecute}
      />
    </div>
  )
}
