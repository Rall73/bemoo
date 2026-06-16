import { auth }                  from "@/auth"
import { prisma }               from "@/lib/prisma"
import { redirect }             from "next/navigation"
import { EfetivoDashboardClient } from "@/app/(app)/efetivo/_components/EfetivoDashboardClient"

export const metadata = { title: "Efetivo — Dashboard" }

export default async function EfetivoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId

  const turnos = await prisma.efetivoTurno.findMany({
    where:   { companyId, deletedAt: null, ativo: true },
    select:  { id: true, codigo: true },
    orderBy: { codigo: "asc" },
  })

  return (
    <EfetivoDashboardClient
      turnos={turnos}
      role={session.user.role}
    />
  )
}
