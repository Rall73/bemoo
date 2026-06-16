import { auth }          from "@/auth"
import { prisma }         from "@/lib/prisma"
import { redirect }       from "next/navigation"
import { hojeNoBrasil }   from "@/lib/date"
import { ChamadaClient }  from "@/app/(app)/efetivo/_components/ChamadaClient"

export const metadata = { title: "Chamada de Presença" }

export default async function ChamadaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId

  const [turnos, areas] = await Promise.all([
    prisma.efetivoTurno.findMany({
      where:   { companyId, deletedAt: null, ativo: true },
      select:  { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.efetivoArea.findMany({
      where:   { companyId, deletedAt: null },
      select:  { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ])

  return (
    <ChamadaClient
      turnos={turnos}
      areas={areas}
      role={session.user.role}
      dataInicial={hojeNoBrasil().toISOString().slice(0, 10)}
    />
  )
}
