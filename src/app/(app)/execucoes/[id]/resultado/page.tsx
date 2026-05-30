import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { CheckCircle, ArrowLeft, Clock, ListChecks } from "lucide-react"

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const execId    = parseInt(id)
  if (isNaN(execId)) notFound()

  const execution = await prisma.checklistExecution.findFirst({
    where:   { id: execId, companyId: session.user.companyId, deletedAt: null },
    include: {
      checklist:   { select: { id: true, name: true } },
      executor:    { select: { name: true } },
      fieldValues: { include: { field: { select: { label: true, type: true, unit: true } } } },
    },
  })

  if (!execution || execution.status !== "COMPLETED") notFound()

  const duration = execution.finishedAt
    ? Math.round((execution.finishedAt.getTime() - execution.startedAt.getTime()) / 1000 / 60)
    : null

  const okCount  = execution.fieldValues.filter((fv) => fv.valueOkNok === true).length
  const nokCount = execution.fieldValues.filter((fv) => fv.valueOkNok === false).length
  const total    = execution.fieldValues.length

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      {/* Sucesso */}
      <div className="bg-white border border-gray-200 rounded-round p-8 text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle size={36} className="text-success" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Execução concluída!</h1>
        <p className="text-sm text-gray-500">{execution.checklist.name}</p>

        <div className="flex items-center justify-center gap-6 pt-2 text-sm text-gray-600">
          {duration !== null && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" /> {duration} min
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <ListChecks size={14} className="text-gray-400" /> {total} campos
          </span>
          {(okCount + nokCount) > 0 && (
            <span>
              <span className="text-success font-medium">{okCount} OK</span>
              {nokCount > 0 && <span className="text-error font-medium ml-2">{nokCount} NOK</span>}
            </span>
          )}
        </div>
      </div>

      {/* Observação final */}
      {execution.conclusionNote && (
        <div className="bg-white border border-gray-200 rounded-round p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Observação final</p>
          <p className="text-sm text-gray-700">{execution.conclusionNote}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <Link
          href="/checklists"
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-soft text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} /> Voltar
        </Link>
        <Link
          href="/execucoes"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-soft text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ListChecks size={15} strokeWidth={2} /> Ver histórico
        </Link>
      </div>
    </div>
  )
}
