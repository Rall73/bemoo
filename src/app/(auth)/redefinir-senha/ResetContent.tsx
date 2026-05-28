"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Mail, Lock, CheckCircle } from "lucide-react"

// ─── Passo 1: solicitar reset (sem token na URL) ──────────────────

function SolicitarReset() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await fetch("/api/auth/redefinir-senha", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      })
      // Sempre mostrar sucesso (não revelar se e-mail existe)
      setSent(true)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
            <CheckCircle size={24} className="text-primary" strokeWidth={2} />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-500 mb-6">
          Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá
          um link para redefinir sua senha em breve.
        </p>
        <Link href="/login" className="text-sm text-primary font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Esqueceu a senha?</h1>
      <p className="text-sm text-gray-500 mb-6">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com"
          icon={<Mail size={16} />}
          required
          autoComplete="email"
        />

        {error && (
          <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
          Enviar link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-primary font-medium hover:underline">
          Voltar para o login
        </Link>
      </p>
    </>
  )
}

// ─── Passo 2: definir nova senha (com token na URL) ───────────────

function NovaSenha({ token }: { token: string }) {
  const [password, setPassword]   = useState("")
  const [confirm, setConfirm]     = useState("")
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) { setError("Mínimo 8 caracteres."); return }
    if (!/[0-9]/.test(password)) { setError("Deve conter pelo menos um número."); return }
    if (password !== confirm) { setError("As senhas não coincidem."); return }

    setLoading(true)
    try {
      const res  = await fetch("/api/auth/redefinir-senha/confirmar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password, confirm }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.message ?? "Erro ao redefinir senha.")
        return
      }
      setSuccess(true)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
            <CheckCircle size={24} className="text-primary" strokeWidth={2} />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Senha redefinida!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sua senha foi atualizada com sucesso.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center bg-primary text-white px-5 py-2 rounded-soft text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Nova senha</h1>
      <p className="text-sm text-gray-500 mb-6">
        Escolha uma senha segura com pelo menos 8 caracteres e um número.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nova senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          icon={<Lock size={16} />}
          required
        />
        <Input
          label="Confirmar senha"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repita a nova senha"
          icon={<Lock size={16} />}
          required
        />

        {error && (
          <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
          Salvar nova senha
        </Button>
      </form>
    </>
  )
}

// ─── Componente principal — decide qual passo mostrar ─────────────

export function ResetContent() {
  const params = useSearchParams()
  const token  = params.get("token")

  return token ? <NovaSenha token={token} /> : <SolicitarReset />
}
