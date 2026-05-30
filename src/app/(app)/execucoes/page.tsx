import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Clock, ListChecks, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Histórico de execuções" }

export default async function ExecucoesPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const executions = await prisma.checklistExecution.findMany({
    where:   { companyId, deletedAt: null, status: "COMPLETED" },
    include: {
      checklist: { select: { name: true } },
      executor:  { select: { name: true } },
      _count:    { select: { fieldValues: true } },
    },
    orderBy: { finishedAt: "desc" },
    take:    50,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Histórico
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Execuções concluídas.</p>
      </div>

      {executions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListChecks size={36} className="mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Nenhuma execução concluída ainda.</p>
          <Link href="/checklists" className="mt-2 text-sm text-primary hover:underline block">
            Ir para Checklists
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {executions.map((ex) => {
            const duration = ex.finishedAt
              ? Math.round((ex.finishedAt.getTime() - ex.startedAt.getTime()) / 1000 / 60)
              : null

            return (
              <Link
                key={ex.id}
                href={`/execucoes/${ex.id}/resultado`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-round p-4 hover:border-gray-300 transition-colors group"
              >
                <div className="w-9 h-9 rounded-soft bg-success/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} className="text-success" strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ex.checklist.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ex.executor.name} · {ex.finishedAt
                      ? new Date(ex.finishedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                  {duration !== null && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {duration}min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <ListChecks size={12} /> {ex._count.fieldValues}
                  </span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
