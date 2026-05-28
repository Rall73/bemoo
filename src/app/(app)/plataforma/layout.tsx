import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Guard de plataforma — garante platformAdmin = true no servidor.
 * Nunca depender só de ocultar o link no NavSidebar.
 */
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.platformAdmin) redirect("/dashboard")
  return <>{children}</>
}
