"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function TrocarSenhaObrigatoriaForm() {
  const { update } = useSession()
  const router     = useRouter()

  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setGlobalError("")

    setLoading(true)
    try {
      const res = await fetch("/api/auth/trocar-senha-obrigatoria", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password, confirm }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.errors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(json.errors)) mapped[k] = (v as string[])[0]
          setErrors(mapped)
        } else {
          setGlobalError(json.message ?? "Erro ao alterar senha.")
        }
        return
      }

      // Atualiza o JWT para limpar mustChangePassword sem precisar fazer logout
      await update({ mustChangePassword: false })
      router.push("/dashboard")
      router.refresh()
    } catch {
      setGlobalError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative">
          <Input
            label="Nova senha"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors({}) }}
            placeholder="Mínimo 8 caracteres com 1 número"
            icon={<Lock size={16} />}
            error={errors.password}
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirmar nova senha"
            type={showConfirm ? "text" : "password"}
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setErrors({}) }}
            placeholder="Repita a senha"
            icon={<Lock size={16} />}
            error={errors.confirm}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {globalError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {globalError}
          </p>
        )}

        <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
          Salvar senha e entrar
        </Button>
      </form>
    </div>
  )
}
