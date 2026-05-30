import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { TemplatesAdminClient } from "./_components/TemplatesAdminClient"

export const metadata: Metadata = { title: "Templates de Checklist" }

export default async function TemplatesPage() {
  const session = await auth() as any
  if (!session?.user?.platformAdmin) redirect("/dashboard")

  const templates = await prisma.checklist.findMany({
    where:   { isTemplate: true, deletedAt: null },
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Templates de Checklist
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Templates globais disponíveis para todas as empresas importarem.
        </p>
      </div>

      <TemplatesAdminClient
        initialTemplates={templates.map((t) => ({
          id:             t.id,
          name:           t.name,
          description:    t.description,
          templateSource: t.templateSource,
          active:         t.active,
          itemCount:      t._count.items,
          createdAt:      t.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
