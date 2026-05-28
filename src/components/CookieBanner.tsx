"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X } from "lucide-react"

const COOKIE_KEY = "bemoo_cookie_consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Só mostra se ainda não aceitou
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: true, at: new Date().toISOString() }))
    setVisible(false)
  }

  function dismiss() {
    // Fechar sem aceitar — banner volta na próxima visita
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-3xl mx-auto bg-gray-900 text-white rounded-round shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Texto */}
        <div className="flex-1 text-sm leading-relaxed text-gray-300">
          Usamos cookies estritamente necessários para o funcionamento da plataforma.
          Saiba mais na nossa{" "}
          <Link href="/privacidade" className="text-primary-100 underline hover:text-white transition-colors">
            Política de Privacidade
          </Link>
          .
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={accept}
            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-soft hover:bg-primary-700 transition-colors"
          >
            Aceitar
          </button>
          <button
            onClick={dismiss}
            aria-label="Fechar"
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-soft hover:bg-gray-800"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
