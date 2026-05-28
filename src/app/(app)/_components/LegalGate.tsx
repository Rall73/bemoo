"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ShieldCheck, FileText, Lock } from "lucide-react"
import { BemooLogo } from "@/components/Logo"
import { Button } from "@/components/ui/Button"
import type { PendingVersion } from "@/lib/legal"

// ─── Metadados por tipo de documento ──────────────────────────────

const DOC_META = {
  TERMS: {
    label: "Termos de Uso",
    href:  "/termos",
    Icon:  FileText,
  },
  PRIVACY: {
    label: "Política de Privacidade",
    href:  "/privacidade",
    Icon:  Lock,
  },
} as const

// ─── Componente ───────────────────────────────────────────────────

export function LegalGate({ versions }: { versions: PendingVersion[] }) {
  const router  = useRouter()
  const [accepted, setAccepted] = useState<Record<number, boolean>>({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  const allAccepted = versions.every((v) => accepted[v.id])
  const isUpdate    = versions.some((v) => v.version !== "1.0")

  function toggle(id: number, checked: boolean) {
    setAccepted((prev) => ({ ...prev, [id]: checked }))
  }

  async function handleConfirm() {
    if (!allAccepted || loading) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/legal/accept", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ versionIds: versions.map((v) => v.id) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.message ?? "Erro ao registrar aceite. Tente novamente.")
        return
      }
      // Recarrega o Server Component — a verificação pendente desaparecerá
      router.refresh()
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>

        <div className="bg-white rounded-round border border-gray-200 p-8">

          {/* Cabeçalho */}
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-round bg-primary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck size={20} className="text-primary" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">
                {isUpdate
                  ? "Atualizamos nossos documentos"
                  : "Aceite necessário para continuar"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isUpdate
                  ? "Para continuar usando o bemoo, leia e aceite os documentos atualizados."
                  : "Leia e aceite os documentos abaixo para começar a usar a plataforma."}
              </p>
            </div>
          </div>

          {/* Cards de versão */}
          <div className="space-y-3 mb-6">
            {versions.map((v) => {
              const { label, href, Icon } = DOC_META[v.type as keyof typeof DOC_META]
              const checked = !!accepted[v.id]
              return (
                <label
                  key={v.id}
                  className={[
                    "flex items-start gap-3 p-4 rounded-round border cursor-pointer transition-colors",
                    checked
                      ? "border-primary bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(v.id, e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Título + badge de versão */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon size={14} className="text-gray-500 flex-shrink-0" strokeWidth={2} />
                      <span className="text-sm font-medium text-gray-900">{label}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                        v{v.version}
                      </span>
                    </div>

                    {/* Resumo das mudanças (opcional) */}
                    {v.summary && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{v.summary}</p>
                    )}

                    {/* Link para o documento completo */}
                    <Link
                      href={href}
                      target="_blank"
                      className="text-xs text-primary underline hover:text-primary-700 mt-1.5 inline-block"
                    >
                      Ler documento completo ↗
                    </Link>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {/* Botão */}
          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full"
            disabled={!allAccepted}
            loading={loading}
            onClick={handleConfirm}
          >
            Confirmar e continuar
          </Button>

          <p className="text-xs text-gray-400 text-center mt-3">
            Ao confirmar, você registra formalmente sua concordância com os documentos listados.
          </p>
        </div>
      </div>
    </div>
  )
}
