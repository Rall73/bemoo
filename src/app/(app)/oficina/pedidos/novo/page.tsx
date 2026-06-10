import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { NovoPedidoForm } from "../../_components/NovoPedidoForm"

export const metadata: Metadata = { title: "Novo pedido — Oficina" }

export default async function NovoPedidoPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const companyId = session.user.companyId as number

  const [areas, produtos] = await Promise.all([
    prisma.workshopArea.findMany({
      where:   { companyId, active: true, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.workshopProduct.findMany({
      where:   { companyId, active: true, deletedAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
  ])

  if (areas.length === 0 || produtos.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4" style={{ letterSpacing: "-0.02em" }}>
          Novo pedido
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 text-sm text-yellow-800">
          Para abrir pedidos é necessário cadastrar pelo menos uma{" "}
          <strong>área</strong> e um <strong>produto/serviço</strong> primeiro.{" "}
          <a href="/oficina/cadastros" className="underline font-medium">
            Ir para Cadastros
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Novo pedido
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Preencha os dados para abrir uma ordem de serviço.
        </p>
      </div>

      <NovoPedidoForm
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        produtos={produtos.map((p) => ({ id: p.id, name: p.name, category: p.category }))}
      />
    </div>
  )
}
