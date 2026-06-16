import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CadastrosClient } from "../_components/CadastrosClient"

export const metadata: Metadata = { title: "Cadastros — Efetivo" }

export default async function CadastrosPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const [turnos, padroes, areas, cargos] = await Promise.all([
    prisma.efetivoTurno.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { codigo: "asc" },
    }),
    prisma.efetivoPadraoEscala.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { nome: "asc" },
    }),
    prisma.efetivoArea.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { nome: "asc" },
      include: { areaPai: { select: { id: true, nome: true } } },
    }),
    prisma.efetivoCargo.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { nome: "asc" },
    }),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Cadastros
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gerencie as tabelas de configuração do módulo Efetivo.
        </p>
      </div>

      <CadastrosClient
        turnos={turnos.map((t) => ({
          id: t.id,
          codigo: t.codigo,
          horaInicio: t.horaInicio,
          horaFim: t.horaFim,
          cruzaMeiaNoite: t.cruzaMeiaNoite,
          ativo: t.ativo,
        }))}
        padroes={padroes.map((p) => ({
          id: p.id,
          nome: p.nome,
          modo: p.modo as "FIXO_SEMANAL" | "ROTATIVO",
          diasSemana: p.diasSemana,
          diasTrabalho: p.diasTrabalho,
          diasFolga: p.diasFolga,
          ativo: p.ativo,
        }))}
        areas={areas.map((a) => ({
          id: a.id,
          nome: a.nome,
          areaPaiId: a.areaPaiId,
          areaPai: a.areaPai,
          ativo: a.ativo,
        }))}
        cargos={cargos.map((c) => ({
          id: c.id,
          nome: c.nome,
          ativo: c.ativo,
        }))}
      />
    </div>
  )
}
