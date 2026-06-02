import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle, XCircle, Clock, ListChecks, ArrowLeft,
  MinusCircle, MessageSquare, Mic, Camera, BookOpen,
} from "lucide-react"
import { RelatorioPanel } from "./_components/RelatorioPanel"
import { cn } from "@/lib/utils"

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

function fmtDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const execId = parseInt(id)
  if (isNaN(execId)) notFound()

  const execution = await prisma.checklistExecution.findFirst({
    where: { id: execId, companyId: session.user.companyId, deletedAt: null },
    include: {
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
      executor:    { select: { name: true } },
      fieldValues: true,
    },
  })

  if (!execution || execution.status !== "COMPLETED") notFound()

  const valueMap = new Map(execution.fieldValues.map((fv) => [fv.fieldId, fv]))

  const durationMins = execution.finishedAt
    ? Math.round((execution.finishedAt.getTime() - execution.startedAt.getTime()) / 1000 / 60)
    : null

  const allFields   = execution.checklist.items.flatMap((i) => i.fields)
  const boolFields  = allFields.filter((f) => f.type === "OK_NOK" || f.type === "SIM_NAO")
  const conformes   = boolFields.filter((f) => valueMap.get(f.id)?.valueOkNok === true).length
  const naoConf     = boolFields.filter((f) => valueMap.get(f.id)?.valueOkNok === false).length
  const naCount     = execution.fieldValues.filter((fv) => fv.valueNa).length
  const conformPct  = boolFields.length > 0 ? Math.round((conformes / boolFields.length) * 100) : null

  const codigoExec  = `EXE-${String(execId).padStart(5, "0")}`

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">

      {/* ── Cabeçalho de resultado ─────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-round p-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-success" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-xs font-mono text-gray-400 mb-0.5">{codigoExec}</p>
          <h1 className="text-lg font-semibold text-gray-900">{execution.checklist.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {execution.executor.name} · {fmtDate(execution.startedAt)}
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 pt-1 text-sm text-gray-600 flex-wrap">
          {durationMins !== null && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" /> {fmtDuration(durationMins)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <ListChecks size={14} className="text-gray-400" /> {allFields.length} campos
          </span>
          {conformPct !== null && (
            <span className={cn("font-semibold", conformPct === 100 ? "text-success" : naoConf > 0 ? "text-error" : "text-gray-700")}>
              {conformPct}% conforme
            </span>
          )}
          {conformes > 0 && (
            <span className="text-success font-medium">{conformes} ✓</span>
          )}
          {naoConf > 0 && (
            <span className="text-error font-medium">{naoConf} ✗</span>
          )}
          {naCount > 0 && (
            <span className="text-gray-400 font-medium">{naCount} N/A</span>
          )}
        </div>
      </div>

      {/* ── Observação final ─────────────────────────────────────────── */}
      {execution.conclusionNote && (
        <div className="bg-white border border-gray-200 rounded-round p-4">
          <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
            <MessageSquare size={12} /> Observação final
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{execution.conclusionNote}</p>
        </div>
      )}

      {/* ── Detalhe por seção e campo ─────────────────────────────── */}
      {execution.checklist.items.map((item, itemIdx) => (
        <div key={item.id} className="bg-white border border-gray-200 rounded-round overflow-hidden">
          {/* Cabeçalho da seção */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold flex-shrink-0">
              {itemIdx + 1}
            </span>
            <h3 className="text-sm font-semibold text-gray-800">{item.label}</h3>
          </div>

          {/* Campos */}
          <div className="divide-y divide-gray-100">
            {item.fields.map((field) => {
              const fv  = valueMap.get(field.id)
              const isNa = fv?.valueNa === true

              // Calcular resposta
              let respostaText  = "—"
              let respostaCor   = "text-gray-400"
              let respostaBg    = "bg-gray-50"

              if (isNa) {
                respostaText = "N/A"
                respostaCor  = "text-gray-500"
                respostaBg   = "bg-gray-100"
              } else if (field.type === "OK_NOK" || field.type === "SIM_NAO") {
                if (fv?.valueOkNok === true) {
                  respostaText = field.type === "OK_NOK" ? "OK" : "Sim"
                  respostaCor  = "text-success"
                  respostaBg   = "bg-green-50"
                } else if (fv?.valueOkNok === false) {
                  respostaText = field.type === "OK_NOK" ? "NOK" : "Não"
                  respostaCor  = "text-error"
                  respostaBg   = "bg-red-50"
                }
              } else if (field.type === "NUMERIC") {
                if (fv?.valueNumeric != null) {
                  respostaText = `${Number(fv.valueNumeric)}${field.unit ? " " + field.unit : ""}`
                  respostaCor  = "text-primary"
                  respostaBg   = "bg-primary-50/40"
                }
              } else if (field.type === "TEXT") {
                if (fv?.valueText?.trim()) {
                  respostaText = fv.valueText
                  respostaCor  = "text-gray-800"
                  respostaBg   = "bg-gray-50"
                }
              }

              const hasExtra = !!(fv?.annotation?.trim() || fv?.transcription?.trim() || fv?.photoUrl)

              return (
                <div key={field.id} className="px-4 py-3 space-y-2">
                  {/* Label + Resposta */}
                  <div className="flex items-start gap-3">
                    <p className="flex-1 text-sm text-gray-700 leading-snug">
                      {field.label}
                      {field.required && <span className="text-error ml-0.5 text-[10px]">*</span>}
                    </p>
                    <span className={cn(
                      "flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-soft text-xs font-semibold",
                      respostaBg, respostaCor
                    )}>
                      {isNa ? <MinusCircle size={11} strokeWidth={2.5} /> :
                       fv?.valueOkNok === true ? <CheckCircle size={11} strokeWidth={2.5} /> :
                       fv?.valueOkNok === false ? <XCircle size={11} strokeWidth={2.5} /> : null}
                      {respostaText}
                    </span>
                  </div>

                  {/* Referência normativa */}
                  {field.reference && (
                    <p className="flex items-center gap-1 text-[10px] text-blue-500 font-mono">
                      <BookOpen size={10} />
                      {field.referenceSource && <>{field.referenceSource} · </>}{field.reference}
                    </p>
                  )}

                  {/* Foto */}
                  {fv?.photoUrl && (
                    <a href={fv.photoUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fv.photoUrl}
                        alt={`Foto — ${field.label}`}
                        className="w-28 h-28 rounded-soft object-cover border border-gray-200 hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}

                  {/* Anotação */}
                  {fv?.annotation?.trim() && (
                    <div className="flex items-start gap-1.5">
                      <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                      <p className="text-xs text-gray-600 leading-snug">{fv.annotation}</p>
                    </div>
                  )}

                  {/* Transcrição de áudio */}
                  {fv?.transcription?.trim() && (
                    <div className="flex items-start gap-1.5 bg-primary-50/30 border border-primary-100 rounded-soft px-2 py-1.5">
                      <Mic size={12} className="text-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                      <p className="text-xs text-gray-700 italic leading-snug">{fv.transcription}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Relatórios ────────────────────────────────────────────── */}
      <RelatorioPanel
        executionId={execId}
        savedBasicUrl={execution.reportUrl ?? null}
        savedIaUrl={execution.reportIaUrl ?? null}
        savedAt={execution.reportGeneratedAt?.toISOString() ?? null}
      />

      {/* ── Ações ─────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Link
          href="/execucoes"
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-soft text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={15} strokeWidth={2} /> Histórico
        </Link>
        <Link
          href="/checklists"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-soft text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ListChecks size={15} strokeWidth={2} /> Checklists
        </Link>
      </div>
    </div>
  )
}
