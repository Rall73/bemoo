"use client"

import { useState } from "react"
import {
  FileText, Sparkles, Download, Loader2,
  Pencil, RefreshCw, ChevronDown, ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  executionId: number
}

export function RelatorioPanel({ executionId }: Props) {
  // ─── Relatório Básico ─────────────────────────────────────────────────
  const [basicLoading, setBasicLoading] = useState(false)
  const [basicUrl,     setBasicUrl]     = useState<string | null>(null)
  const [basicError,   setBasicError]   = useState("")

  async function gerarBasico() {
    setBasicLoading(true)
    setBasicError("")
    try {
      const res  = await fetch(`/api/execucoes/${executionId}/relatorio`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tipo: "basico" }),
      })
      const json = await res.json()
      if (res.ok) setBasicUrl(json.data.url)
      else setBasicError(json.message ?? "Erro ao gerar relatório.")
    } catch {
      setBasicError("Erro de conexão.")
    } finally {
      setBasicLoading(false)
    }
  }

  // ─── Relatório com IA ─────────────────────────────────────────────────
  const [iaStep,      setIaStep]      = useState<"idle" | "analyzing" | "review" | "generating" | "done">("idle")
  const [analise,     setAnalise]     = useState("")
  const [iaUrl,       setIaUrl]       = useState<string | null>(null)
  const [iaError,     setIaError]     = useState("")
  const [showIa,      setShowIa]      = useState(false)

  async function gerarAnalise() {
    setIaStep("analyzing")
    setIaError("")
    try {
      const res  = await fetch(`/api/execucoes/${executionId}/relatorio/analise`, {
        method: "POST",
      })
      const json = await res.json()
      if (res.ok) {
        setAnalise(json.data.analise)
        setIaStep("review")
      } else {
        setIaError(json.message ?? "Erro ao gerar análise.")
        setIaStep("idle")
      }
    } catch {
      setIaError("Erro de conexão.")
      setIaStep("idle")
    }
  }

  async function gerarDocxIa() {
    setIaStep("generating")
    setIaError("")
    try {
      const res  = await fetch(`/api/execucoes/${executionId}/relatorio`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tipo: "ia", analise }),
      })
      const json = await res.json()
      if (res.ok) {
        setIaUrl(json.data.url)
        setIaStep("done")
      } else {
        setIaError(json.message ?? "Erro ao gerar relatório.")
        setIaStep("review")
      }
    } catch {
      setIaError("Erro de conexão.")
      setIaStep("review")
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Relatórios</h2>

      {/* ── Relatório Básico ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary flex-shrink-0" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-gray-800">Relatório Básico</p>
              <p className="text-xs text-gray-500">Todos os itens, respostas, fotos e anotações</p>
            </div>
          </div>

          {basicUrl ? (
            <a
              href={basicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-soft hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Download size={13} strokeWidth={2.5} /> Baixar .docx
            </a>
          ) : (
            <button
              onClick={gerarBasico}
              disabled={basicLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary text-xs font-medium rounded-soft hover:bg-primary-50 transition-colors flex-shrink-0 disabled:opacity-60"
            >
              {basicLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} strokeWidth={2} />}
              {basicLoading ? "Gerando..." : "Gerar .docx"}
            </button>
          )}
        </div>
        {basicError && <p className="text-xs text-error bg-red-50 px-3 py-2 rounded-soft">{basicError}</p>}
        {basicUrl && (
          <button
            onClick={() => { setBasicUrl(null); gerarBasico() }}
            className="text-xs text-gray-400 hover:text-primary flex items-center gap-1"
          >
            <RefreshCw size={11} /> Regenerar
          </button>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Relatório com IA ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          onClick={() => setShowIa((v) => !v)}
          className="w-full flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent flex-shrink-0" strokeWidth={2} />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Relatório com Análise por IA</p>
              <p className="text-xs text-gray-500">Inclui diagnóstico, pontos positivos/negativos e recomendações</p>
            </div>
          </div>
          {showIa
            ? <ChevronUp size={15} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
          }
        </button>

        {showIa && (
          <div className="space-y-3 pl-6">
            {/* Idle: botão para iniciar análise */}
            {iaStep === "idle" && (
              <button
                onClick={gerarAnalise}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-accent text-accent text-xs font-medium rounded-soft hover:bg-accent/5 transition-colors"
              >
                <Sparkles size={13} strokeWidth={2} /> Analisar com IA
              </button>
            )}

            {/* Analisando */}
            {iaStep === "analyzing" && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin text-accent" />
                Analisando execução com IA... aguarde alguns segundos.
              </div>
            )}

            {/* Revisão da análise */}
            {(iaStep === "review" || iaStep === "generating") && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Pencil size={12} /> Revise e edite a análise antes de gerar o relatório
                </div>
                <textarea
                  value={analise}
                  onChange={(e) => setAnalise(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-soft focus:outline-none focus:border-primary resize-y font-mono leading-relaxed"
                  disabled={iaStep === "generating"}
                />
                <div className="flex gap-2">
                  <button
                    onClick={gerarDocxIa}
                    disabled={iaStep === "generating" || !analise.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-soft hover:bg-accent/90 transition-colors disabled:opacity-60"
                  >
                    {iaStep === "generating"
                      ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                      : <><Download size={13} strokeWidth={2.5} /> Gerar .docx</>
                    }
                  </button>
                  <button
                    onClick={() => { setIaStep("idle"); setAnalise("") }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2"
                  >
                    Recomeçar
                  </button>
                </div>
              </div>
            )}

            {/* Concluído */}
            {iaStep === "done" && iaUrl && (
              <div className="space-y-2">
                <a
                  href={iaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-soft hover:bg-accent/90 transition-colors"
                >
                  <Download size={13} strokeWidth={2.5} /> Baixar relatório com IA (.docx)
                </a>
                <button
                  onClick={() => { setIaStep("review") }}
                  className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 block"
                >
                  <RefreshCw size={11} /> Editar análise e regenerar
                </button>
              </div>
            )}

            {iaError && <p className="text-xs text-error bg-red-50 px-3 py-2 rounded-soft">{iaError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
