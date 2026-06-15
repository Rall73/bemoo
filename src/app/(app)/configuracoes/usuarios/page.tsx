import type { Metadata } from "next"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UsuariosClient } from "./_components/UsuariosClient"
import { getUserLimit } from "@/lib/planLimits"

export const metadata: Metadata = {
  title: "Usuarios",
}

export default async function UsuariosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId     = session.user.companyId
  const currentUserId = parseInt(session.user.id)

  const [users, invites, company, companyMods, moduleAccess] = await Promise.all([
    prisma.user.findMany({
      where:   { companyId, deletedAt: null },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.invite.findMany({
      where:   { companyId, acceptedAt: null },
      select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.company.findUnique({
      where:  { id: companyId },
      select: { plan: true, maxUsers: true },
    }),
    prisma.companyModule.findMany({
      where:  { companyId },
      select: { module: true },
    }),
    prisma.userModuleAccess.findMany({
      where:  { companyId },
      select: { userId: true, moduleKey: true },
    }),
  ])

  const userLimit   = company ? getUserLimit(company.plan, company.maxUsers) : null
  const activeCount = users.length

  // Map userId -> moduleKeys[]
  const accessMap: Record<number, string[]> = {}
  for (const row of moduleAccess) {
    if (!accessMap[row.userId]) accessMap[row.userId] = []
    accessMap[row.userId].push(row.moduleKey)
  }

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
      companyModules={companyMods.map((m) => m.module)}
      userModuleAccess={accessMap}
    />
  )
}
