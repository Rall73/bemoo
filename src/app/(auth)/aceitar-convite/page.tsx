import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BemooLogo } from "@/components/Logo"
import { AceitarConviteForm } from "./AceitarConviteForm"

export const metadata: Metadata = {
  title: "Aceitar convite",
  description: "Crie sua conta para entrar na plataforma bemoo.",
}

// Em Next.js 16, searchParams é uma Promise
export default async function AceitarConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  // ── Token ausente ──────────────────────────────────────────────
  if (!token) {
    return <ErrorPage message="Link de convite inválido." detail="Verifique se copiou o link completo do e-mail." />
  }

  // ── Buscar convite ─────────────────────────────────────────────
  const invite = await prisma.invite.findUnique({
    where:  { token },
    select: { id: true, companyId: true, email: true, role: true, expiresAt: true, acceptedAt: true },
  })

  if (!invite) {
    return <ErrorPage message="Convite não encontrado." detail="O link pode ter sido cancelado ou é inválido." />
  }

  if (invite.acceptedAt) {
    return (
      <ErrorPage
        message="Este convite já foi aceito."
        detail="Sua conta já está ativa."
        action={{ label: "Fazer login", href: "/login" }}
      />
    )
  }

  if (invite.expiresAt < new Date()) {
    return (
      <ErrorPage
        message="Este convite expirou."
        detail="Solicite ao administrador da empresa que envie um novo convite."
      />
    )
  }

  // ── Buscar nome da empresa ─────────────────────────────────────
  const company = await prisma.company.findUnique({
    where:  { id: invite.companyId },
    select: { name: true },
  })

  return (
    <AceitarConviteForm
      token={token}
      email={invite.email}
      role={invite.role}
      companyName={company?.name ?? "bemoo"}
    />
  )
}

// ── Componente de erro ─────────────────────────────────────────────

function ErrorPage({
  message,
  detail,
  action,
}: {
  message: string
  detail:  string
  action?: { label: string; href: string }
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-8">
          <BemooLogo size={32} color="#1F4E4A" />
        </div>
        <div className="bg-white rounded-round border border-gray-200 p-8">
          <p className="text-3xl mb-4">🔗</p>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{message}</h1>
          <p className="text-sm text-gray-500 mb-6">{detail}</p>
          {action && (
            <Link
              href={action.href}
              className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-soft hover:bg-primary-700 transition-colors"
            >
              {action.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
