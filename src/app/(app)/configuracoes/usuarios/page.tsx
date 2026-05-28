import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UsuariosClient } from "./_components/UsuariosClient"

export const metadata: Metadata = {
  title: "Usuários",
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId
  const currentUserId = parseInt(session.user.id)

  // Membros ativos da empresa
  const users = await prisma.user.findMany({
    where:   { companyId, deletedAt: null },
    select:  { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  // Convites (todos — pendentes e expirados não aceitos)
  const invites = await prisma.invite.findMany({
    where:   { companyId, acceptedAt: null },
    select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

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
    />
  )
}
