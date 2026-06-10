import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function OficinaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const modulo = await prisma.companyModule.findFirst({
    where: { companyId: session.user.companyId, module: "oficina" },
  })

  if (!modulo) redirect("/dashboard")

  return <>{children}</>
}
