"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Building2, Mail, FileText, CircleCheck } from "lucide-react"

const PLAN_LABEL: Record<string, { label: string; color: string }> = {
  FREE:         { label: "Free",         color: "bg-gray-100 text-gray-600" },
  STARTER:      { label: "Starter",      color: "bg-blue-50 text-blue-700" },
  PROFESSIONAL: { label: "Professional", color: "bg-primary-50 text-primary" },
  ENTERPRISE:   { label: "Enterprise",   color: "bg-accent-100 text-accent" },
}

interface Props {
  company: {
    name:      string
    document:  string
    email:     string
    plan:      string
    createdAt: string
  }
  isAdmin: boolean
}

export function EmpresaConfigClient({ company, isAdmin }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name:     company.name,
    document: company.document,
    email:    company.email,
  })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState(false)

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSuccess(false)
    setError("")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess(false)
    try {
      const res = await fetch("/api/configuracoes/empresa", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (res.ok) {
        setSuccess(true)
        router.refresh()
      } else {
        setError(json.message ?? "Erro ao salvar.")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const plan = PLAN_LABEL[company.plan] ?? { label: company.plan, color: "bg-gray-100 text-gray-600" }

  return (
    <div className="space-y-5">
      {/* Card: plano + data */}
      <div className="bg-white border border-gray-200 rounded-round p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Plano atual</p>
          <span className={`text-sm font-medium px-2.5 py-1 rounded ${plan.color}`}>
            {plan.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Membro desde</p>
          <p className="text-sm text-gray-700">
            {new Date(company.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Card: dados editáveis */}
      <form onSubmit={handleSave}>
        <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Dados cadastrais</h2>

          <Input
            label="Nome da empresa"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            icon={<Building2 size={16} />}
            disabled={!isAdmin}
            required
          />
          <Input
            label="CNPJ / CPF (opcional)"
            value={form.document}
            onChange={(e) => setField("document", e.target.value)}
            icon={<FileText size={16} />}
            placeholder="00.000.000/0000-00"
            disabled={!isAdmin}
          />
          <Input
            label="E-mail de contato"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            icon={<Mail size={16} />}
            disabled={!isAdmin}
            required
          />

          {!isAdmin && (
            <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-soft px-3 py-2">
              Apenas administradores podem editar os dados da empresa.
            </p>
          )}

          {error && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-success bg-green-50 border border-green-100 rounded-soft px-3 py-2 flex items-center gap-1.5">
              <CircleCheck size={13} strokeWidth={2} /> Dados salvos com sucesso.
            </p>
          )}

          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={saving}>
                Salvar alterações
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
