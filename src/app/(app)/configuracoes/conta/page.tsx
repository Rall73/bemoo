import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ContaConfigClient } from "./_components/ContaConfigClient"

export const metadata: Metadata = { title: "Minha conta" }

export default async function ConfigContaPage() {
  const session = await auth() as any
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where:  { id: parseInt(session.user.id) },
    select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
  })
  if (!user) redirect("/login")

  // Usuário com senha vazia entrou via Google
  const hasPassword = !!user.password

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Minha conta
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Suas informações pessoais e segurança.</p>
      </div>

      <ContaConfigClient
        user={{
          name:      user.name,
          email:     user.email,
          role:      user.role,
          createdAt: user.createdAt.toISOString(),
          hasPassword,
        }}
      />
    </div>
  )
}
