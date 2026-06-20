"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BemooLogo } from "@/components/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { User, Lock, Eye, EyeOff, Building2 } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  ADMIN:    "Administrador",
  GESTOR:   "Gestor",
  EXECUTOR: "Executor",
  AUDITOR:  "Auditor",
}

interface Props {
  token:       string
  email:       string
  role:        string
  companyName: string
}

export function AceitarConviteForm({ token, email, role, companyName }: Props) {
  const router = useRouter()
  const [name,     setName]     = useState("")
  const [password, setPassword] = useState("")
  const [confirm,  setConfirm]  = useState("")
  const [showPass, setShowPass] = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(false)
  const [globalError, setGlobalError] = useState("")

  function clearErr(field: string) {
    setErrors((e) => ({ ...e, [field]: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError("")

    const errs: Record<string, string> = {}
    if (!name.trim())              errs.name     = "Nome obrigatório"
    if (password.length < 8)       errs.password = "Mínimo 8 caracteres"
    if (!/[0-9]/.test(password))   errs.password = "Deve conter pelo menos um número"
    if (password !== confirm)       errs.confirm  = "As senhas não coincidem"
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch("/api/aceitar-convite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, name, password, confirm }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.errors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(json.errors)) {
            mapped[k] = (v as string[])[0]
          }
          setErrors(mapped)
        } else {
          setGlobalError(json.message ?? "Erro ao aceitar convite.")
        }
        return
      }

      // Aceito com sucesso — tentar login automático
      const login = await signIn("credentials", { email, password, redirect: false })
      if (login?.error) {
        // Auto-login falhou — redirecionar para login com mensagem de sucesso
        router.push("/login?novo=1")
      } else {
        // Login OK — dashboard vai mostrar LegalGate se houver termos pendentes
        router.push("/dashboard")
      }
    } catch {
      setGlobalError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>

        <div className="bg-white rounded-round border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Você foi convidado!</h1>

          {/* Info do convite */}
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-soft px-3 py-2.5 mb-6">
            <Building2 size={14} className="text-primary flex-shrink-0" strokeWidth={2} />
            <div className="text-xs text-primary-700">
              <span className="font-medium">{companyName}</span>
              {" "}· papel: <span className="font-medium">{ROLE_LABELS[role] ?? role}</span>
            </div>
          </div>

          {/* E-mail bloqueado (não editável) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <div className="w-full px-3 py-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-soft">
              {email}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Seu nome completo"
              value={name}
              onChange={(e) => { setName(e.target.value); clearErr("name") }}
              placeholder="Nome Sobrenome"
              icon={<User size={16} />}
              error={errors.name}
              required
              autoFocus
            />
            <Input
              label="Criar senha"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearErr("password") }}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowPass((v) => !v)} tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password}
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); clearErr("confirm") }}
              placeholder="Repita a senha"
              icon={<Lock size={16} />}
              error={errors.confirm}
              required
            />

            {globalError && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {globalError}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
              Criar conta e entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
