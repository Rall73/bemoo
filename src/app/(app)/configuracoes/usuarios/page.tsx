import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UsuariosClient } from "./_components/UsuariosClient"
import { getUserLimit } from "@/lib/planLimits"

export const metadata: Metadata = {
  title: "Usuários",
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId    = session.user.companyId
  const currentUserId = parseInt(session.user.id)

  const [users, invites, company] = await Promise.all([
    // Membros ativos da empresa
    prisma.user.findMany({
      where:   { companyId, deletedAt: null },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    // Convites pendentes
    prisma.invite.findMany({
      where:   { companyId, acceptedAt: null },
      select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    // Dados da empresa para calcular limite
    prisma.company.findUnique({
      where:  { id: companyId },
      select: { plan: true, maxUsers: true },
    }),
  ])

  const userLimit  = company ? getUserLimit(company.plan, company.maxUsers) : null
  const activeCount = users.length

  return (
    <UsuariosClient
      users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      invites={invites.map((i) => ({
        ...i,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      }))}
      currentUserId={currentUserId}
      isAdmin={session.user.role === "ADMIN"}
      plan={company?.plan ?? "FREE"}
      userLimit={userLimit}
      activeCount={activeCount}
    />
  )
}
