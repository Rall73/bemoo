"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { BemooLogo } from "@/components/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Building2, Mail, Lock, Eye, EyeOff } from "lucide-react"

export default function CadastroPage() {
  const [form, setForm] = useState({ empresa: "", email: "", password: "", confirm: "" })
  const [termos, setTermos] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState("")

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: "" }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError("")

    // Validação client-side básica
    const errs: Record<string, string> = {}
    if (!form.empresa.trim())        errs.empresa  = "Nome da empresa obrigatório"
    if (!form.email.trim())          errs.email    = "E-mail obrigatório"
    if (form.password.length < 8)    errs.password = "Mínimo 8 caracteres"
    if (!/[0-9]/.test(form.password)) errs.password = "Deve conter pelo menos um número"
    if (form.password !== form.confirm) errs.confirm = "As senhas não coincidem"
    if (!termos)                     errs.termos   = "Você deve aceitar os termos"

    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: form.empresa, email: form.email, password: form.password, termos: true }),
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
          setGlobalError(json.message ?? "Erro ao criar conta.")
        }
        return
      }

      // Cadastro OK → fazer login automaticamente
      const login = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
      })

      if (login?.error) {
        setGlobalError("Conta criada, mas houve erro ao entrar. Tente fazer login.")
      } else {
        window.location.href = "/dashboard"
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
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Criar conta</h1>
          <p className="text-sm text-gray-500 mb-6">Comece grátis. Sem cartão de crédito.</p>

          {/* Google */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-soft px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors mb-4"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome da empresa"
              value={form.empresa}
              onChange={(e) => set("empresa", e.target.value)}
              placeholder="Minha Empresa Ltda"
              icon={<Building2 size={16} />}
              error={errors.empresa}
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="voce@empresa.com"
              icon={<Mail size={16} />}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Mínimo 8 caracteres"
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.password}
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Repita a senha"
              icon={<Lock size={16} />}
              error={errors.confirm}
              required
            />

            {/* Termos */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termos}
                  onChange={(e) => { setTermos(e.target.checked); setErrors((er) => ({ ...er, termos: "" })) }}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-xs text-gray-600">
                  Li e aceito os{" "}
                  <Link href="/termos" target="_blank" className="text-primary underline">Termos de Uso</Link>
                  {" "}e a{" "}
                  <Link href="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</Link>
                </span>
              </label>
              {errors.termos && <p className="text-xs text-error mt-1">{errors.termos}</p>}
            </div>

            {globalError && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {globalError}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-2">
              Criar conta
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
