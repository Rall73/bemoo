"use client"

import type { Metadata } from "next"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BemooLogo } from "@/components/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { MODULES_CONFIG } from "@/lib/modules"
import { Building2, Mail, ArrowLeft } from "lucide-react"

// Nota: "use client" não permite export de metadata — título é definido no layout

const PLAN_OPTIONS = [
  { value: "FREE",         label: "Free",          desc: "3 usuários · 1 módulo" },
  { value: "STARTER",      label: "Starter",       desc: "10 usuários · 3 módulos" },
  { value: "PROFESSIONAL", label: "Professional",  desc: "50 usuários · 5 módulos" },
  { value: "ENTERPRISE",   label: "Enterprise",    desc: "Ilimitado" },
]

export default function NovaEmpresaPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", plan: "FREE" })
  const [modules, setModules] = useState<string[]>([])
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState("")
  const [success, setSuccess] = useState("")

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: "" }))
  }

  function toggleModule(key: string) {
    setModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError("")
    const errs: Record<string, string> = {}
    if (!form.name.trim())  errs.name  = "Nome obrigatório"
    if (!form.email.trim()) errs.email = "E-mail obrigatório"
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch("/api/plataforma/empresas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, modules }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.errors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(json.errors)) mapped[k] = (v as string[])[0]
          setErrors(mapped)
        } else {
          setGlobalError(json.message ?? "Erro ao criar empresa.")
        }
        return
      }
      setSuccess(`Empresa "${json.data.name}" criada! Um e-mail de acesso foi enviado para ${json.data.email}.`)
      setTimeout(() => router.push(`/plataforma/empresas/${json.data.id}`), 2000)
    } catch {
      setGlobalError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-4xl mb-4">✅</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Empresa criada!</h2>
        <p className="text-sm text-gray-500">{success}</p>
        <p className="text-xs text-gray-400 mt-2">Redirecionando…</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/plataforma/empresas" className="p-1.5 text-gray-400 hover:text-gray-700 rounded-soft hover:bg-gray-100">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            Nova empresa
          </h1>
          <p className="text-sm text-gray-500">Cria a empresa, o usuário admin e envia o e-mail de acesso.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da empresa */}
        <section className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Dados da empresa</h2>
          <Input
            label="Nome da empresa"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Acme Ltda"
            icon={<Building2 size={16} />}
            error={errors.name}
            required
          />
          <Input
            label="E-mail do administrador"
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="admin@empresa.com"
            icon={<Mail size={16} />}
            error={errors.email}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plano inicial</label>
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
        </section>

        {/* Módulos iniciais */}
        <section className="bg-white border border-gray-200 rounded-round p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Módulos (opcional)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MODULES_CONFIG.map((mod) => {
              const checked = modules.includes(mod.key)
              return (
                <label
                  key={mod.key}
                  className={`flex items-center gap-2 p-3 border rounded-soft cursor-pointer transition-colors ${
                    checked ? "border-primary bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(mod.key)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-800">{mod.label}</span>
                </label>
              )
            })}
          </div>
        </section>

        {globalError && (
          <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
            {globalError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/plataforma/empresas">
            <Button type="button" variant="secondary" size="md">Cancelar</Button>
          </Link>
          <Button type="submit" variant="primary" size="md" loading={loading}>
            Criar empresa
          </Button>
        </div>
      </form>
    </div>
  )
}
