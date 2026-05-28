import Link from "next/link"
import { BemooLogo } from "@/components/Logo"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BemooLogo size={22} color="#1F4E4A" />
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Entrar
          </Link>
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 mt-16">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-4 items-center justify-between text-xs text-gray-400">
          <BemooLogo size={16} color="#8D9298" />
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-gray-700 transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-gray-700 transition-colors">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
