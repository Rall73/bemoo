import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ColaboradoresClient } from "../_components/ColaboradoresClient"

export const metadata: Metadata = { title: "Colaboradores — Efetivo" }

export default async function ColaboradoresPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const [colaboradores, areas, turnos, cargos, padroes] = await Promise.all([
    prisma.efetivoColaborador.findMany({
      where:   { companyId, deletedAt: null },
      orderBy: { nome: "asc" },
      select: {
        id:       true,
        matricula:true,
        nome:     true,
        status:   true,
        cargo:    { select: { nome: true } },
        area:     { select: { nome: true } },
        turno:    { select: { codigo: true, horaInicio: true, horaFim: true } },
      },
    }),
    prisma.efetivoArea.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.efetivoTurno.findMany({
      where: { companyId, deletedAt: null }, orderBy: { codigo: "asc" },
      select: { id: true, codigo: true },
    }),
    prisma.efetivoCargo.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.efetivoPadraoEscala.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true, modo: true },
    }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Colaboradores
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {colaboradores.length} colaboradores cadastrados
        </p>
      </div>

      <ColaboradoresClient
        colaboradores={colaboradores.map((c) => ({
          id:        c.id,
          matricula: c.matricula,
          nome:      c.nome,
          status:    c.status as "ATIVO" | "DESLIGADO",
          cargo:     c.cargo,
          area:      c.area,
          turno:     c.turno,
        }))}
        areas={areas}
        turnos={turnos}
        cargos={cargos}
        padroes={padroes}
        role={session.user.role}
      />
    </div>
  )
}
