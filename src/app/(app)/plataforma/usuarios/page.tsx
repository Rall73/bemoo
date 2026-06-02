import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Todos os usuários" }

const ROLE_COLORS: Record<string, string> = {
  ADMIN:    "bg-primary-50 text-primary",
  GESTOR:   "bg-blue-50 text-blue-700",
  EXECUTOR: "bg-gray-100 text-gray-600",
  AUDITOR:  "bg-yellow-50 text-yellow-700",
}

export default async function PlataformaUsuariosPage() {
  const users = await prisma.user.findMany({
    where:   { deletedAt: null },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      createdAt: true,
      platformAdmin: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
          Todos os usuários
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {users.length} usuário{users.length !== 1 ? "s" : ""} ativos na plataforma.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-round overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.8fr] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>Nome</span>
          <span>E-mail</span>
          <span>Empresa</span>
          <span>Papel</span>
          <span>Cadastrado</span>
        </div>

        {users.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">Nenhum usuário encontrado.</p>
        )}

        {users.map((user, idx) => (
          <div
            key={user.id}
            className={`grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.8fr] gap-4 px-4 py-3 items-center text-sm ${
              idx < users.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Nome */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate font-medium text-gray-900">{user.name}</span>
              {user.platformAdmin && (
                <span className="text-[10px] bg-accent-100 text-accent px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                  super
                </span>
              )}
            </div>

            {/* Email */}
            <span className="text-gray-500 truncate text-xs">{user.email}</span>

            {/* Empresa */}
            <span className="text-gray-600 truncate text-xs">{user.company.name}</span>

            {/* Papel */}
            <span className={`text-xs font-medium px-2 py-0.5 rounded inline-block w-fit ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </span>

            {/* Data */}
            <span className="text-gray-400 text-xs">
              {new Date(user.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
