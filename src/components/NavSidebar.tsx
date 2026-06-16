"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { BemooLogo } from "@/components/Logo"
import { MODULES_CONFIG } from "@/lib/modules"
import {
  CheckSquare, AlertTriangle, Tag, Target, Inbox, Wrench, Users2,
  LayoutDashboard, LogOut, ChevronRight, Users,
  Building2, BarChart2, ScrollText, UserCircle, X, Layers, History,
  Package, Settings2, CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MODULE_ICONS = {
  checklists:      CheckSquare,
  intercorrencias: AlertTriangle,
  rastreabilidade: Tag,
  planos:          Target,
  captura:         Inbox,
  oficina:         Wrench,
  efetivo:         Users2,
} as const

interface NavSidebarProps {
  user: {
    name: string
    email: string
    role: string
    platformAdmin: boolean
  }
  enabledModules: string[]
  onClose?: () => void
}

export function NavSidebar({ user, enabledModules, onClose }: NavSidebarProps) {
  const pathname = usePathname()

  const navModules = MODULES_CONFIG.filter((m) =>
    enabledModules.includes(m.key)
  )

  function handleLinkClick() {
    onClose?.()
  }

  return (
    <aside className="w-64 md:w-56 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* Logo + fechar (mobile) */}
      <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
        <BemooLogo size={22} color="#1F4E4A" />
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-soft text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* Dashboard */}
        <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" current={pathname} onClick={handleLinkClick} />

        {/* Módulos habilitados */}
        {navModules.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Módulos
            </p>
            {navModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.key as keyof typeof MODULE_ICONS]
              return (
                <div key={mod.key}>
                  <NavLink
                    href={mod.href}
                    icon={Icon}
                    label={mod.label}
                    current={pathname}
                    onClick={handleLinkClick}
                  />
                  {/* Sub-links do módulo checklists */}
                  {mod.key === "checklists" && (
                    <NavLink
                      href="/execucoes"
                      icon={History}
                      label="Histórico"
                      current={pathname}
                      onClick={handleLinkClick}
                      indent
                    />
                  )}
                  {/* Sub-links do módulo oficina */}
                  {mod.key === "oficina" && (
                    <>
                      <NavLink href="/oficina/pedidos"   icon={CheckSquare} label="Pedidos"   current={pathname} onClick={handleLinkClick} indent />
                      <NavLink href="/oficina/estoque"   icon={Package}     label="Estoque"   current={pathname} onClick={handleLinkClick} indent />
                      <NavLink href="/oficina/cadastros" icon={Settings2}   label="Cadastros" current={pathname} onClick={handleLinkClick} indent />
                    </>
                  )}
                  {/* Sub-links do módulo efetivo */}
                  {mod.key === "efetivo" && (
                    <>
                      <NavLink href="/efetivo/escala"        icon={CalendarDays} label="Escala"        current={pathname} onClick={handleLinkClick} indent />
                      <NavLink href="/efetivo/colaboradores" icon={Users}        label="Colaboradores" current={pathname} onClick={handleLinkClick} indent />
                      <NavLink href="/efetivo/cadastros"     icon={Settings2}    label="Cadastros"     current={pathname} onClick={handleLinkClick} indent />
                    </>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* Configurações */}
        <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
          Configurações
        </p>
        <NavLink href="/configuracoes/usuarios" icon={Users}      label="Usuários"    current={pathname} onClick={handleLinkClick} />
        <NavLink href="/configuracoes/empresa"  icon={Building2}  label="Empresa"     current={pathname} onClick={handleLinkClick} />
        <NavLink href="/configuracoes/conta"    icon={UserCircle} label="Minha conta" current={pathname} onClick={handleLinkClick} />

        {/* Admin de plataforma */}
        {user.platformAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Plataforma
            </p>
            <NavLink href="/plataforma/empresas"  icon={Building2}  label="Empresas"  current={pathname} onClick={handleLinkClick} />
            <NavLink href="/plataforma/usuarios"  icon={Users}      label="Usuários"  current={pathname} onClick={handleLinkClick} />
            <NavLink href="/plataforma/metricas"  icon={BarChart2}  label="Métricas"  current={pathname} onClick={handleLinkClick} />
            <NavLink href="/plataforma/logs"      icon={ScrollText} label="Logs"      current={pathname} onClick={handleLinkClick} />
            <NavLink href="/plataforma/templates" icon={Layers}     label="Templates" current={pathname} onClick={handleLinkClick} />
          </>
        )}
      </nav>

      {/* Usuário */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-soft">
          <div className="w-7 h-7 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-gray-500 border border-gray-200 hover:text-error hover:bg-red-50 hover:border-red-200 rounded-soft transition-colors"
        >
          <LogOut size={16} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </aside>
  )
}

function NavLink({
  href, icon: Icon, label, current, onClick, indent,
}: {
  href:     string
  icon:     React.ElementType
  label:    string
  current:  string
  onClick?: () => void
  indent?:  boolean
}) {
  const active = current === href || (href !== "/dashboard" && current.startsWith(href))
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 py-1.5 rounded-soft text-sm transition-colors",
        indent ? "px-3 pl-8" : "px-3",
        active
          ? "bg-primary-50 text-primary font-medium"
          : indent
            ? "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon size={indent ? 15 : 18} strokeWidth={2} />
      <span className="flex-1 text-xs">{label}</span>
      {active && <ChevronRight size={14} className="text-primary-500" />}
    </Link>
  )
}
