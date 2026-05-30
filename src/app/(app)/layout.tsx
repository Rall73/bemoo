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

  const userId = parseInt(session.user.id)

  // Verificar documentos legais pendentes de aceite
  const pendingVersions = await getPendingVersions(userId)
  if (pendingVersions.length > 0) {
    return <LegalGate versions={pendingVersions} />
  }

  // Busca módulos habilitados para a empresa
  const companyModules = await prisma.companyModule.findMany({
    where: { companyId: session.user.companyId },
    select: { module: true },
  })
  const enabledModules = companyModules.map((m) => m.module)

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
