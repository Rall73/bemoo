import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { FichaColaboradorClient } from "../../_components/FichaColaboradorClient"

export const metadata: Metadata = { title: "Ficha do Colaborador — Efetivo" }

export default async function FichaPage({ params }: { params: Promise<{ matricula: string }> }) {
  const { matricula } = await params
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const [colab, cargos, areas, turnos, padroes, tiposOcorrencia] = await Promise.all([
    prisma.efetivoColaborador.findFirst({
      where: { companyId, matricula, deletedAt: null },
      include: {
        cargo:        { select: { id: true, nome: true } },
        area:         { select: { id: true, nome: true, areaPaiId: true, areaPai: { select: { id: true, nome: true } } } },
        turno:        { select: { id: true, codigo: true, horaInicio: true, horaFim: true, cruzaMeiaNoite: true } },
        padraoEscala: { select: { id: true, nome: true, modo: true, diasTrabalho: true, diasFolga: true } },
        movimentacoes: {
          where:   { deletedAt: null },
          orderBy: { data: "desc" },
          select: {
            id: true, tipo: true, data: true, motivo: true, createdAt: true,
            registrador: { select: { name: true } },
          },
        },
        ocorrencias: {
          where:   { deletedAt: null },
          orderBy: { data: "desc" },
          select: {
            id: true, data: true, descricao: true, anexoUrl: true, createdAt: true,
            tipo:        { select: { id: true, nome: true } },
            registrador: { select: { name: true } },
          },
        },
      },
    }),
    prisma.efetivoCargo.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.efetivoArea.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.efetivoTurno.findMany({
      where: { companyId, deletedAt: null }, orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, horaInicio: true, horaFim: true },
    }),
    prisma.efetivoPadraoEscala.findMany({
      where: { companyId, deletedAt: null }, orderBy: { nome: "asc" },
      select: { id: true, nome: true, modo: true },
    }),
    prisma.efetivoTipoOcorrencia.findMany({
      where: { companyId, deletedAt: null, ativo: true }, orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ])

  if (!colab) notFound()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <FichaColaboradorClient
        colaborador={{
          id:              colab!.id,
          matricula:       colab!.matricula,
          nome:            colab!.nome,
          status:          colab!.status as "ATIVO" | "DESLIGADO",
          dataAdmissao:    colab!.dataAdmissao.toISOString(),
          dataDesligamento:colab!.dataDesligamento?.toISOString() ?? null,
          dataAncora:      colab!.dataAncora?.toISOString() ?? null,
          cargo:           colab!.cargo,
          area:            colab!.area as any,
          turno:           colab!.turno,
          padraoEscala:    colab!.padraoEscala as any,
          movimentacoes:   colab!.movimentacoes.map((m) => ({
            ...m,
            data:      m.data.toISOString(),
            createdAt: m.createdAt.toISOString(),
          })),
          ocorrencias: colab!.ocorrencias.map((o) => ({
            ...o,
            data:      o.data.toISOString(),
            createdAt: o.createdAt.toISOString(),
          })),
        }}
        cargos={cargos}
        areas={areas}
        turnos={turnos}
        padroes={padroes.map((p) => ({ ...p, modo: p.modo as "FIXO_SEMANAL" | "ROTATIVO" }))}
        tiposOcorrencia={tiposOcorrencia}
        role={session.user.role as string}
      />
    </div>
  )
}
