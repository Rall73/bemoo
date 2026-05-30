import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { ExecutionForm } from "./_components/ExecutionForm"

export const metadata: Metadata = { title: "Executar checklist" }

export default async function ExecucaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth() as any
  if (!session?.user) redirect("/login")
  if (session.user.role === "AUDITOR") redirect("/checklists")

  const execId = parseInt(id)
  if (isNaN(execId)) notFound()

  const execution = await prisma.checklistExecution.findFirst({
    where:   { id: execId, companyId: session.user.companyId, deletedAt: null },
    include: {
      executor: { select: { name: true } },
      checklist: {
        include: {
          items: {
            where:   { deletedAt: null },
            orderBy: { order: "asc" },
            include: {
              fields: {
                where:   { deletedAt: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      fieldValues: true,
    },
  })

  if (!execution) notFound()

  // Se já finalizada, redireciona para o histórico
  if (execution.status === "COMPLETED") redirect(`/execucoes/${execId}/resultado`)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <ExecutionForm
        execution={{
          id:            execution.id,
          checklistName: execution.checklist.name,
          executorName:  execution.executor.name,
          startedAt:     execution.startedAt.toISOString(),
          items: execution.checklist.items.map((item) => ({
            id:    item.id,
            label: item.label,
            fields: item.fields.map((f) => ({
              id:           f.id,
              label:        f.label,
              type:         f.type as "OK_NOK" | "SIM_NAO" | "NUMERIC" | "TEXT",
              unit:         f.unit,
              required:     f.required,
              requirePhoto: f.requirePhoto,
            })),
          })),
          // valores já salvos (se houver auto-save futuro)
          savedValues: execution.fieldValues.reduce((acc, fv) => {
            acc[fv.fieldId] = {
              valueOkNok:   fv.valueOkNok,
              valueNumeric: fv.valueNumeric ? Number(fv.valueNumeric) : null,
              valueText:    fv.valueText,
              photoUrl:     fv.photoUrl,
              annotation:   fv.annotation,
            }
            return acc
          }, {} as Record<number, any>),
        }}
      />
    </div>
  )
}
