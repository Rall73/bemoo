"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { NavSidebar } from "@/components/NavSidebar"
import { BemooLogo } from "@/components/Logo"
import { Menu, X } from "lucide-react"

interface Props {
  user: {
    name:          string
    email:         string
    role:          string
    platformAdmin: boolean
  }
  enabledModules: string[]
  children:       React.ReactNode
}

export function AppShell({ user, enabledModules, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Fecha sidebar quando muda de rota no mobile
  // (useEffect não necessário — o pathname muda e fecha via Link click)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Overlay mobile ─────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <div className={[
        "fixed inset-y-0 left-0 z-30 transition-transform duration-200",
        "md:relative md:translate-x-0 md:flex md:flex-shrink-0",
        open ? "flex translate-x-0" : "-translate-x-full md:translate-x-0 hidden md:flex",
      ].join(" ")}>
        <NavSidebar
          user={user}
          enabledModules={enabledModules}
          onClose={() => setOpen(false)}
        />
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-soft text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <BemooLogo size={20} color="#1F4E4A" />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
