"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { User, Lock, Eye, EyeOff, CircleCheck } from "lucide-react"

const ROLE_LABEL: Record<string, string> = {
  ADMIN:    "Administrador",
  GESTOR:   "Gestor",
  EXECUTOR: "Executor",
  AUDITOR:  "Auditor",
}

interface Props {
  user: {
    name:        string
    email:       string
    role:        string
    createdAt:   string
    hasPassword: boolean
  }
}

export function ContaConfigClient({ user }: Props) {
  const router = useRouter()

  // ─── Dados pessoais
  const [name,        setName]        = useState(user.name)
  const [savingName,  setSavingName]  = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError,   setNameError]   = useState("")

  // ─── Senha
  const [passwords, setPasswords] = useState({
    current: "", newPass: "", confirm: "",
  })
  const [showPass,   setShowPass]   = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passSuccess,setPassSuccess]= useState(false)
  const [passError,  setPassError]  = useState<Record<string, string>>({})

  // ─── Salvar nome
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name === user.name) return
    setSavingName(true)
    setNameError("")
    setNameSuccess(false)
    try {
      const res = await fetch("/api/configuracoes/conta", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name }),
      })
      const json = await res.json()
      if (res.ok) { setNameSuccess(true); router.refresh() }
      else setNameError(json.message ?? "Erro ao salvar.")
    } catch { setNameError("Erro de conexão.") }
    finally { setSavingName(false) }
  }

  // ─── Salvar senha
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassError({})
    setPassSuccess(false)

    const errs: Record<string, string> = {}
    if (!passwords.current) errs.current = "Informe a senha atual"
    if (passwords.newPass.length < 8) errs.newPass = "Mínimo 8 caracteres"
    if (!/[0-9]/.test(passwords.newPass)) errs.newPass = "Deve conter pelo menos um número"
    if (passwords.newPass !== passwords.confirm) errs.confirm = "As senhas não coincidem"
    if (Object.keys(errs).length) { setPassError(errs); return }

    setSavingPass(true)
    try {
      const res = await fetch("/api/configuracoes/conta", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          currentPassword: passwords.current,
          newPassword:     passwords.newPass,
          confirmPassword: passwords.confirm,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setPassSuccess(true)
        setPasswords({ current: "", newPass: "", confirm: "" })
      } else {
        if (json.errors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(json.errors)) mapped[k] = (v as string[])[0]
          setPassError(mapped)
        } else {
          setPassError({ _: json.message ?? "Erro ao alterar senha." })
        }
      }
    } catch { setPassError({ _: "Erro de conexão." }) }
    finally { setSavingPass(false) }
  }

  return (
    <div className="space-y-5">
      {/* Card: perfil */}
      <div className="bg-white border border-gray-200 rounded-round p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
            {!user.hasPassword && (
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                Google
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Membro desde</p>
          <p className="text-xs text-gray-600">
            {new Date(user.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo",
            })}
          </p>
        </div>
      </div>

      {/* Card: nome */}
      <form onSubmit={handleSaveName}>
        <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Nome de exibição</h2>
          <Input
            label="Seu nome"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSuccess(false); setNameError("") }}
            icon={<User size={16} />}
            required
          />
          {nameError && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
              {nameError}
            </p>
          )}
          {nameSuccess && (
            <p className="text-xs text-success bg-green-50 border border-green-100 rounded-soft px-3 py-2 flex items-center gap-1.5">
              <CircleCheck size={13} strokeWidth={2} /> Nome atualizado.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={savingName}
              disabled={!name.trim() || name === user.name}
            >
              Salvar nome
            </Button>
          </div>
        </div>
      </form>

      {/* Card: senha */}
      {user.hasPassword ? (
        <form onSubmit={handleSavePassword}>
          <div className="bg-white border border-gray-200 rounded-round p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Alterar senha</h2>
            <Input
              label="Senha atual"
              type={showPass ? "text" : "password"}
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              icon={<Lock size={16} />}
              error={passError.current ?? passError.currentPassword}
              required
            />
            <Input
              label="Nova senha"
              type={showPass ? "text" : "password"}
              value={passwords.newPass}
              onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
              icon={<Lock size={16} />}
              placeholder="Mínimo 8 caracteres com um número"
              error={passError.newPass ?? passError.newPassword}
              required
            />
            <Input
              label="Confirmar nova senha"
              type={showPass ? "text" : "password"}
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              icon={<Lock size={16} />}
              error={passError.confirm ?? passError.confirmPassword}
              required
            />

            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={showPass}
                onChange={(e) => setShowPass(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Eye size={13} /> Mostrar senhas
              </span>
            </label>

            {passError._ && (
              <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
                {passError._}
              </p>
            )}
            {passSuccess && (
              <p className="text-xs text-success bg-green-50 border border-green-100 rounded-soft px-3 py-2 flex items-center gap-1.5">
                <CircleCheck size={13} strokeWidth={2} /> Senha alterada com sucesso.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" loading={savingPass}>
                Alterar senha
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-gray-200 rounded-round p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Senha</h2>
          <p className="text-sm text-gray-500">
            Sua conta usa <strong>login com Google</strong>. Não é necessário definir uma senha.
          </p>
        </div>
      )}
    </div>
  )
}
