"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, RotateCcw, Trash2, X, Mail, Shield, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

// ─── Tipos ────────────────────────────────────────────────────────

type Role = "ADMIN" | "GESTOR" | "EXECUTOR" | "AUDITOR"

interface Usuario {
  id:        number
  name:      string
  email:     string
  role:      string
  createdAt: string
}

interface Invite {
  id:        number
  email:     string
  role:      string
  expiresAt: string
  createdAt: string
}

interface Props {
  users:         Usuario[]
  invites:       Invite[]
  currentUserId: number
  isAdmin:       boolean
  plan:          string
  userLimit:     number | null   // null = ilimitado
  activeCount:   number
}

// ─── Configurações de papel ────────────────────────────────────────

const ROLE_CONFIG: Record<Role, { label: string; desc: string; className: string }> = {
  ADMIN:    { label: "Admin",    desc: "Acesso total",               className: "bg-primary-50 text-primary border-primary-100" },
  GESTOR:   { label: "Gestor",   desc: "Cria, edita e vê relatórios",className: "bg-blue-50 text-blue-700 border-blue-100" },
  EXECUTOR: { label: "Executor", desc: "Registros próprios",         className: "bg-gray-100 text-gray-600 border-gray-200" },
  AUDITOR:  { label: "Auditor",  desc: "Somente leitura",            className: "bg-yellow-50 text-yellow-700 border-yellow-100" },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as Role] ?? { label: role, desc: "", className: "bg-gray-100 text-gray-600 border-gray-200" }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

// ─── Modal de convite ──────────────────────────────────────────────

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (msg: string) => void }) {
  const [email,   setEmail]   = useState("")
  const [role,    setRole]    = useState<Role>("EXECUTOR")
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError("")
    setErrors({})
    if (!email.trim()) { setErrors({ email: "E-mail obrigatório" }); return }

    setLoading(true)
    try {
      const res = await fetch("/api/usuarios/convite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), role }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.errors) {
          const mapped: Record<string, string> = {}
          for (const [k, v] of Object.entries(json.errors)) mapped[k] = (v as string[])[0]
          setErrors(mapped)
        } else {
          setGlobalError(json.message ?? "Erro ao enviar convite.")
        }
        return
      }
      // Convite criado mas e-mail com falha de entrega
      onSuccess(json.message ?? "Convite enviado com sucesso!")
    } catch {
      setGlobalError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-round border border-gray-200 shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Convidar colaborador</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-soft hover:bg-gray-100">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors({}) }}
            placeholder="colaborador@empresa.com"
            icon={<Mail size={16} />}
            error={errors.email}
            required
            autoFocus
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-soft focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([key, { label, desc }]) => (
                <option key={key} value={key}>{label} — {desc}</option>
              ))}
            </select>
          </div>

          {globalError && (
            <p className="text-xs text-error bg-red-50 border border-red-100 rounded-soft px-3 py-2">
              {globalError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              Enviar convite
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Dialog de confirmação ─────────────────────────────────────────

function ConfirmDialog({
  title, message, confirmLabel, onConfirm, onClose, loading,
}: {
  title:        string
  message:      string
  confirmLabel: string
  onConfirm:    () => void
  onClose:      () => void
  loading:      boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-round border border-gray-200 shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" size="sm" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free", STARTER: "Starter", PROFESSIONAL: "Professional", ENTERPRISE: "Enterprise",
}

export function UsuariosClient({ users, invites, currentUserId, isAdmin, plan, userLimit, activeCount }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showInviteModal,  setShowInviteModal]  = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<Usuario | null>(null)
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<Invite | null>(null)
  const [actionLoading,    setActionLoading]    = useState<string | null>(null)
  const [roleLoading,      setRoleLoading]      = useState<number | null>(null)
  const [feedback,         setFeedback]         = useState("")

  function refresh() {
    startTransition(() => router.refresh())
  }

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(""), 3000)
  }

  // ── Alterar papel ────────────────────────────────────────────────

  async function handleRoleChange(userId: number, newRole: string) {
    setRoleLoading(userId)
    try {
      const res = await fetch(`/api/usuarios/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role: newRole }),
      })
      if (res.ok) { showFeedback("Papel atualizado."); refresh() }
      else        { const j = await res.json(); showFeedback(j.message ?? "Erro ao atualizar papel.") }
    } catch { showFeedback("Erro de conexão.") }
    finally { setRoleLoading(null) }
  }

  // ── Desativar usuário ────────────────────────────────────────────

  async function handleDeactivate(user: Usuario) {
    setActionLoading(`deactivate-${user.id}`)
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, { method: "DELETE" })
      if (res.ok || res.status === 204) { showFeedback(`${user.name} foi desativado.`); refresh() }
      else { const j = await res.json(); showFeedback(j.message ?? "Erro ao desativar.") }
    } catch { showFeedback("Erro de conexão.") }
    finally { setActionLoading(null); setConfirmDeactivate(null) }
  }

  // ── Cancelar convite ─────────────────────────────────────────────

  async function handleCancelInvite(invite: Invite) {
    setActionLoading(`cancel-${invite.id}`)
    try {
      const res = await fetch(`/api/usuarios/convite/${invite.id}`, { method: "DELETE" })
      if (res.ok || res.status === 204) { showFeedback("Convite cancelado."); refresh() }
      else { const j = await res.json(); showFeedback(j.message ?? "Erro ao cancelar.") }
    } catch { showFeedback("Erro de conexão.") }
    finally { setActionLoading(null); setConfirmCancelInvite(null) }
  }

  // ── Reenviar convite ─────────────────────────────────────────────

  async function handleResendInvite(inviteId: number) {
    setActionLoading(`resend-${inviteId}`)
    try {
      const res = await fetch(`/api/usuarios/convite/${inviteId}`, { method: "POST" })
      const j   = await res.json()
      if (res.ok) { showFeedback(j.message ?? "Convite reenviado com novo prazo de 48h."); refresh() }
      else { showFeedback(j.message ?? "Erro ao reenviar.") }
    } catch { showFeedback("Erro de conexão.") }
    finally { setActionLoading(null) }
  }

  return (
    <>
      {/* Modais */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={(msg) => { setShowInviteModal(false); showFeedback(msg); refresh() }}
        />
      )}
      {confirmDeactivate && (
        <ConfirmDialog
          title={`Desativar ${confirmDeactivate.name}?`}
          message="O usuário perderá acesso imediatamente. Esta ação não pode ser desfeita pelo painel."
          confirmLabel="Desativar"
          onConfirm={() => handleDeactivate(confirmDeactivate)}
          onClose={() => setConfirmDeactivate(null)}
          loading={actionLoading === `deactivate-${confirmDeactivate.id}`}
        />
      )}
      {confirmCancelInvite && (
        <ConfirmDialog
          title="Cancelar convite?"
          message={`O link enviado para ${confirmCancelInvite.email} deixará de funcionar.`}
          confirmLabel="Cancelar convite"
          onConfirm={() => handleCancelInvite(confirmCancelInvite)}
          onClose={() => setConfirmCancelInvite(null)}
          loading={actionLoading === `cancel-${confirmCancelInvite.id}`}
        />
      )}

      {/* Conteúdo */}
      <div className="p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
              Usuários
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-sm text-gray-500">
                {userLimit !== null
                  ? `${activeCount} de ${userLimit} usuário${userLimit !== 1 ? "s" : ""} usados`
                  : `${activeCount} usuário${activeCount !== 1 ? "s" : ""}`
                }
              </p>
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                Plano {PLAN_LABEL[plan] ?? plan}
              </span>
              {userLimit !== null && activeCount >= userLimit && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-error border border-red-100">
                  Limite atingido
                </span>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="primary"
                size="md"
                onClick={() => userLimit === null || activeCount < userLimit ? setShowInviteModal(true) : null}
                disabled={userLimit !== null && activeCount >= userLimit}
                title={userLimit !== null && activeCount >= userLimit
                  ? `Limite de ${userLimit} usuários atingido. Entre em contato para upgrade.`
                  : undefined}
              >
                <UserPlus size={16} strokeWidth={2} />
                Convidar pessoa
              </Button>
              {userLimit !== null && activeCount >= userLimit && (
                <p className="text-[11px] text-gray-400">
                  Limite do plano atingido — entre em contato para upgrade
                </p>
              )}
            </div>
          )}
        </div>

        {/* Toast de feedback */}
        {feedback && (
          <div className="mb-4 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-round text-sm text-primary-700">
            {feedback}
          </div>
        )}

        {/* ── Membros ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Membros ({users.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-round overflow-hidden">
            {users.map((user, idx) => {
              const isMe = user.id === currentUserId
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 px-4 py-3.5 ${idx < users.length - 1 ? "border-b border-gray-100" : ""}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-primary text-white text-sm flex items-center justify-center font-semibold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      {isMe && <span className="text-xs text-gray-400">(você)</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  {/* Papel */}
                  <div className="flex-shrink-0">
                    {isAdmin && !isMe ? (
                      <div className="relative flex items-center gap-1">
                        <select
                          value={user.role}
                          disabled={roleLoading === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="appearance-none pl-2 pr-6 py-1 text-xs font-medium border rounded bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
                        >
                          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </div>

                  {/* Data de entrada */}
                  <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block w-24 text-right">
                    desde {formatDate(user.createdAt)}
                  </p>

                  {/* Ações */}
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => setConfirmDeactivate(user)}
                      disabled={actionLoading === `deactivate-${user.id}`}
                      title="Desativar usuário"
                      className="p-1.5 text-gray-400 hover:text-error hover:bg-red-50 rounded-soft transition-colors flex-shrink-0 disabled:opacity-40"
                    >
                      <Trash2 size={15} strokeWidth={2} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Convites pendentes ───────────────────────────────────── */}
        {invites.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Convites pendentes ({invites.filter((i) => !isExpired(i.expiresAt)).length})
              {invites.some((i) => isExpired(i.expiresAt)) && (
                <span className="ml-2 text-gray-400 normal-case font-normal">
                  · {invites.filter((i) => isExpired(i.expiresAt)).length} expirado(s)
                </span>
              )}
            </h2>
            <div className="bg-white border border-gray-200 rounded-round overflow-hidden">
              {invites.map((invite, idx) => {
                const expired = isExpired(invite.expiresAt)
                return (
                  <div
                    key={invite.id}
                    className={`flex items-center gap-4 px-4 py-3.5 ${idx < invites.length - 1 ? "border-b border-gray-100" : ""} ${expired ? "opacity-60" : ""}`}
                  >
                    {/* Ícone */}
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Mail size={14} className="text-gray-400" strokeWidth={2} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{invite.email}</p>
                      <p className="text-xs text-gray-400">
                        Enviado em {formatDate(invite.createdAt)}
                        {expired
                          ? " · expirado"
                          : ` · expira em ${formatDate(invite.expiresAt)}`}
                      </p>
                    </div>

                    {/* Papel */}
                    <RoleBadge role={invite.role} />

                    {/* Status */}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${
                      expired ? "bg-gray-100 text-gray-500" : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {expired ? "Expirado" : "Pendente"}
                    </span>

                    {/* Ações */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          disabled={actionLoading === `resend-${invite.id}`}
                          title="Reenviar convite"
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-soft transition-colors disabled:opacity-40"
                        >
                          <RotateCcw size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => setConfirmCancelInvite(invite)}
                          disabled={!!actionLoading}
                          title="Cancelar convite"
                          className="p-1.5 text-gray-400 hover:text-error hover:bg-red-50 rounded-soft transition-colors disabled:opacity-40"
                        >
                          <X size={15} strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Shield size={11} strokeWidth={2} />
              Convites expirados podem ser reenviados com novo prazo de 48h.
            </p>
          </section>
        )}

        {/* Estado vazio */}
        {users.length === 1 && invites.length === 0 && isAdmin && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm mb-3">Sua equipe está só com você por enquanto.</p>
            <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={15} strokeWidth={2} />
              Convidar o primeiro colaborador
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
