import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NavSidebar } from "@/components/NavSidebar"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // Busca módulos habilitados para a empresa
  const companyModules = await prisma.companyModule.findMany({
    where: { companyId: session.user.companyId },
    select: { module: true },
  })
  const enabledModules = companyModules.map((m) => m.module)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <NavSidebar
        user={{
          name:          session.user.name ?? "",
          email:         session.user.email ?? "",
          role:          session.user.role as string,
          platformAdmin: session.user.platformAdmin as boolean,
        }}
        enabledModules={enabledModules}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
