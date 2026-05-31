import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Clock, ListChecks, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Histórico de execuções" }

function fmtDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default async function ExecucoesPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const executions = await prisma.checklistExecution.findMany({
    where: { companyId, deletedAt: null, status: "COMPLETED" },
    include: {
      checklist: { select: { name: true } },
      executor:  { select: { name: true } },
      fieldValues: {
        select: { valueOkNok: true, valueNa: true },
      },
    },
    orderBy: { finishedAt: "desc" },
    take: 100,
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Histórico
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {executions.length} execuç{executions.length === 1 ? "ão" : "ões"} concluída{executions.length === 1 ? "" : "s"}.
          </p>
        </div>
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
            const durationMins = ex.finishedAt
              ? Math.round((ex.finishedAt.getTime() - ex.startedAt.getTime()) / 1000 / 60)
              : null

            const boolFields = ex.fieldValues.filter((fv) => !fv.valueNa)
            const conformes  = boolFields.filter((fv) => fv.valueOkNok === true).length
            const naoConf    = boolFields.filter((fv) => fv.valueOkNok === false).length
            const totalBool  = boolFields.filter((fv) => fv.valueOkNok !== null).length
            const pct        = totalBool > 0 ? Math.round((conformes / totalBool) * 100) : null
            const codigoExec = `EXE-${String(ex.id).padStart(5, "0")}`

            return (
              <Link
                key={ex.id}
                href={`/execucoes/${ex.id}/resultado`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-round p-4 hover:border-gray-300 transition-colors group"
              >
                <div className={cn(
                  "w-9 h-9 rounded-soft flex items-center justify-center flex-shrink-0",
                  naoConf > 0 ? "bg-red-50" : "bg-success/10"
                )}>
                  <CheckCircle size={18}
                    className={naoConf > 0 ? "text-error" : "text-success"}
                    strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{ex.checklist.name}</p>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                      {codigoExec}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ex.executor.name} · {ex.finishedAt ? fmtDate(ex.finishedAt) : "—"}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                  {pct !== null && (
                    <span className={cn(
                      "font-semibold px-2 py-0.5 rounded",
                      pct === 100 ? "text-success bg-green-50" :
                      naoConf > 0 ? "text-error bg-red-50" : "text-gray-600"
                    )}>
                      {pct}%
                    </span>
                  )}
                  {durationMins !== null && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {durationMins < 60 ? `${durationMins}min` : `${Math.floor(durationMins/60)}h${durationMins%60}m`}
                    </span>
                  )}
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
