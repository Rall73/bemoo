import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import { redirect }     from "next/navigation"
import { hojeNoBrasil } from "@/lib/date"
import { EscalaClient } from "@/app/(app)/efetivo/_components/EscalaClient"

export const metadata = { title: "Escala de Trabalho" }

export default async function EscalaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { mes } = await searchParams
  const hoje = hojeNoBrasil()
  const mesAtual = mes ?? `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`

  const companyId = session.user.companyId

  const [turnos, areas] = await Promise.all([
    prisma.efetivoTurno.findMany({
      where:   { companyId, deletedAt: null, ativo: true },
      select:  { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.efetivoArea.findMany({
      where:   { companyId, deletedAt: null, ativo: true },
      select:  { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ])

  return (
    <EscalaClient
      mesInicial={mesAtual}
      turnos={turnos}
      areas={areas}
      role={session.user.role}
    />
  )
}
