import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const { pathname } = req.nextUrl

  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/redefinir-senha") ||
    pathname.startsWith("/aceitar-convite") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup")   // rotas de setup protegidas por SEED_SECRET próprio

  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (pathname.startsWith("/login") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Usuário com senha temporária → forçar troca antes de qualquer outra rota
  const mustChangePassword = (req.auth?.user as { mustChangePassword?: boolean })?.mustChangePassword
  if (
    isAuthenticated &&
    mustChangePassword &&
    !pathname.startsWith("/trocar-senha-obrigatoria") &&
    !pathname.startsWith("/api/") &&
    !isPublicRoute
  ) {
    return NextResponse.redirect(new URL("/trocar-senha-obrigatoria", req.url))
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
