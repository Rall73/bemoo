import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function EfetivoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const [modulo, acesso] = await Promise.all([
    prisma.companyModule.findFirst({
      where: { companyId: session.user.companyId, module: "efetivo" },
    }),
    prisma.userModuleAccess.findFirst({
      where: { userId: parseInt(session.user.id), moduleKey: "efetivo" },
    }),
  ])

  if (!modulo || !acesso) redirect("/dashboard")

  return <>{children}</>
}
