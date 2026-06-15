import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPendingVersions } from "@/lib/legal"
import { LegalGate } from "./_components/LegalGate"
import { AppShell } from "./_components/AppShell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const userId    = parseInt(session.user.id)
  const companyId = session.user.companyId as number

  const pendingVersions = await getPendingVersions(userId)
  if (pendingVersions.length > 0) {
    return <LegalGate versions={pendingVersions} />
  }

  // Módulos habilitados para a empresa × acesso do usuário
  const [companyModules, userAccess] = await Promise.all([
    prisma.companyModule.findMany({
      where:  { companyId },
      select: { module: true },
    }),
    prisma.userModuleAccess.findMany({
      where:  { userId, companyId },
      select: { moduleKey: true },
    }),
  ])

  const companyKeys  = new Set(companyModules.map((m) => m.module))
  const userKeys     = new Set(userAccess.map((a) => a.moduleKey))
  const enabledModules = [...companyKeys].filter((k) => userKeys.has(k))

  return (
    <AppShell
      user={{
        name:          session.user.name ?? "",
        email:         session.user.email ?? "",
        role:          session.user.role as string,
        platformAdmin: session.user.platformAdmin as boolean,
      }}
      enabledModules={enabledModules}
    >
      {children}
    </AppShell>
  )
}
