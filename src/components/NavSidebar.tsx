"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { BemooLogo } from "@/components/Logo"
import { MODULES_CONFIG } from "@/lib/modules"
import {
  CheckSquare, AlertTriangle, Tag, Target, Inbox,
  LayoutDashboard, LogOut, ChevronRight, Users,
  Building2, BarChart2, ScrollText, UserCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const MODULE_ICONS = {
  checklists:      CheckSquare,
  intercorrencias: AlertTriangle,
  rastreabilidade: Tag,
  planos:          Target,
  captura:         Inbox,
} as const

interface NavSidebarProps {
  user: {
    name: string
    email: string
    role: string
    platformAdmin: boolean
  }
  enabledModules: string[]
}

export function NavSidebar({ user, enabledModules }: NavSidebarProps) {
  const pathname = usePathname()

  const navModules = MODULES_CONFIG.filter((m) =>
    enabledModules.includes(m.key)
  )

  return (
    <aside className="w-56 flex flex-col bg-white border-r border-gray-200 h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <BemooLogo size={22} color="#1F4E4A" />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* Dashboard */}
        <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" current={pathname} />

        {/* Módulos habilitados */}
        {navModules.length > 0 && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Módulos
            </p>
            {navModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.key as keyof typeof MODULE_ICONS]
              return (
                <NavLink
                  key={mod.key}
                  href={mod.href}
                  icon={Icon}
                  label={mod.label}
                  current={pathname}
                />
              )
            })}
          </>
        )}

        {/* Configurações */}
        <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
          Configurações
        </p>
        <NavLink href="/configuracoes/usuarios" icon={Users}       label="Usuários"  current={pathname} />
        <NavLink href="/configuracoes/empresa"  icon={Building2}   label="Empresa"   current={pathname} />
        <NavLink href="/configuracoes/conta"    icon={UserCircle}  label="Minha conta" current={pathname} />

        {/* Admin de plataforma */}
        {user.platformAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-[10px] font-medium uppercase tracking-widest text-gray-400">
              Plataforma
            </p>
            <NavLink href="/plataforma/empresas" icon={Building2}   label="Empresas" current={pathname} />
            <NavLink href="/plataforma/usuarios" icon={Users}       label="Usuários"  current={pathname} />
            <NavLink href="/plataforma/metricas" icon={BarChart2}   label="Métricas"  current={pathname} />
            <NavLink href="/plataforma/logs"     icon={ScrollText}  label="Logs"      current={pathname} />
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
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-1 text-xs text-gray-500 hover:text-error hover:bg-red-50 rounded-soft transition-colors"
        >
          <LogOut size={14} strokeWidth={2} />
          Sair
        </button>
      </div>
    </aside>
  )
}

function NavLink({
  href,
  icon: Icon,
  label,
  current,
}: {
  href: string
  icon: React.ElementType
  label: string
  current: string
}) {
  const active = current === href || (href !== "/dashboard" && current.startsWith(href))
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-soft text-sm transition-colors",
        active
          ? "bg-primary-50 text-primary font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon size={18} strokeWidth={2} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight size={14} className="text-primary-500" />}
    </Link>
  )
}
