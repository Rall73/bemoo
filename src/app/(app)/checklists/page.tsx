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
  const userId    = parseInt(session.user.id)

  const [checklists, templates, myInProgress] = await Promise.all([
    prisma.checklist.findMany({
      where:   { companyId, isTemplate: false, deletedAt: null },
      include: {
        _count:  { select: { items: { where: { deletedAt: null } } } },
        creator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.checklist.findMany({
      where:   { isTemplate: true, active: true, deletedAt: null },
      include: { _count: { select: { items: { where: { deletedAt: null } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.checklistExecution.findMany({
      where:  { companyId, executedBy: userId, status: "IN_PROGRESS", deletedAt: null },
      select: { id: true, checklistId: true },
    }),
  ])

  const canManage  = role === "ADMIN" || role === "GESTOR"
  const canExecute = role !== "AUDITOR"

  // checklistId → executionId para o usuário atual
  const userInProgress: Record<number, number> = {}
  for (const ex of myInProgress) userInProgress[ex.checklistId] = ex.id

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
        availableTemplates={templates.map((t) => ({
          id:             t.id,
          name:           t.name,
          description:    t.description,
          templateSource: t.templateSource,
          itemCount:      t._count.items,
        }))}
        canManage={canManage}
        canExecute={canExecute}
        userInProgress={userInProgress}
      />
    </div>
  )
}
