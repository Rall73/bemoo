"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { BemooLogo } from "@/components/Logo"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError("E-mail ou senha incorretos.")
    } else {
      router.push("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-round border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Entrar</h1>
          <p className="text-sm text-gray-500 mb-6">Acesse a sua conta bemoo.</p>

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
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock size={16} />}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2"
            >
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} bemoo — todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
