"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Building2, Mail, FileText, CircleCheck, CircleX,
  Save, AlertTriangle,
} from "lucide-react"

// ─── Tipos ───────────────────────────────────────────────────────────

interface Company {
  id:          number
  name:        string
  email:       string
  document:    string
  plan:        string
  maxUsers:    number | null
  suspendedAt: string | null
}

interface User {
  id:        number
  name:      string
  email:     string
  role:      string
  createdAt: string
}

interface Props {
  company:        Company
  users:          User[]
  enabledModules: string[]
}

// ─── Constantes ──────────────────────────────────────────────────────

const PLAN_OPTIONS = [
  { value: "FREE",         label: "Free",         desc: "3 usuários · 1 módulo" },
  { value: "STARTER",      label: "Starter",      desc: "10 usuários · 3 módulos" },
  { value: "PROFESSIONAL", label: "Professional", desc: "50 usuários · 5 módulos" },
  { value: "ENTERPRISE",   label: "Enterprise",   desc: "Ilimitado" },
]

const ROLE_LABEL: Record<string, string> = {
  ADMIN:    "Admin",
  GESTOR:   "Gestor",
  EXECUTOR: "Executor",
  AUDITOR:  "Auditor",
}

const ROLE_CLASS: Record<string, string> = {
  ADMIN:    "bg-primary-50 text-primary",
  GESTOR:   "bg-blue-50 text-blue-700",
  EXECUTOR: "bg-gray-100 text-gray-600",
  AUDITOR:  "bg-yellow-50 text-yellow-700",
}

// ─── Componente ──────────────────────────────────────────────────────

export function EmpresaClient({ company, users, enabledModules }: Props) {
  const router = useRouter()

  // ─── Estado do formulário
  const [form, setForm] = useState({
    name:     company.name,
    email:    company.email,
    document: company.document,
    plan:     company.plan,
    maxUsers: company.maxUsers !== null ? String(company.maxUsers) : "",
  })
  const [saving,        setSaving]        = useState(false)
  const [saveError,     setSaveError]     = useState("")
  const [saveSuccess,   setSaveSuccess]   = useState(false)
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [suspendError,  setSuspendError]  = useState("")

  const suspended = !!company.suspendedAt

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaveSuccess(false)
    setSaveError("")
  }

  // ─── Salvar dados da empresa
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/plataforma/empresas/${company.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:     form.name.trim(),
          email:    form.email.trim(),
          document: form.document.trim(),
          plan:     form.plan,
          maxUsers: form.maxUsers.trim() !== "" ? parseInt(form.maxUsers) : null,
        }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        router.refresh()
      } else {
        const j = await res.json()
        setSaveError(j.message ?? "Erro ao salvar.")
      }
    } catch {
      setSaveError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  // ─── Suspender / Reativar
  async function handleToggleSuspend() {
    const action = suspended ? "reactivate" : "suspend"
    setSuspendLoading(true)
    setSuspendError("")
    try {
      const res = await fetch(`/api/plataforma/empresas/${company.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const j = await res.json()
        setSuspendError(j.message ?? "Erro na operação.")
      }
    } catch {
      setSuspendError("Erro de conexão. Tente novamente.")
    } finally {
      setSuspendLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status banner se suspensa */}
      {suspended && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-round text-sm text-error">
          <CircleX size={16} strokeWidth={2} className="flex-shrink-0" />
          <span>
            Esta empresa está suspensa desde{" "}
            {new Date(company.suspendedAt!).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
            })}.
          </span>
        </div>
      )}

      {/* ─── Card: Dados da empresa ─────────────────────────── */}
      <form onSubmit={handleSave}>
        <section className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Dados da empresa</h2>

          <Input
            label="Nome da empresa"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            icon={<Building2 size={16} />}
            required
          />
          <Input
            label="E-mail do administrador"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            icon={<Mail size={16} />}
            required
          />
          <Input
            label="CNPJ / CPF (opcional)"
            value={form.document}
            onChange={(e) => setField("document", e.target.value)}
            icon={<FileText size={16} />}
            placeholder="00.000.000/0000-00"
          />

          {/* Plano */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLAN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-col p-3 border rounded-soft cursor-pointer transition-colors ${
                    form.plan === opt.value
                      ? "border-primary bg-primary-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={opt.value}
                    checked={form.plan === opt.value}
                    onChange={() => setField("plan", opt.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Limite customizado de usuários */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite de usuários
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(override — deixe vazio para usar o padrão do plano)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={9999}
                value={form.maxUsers}
                onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
                placeholder={
                  form.plan === "FREE" ? "3 (padrão do plano)" :
                  form.plan === "STARTER" ? "10 (padrão do plano)" :
                  form.plan === "PROFESSIONAL" ? "30 (padrão do plano)" :
                  "Ilimitado (padrão do plano)"
                }
                className="w-40 px-3 py-2 text-sm text-gray-800 bg-white border border-gray-200 rounded-soft focus:outline-none focus:border-primary"
              />
              {form.maxUsers.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, maxUsers: "" }))}
                  className="text-xs text-gray-400 hover:text-error"
                >
                  Usar padrão
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Padrões: FREE=3 · STARTER=10 · PROFESSIONAL=30 · ENTERPRISE=ilimitado
            </p>
          </div>

          {saveError && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
              {saveError}
            </p>
          )}
          {saveSuccess && (
            <p className="text-xs text-success bg-green-50 border border-green-100 rounded-soft px-3 py-2 flex items-center gap-1.5">
              <CircleCheck size={13} strokeWidth={2} /> Dados salvos com sucesso.
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="md" loading={saving}>
              <Save size={14} strokeWidth={2} />
              Salvar alterações
            </Button>
          </div>
        </section>
      </form>

      {/* ─── Card: Suspensão ────────────────────────────────── */}
      <section className={`bg-white border rounded-round p-5 ${suspended ? "border-red-200" : "border-gray-200"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">
              {suspended ? "Empresa suspensa" : "Suspender empresa"}
            </h2>
            <p className="text-xs text-gray-500">
              {suspended
                ? "Reativar libera o acesso de todos os usuários desta empresa."
                : "Suspender bloqueia o acesso de todos os usuários desta empresa imediatamente."}
            </p>
            {suspendError && (
              <p className="text-xs text-error mt-1">{suspendError}</p>
            )}
          </div>
          <Button
            type="button"
            variant={suspended ? "primary" : "secondary"}
            size="md"
            loading={suspendLoading}
            onClick={handleToggleSuspend}
          >
            {suspended ? (
              <><CircleCheck size={14} strokeWidth={2} /> Reativar</>
            ) : (
              <><AlertTriangle size={14} strokeWidth={2} /> Suspender</>
            )}
          </Button>
        </div>
      </section>

      {/* ─── Card: Módulos habilitados ───────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-round p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Módulos habilitados</h2>
          <span className="text-xs text-gray-400">{enabledModules.length} ativo{enabledModules.length !== 1 ? "s" : ""}</span>
        </div>
        {enabledModules.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum módulo habilitado.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {enabledModules.map((m) => (
              <span
                key={m}
                className="text-xs font-medium px-2.5 py-1 bg-primary-50 text-primary border border-primary-100 rounded-soft capitalize"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ─── Card: Usuários ─────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-round overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Usuários</h2>
          <span className="text-xs text-gray-400">{users.length} usuário{users.length !== 1 ? "s" : ""}</span>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum usuário.</p>
        ) : (
          <div>
            {/* Header */}
            <div className="hidden md:grid grid-cols-[1fr_1.4fr_0.7fr_0.8fr] gap-4 px-5 py-2.5 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <span>Nome</span>
              <span>E-mail</span>
              <span>Papel</span>
              <span>Desde</span>
            </div>
            {users.map((u, idx) => (
              <div
                key={u.id}
                className={`grid grid-cols-1 md:grid-cols-[1fr_1.4fr_0.7fr_0.8fr] gap-2 md:gap-4 px-5 py-3 items-center ${
                  idx < users.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate">{u.name}</span>
                </div>
                <span className="text-xs text-gray-500 truncate">{u.email}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${ROLE_CLASS[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
