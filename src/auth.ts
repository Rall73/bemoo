import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email:    { label: "E-mail",  type: "email" },
        password: { label: "Senha",   type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string, deletedAt: null },
        })
        if (!user) return null

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        return {
          id:                 String(user.id),
          name:               user.name,
          email:              user.email,
          role:               user.role,
          companyId:          user.companyId,
          platformAdmin:      user.platformAdmin,
          mustChangePassword: user.mustChangePassword,
        }
      },
    }),

    Google({
      clientId:     process.env.AUTH_GOOGLE_ID     ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, account, trigger, session: updateSession }) {
      // Atualização de sessão via useSession().update()
      if (trigger === "update" && updateSession?.mustChangePassword !== undefined) {
        token.mustChangePassword = updateSession.mustChangePassword
        return token
      }

      // Login com Google — buscar ou criar usuário no banco
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email, deletedAt: null },
        })

        if (dbUser) {
          // Usuário já existe → preencher token com dados do banco
          token.sub               = String(dbUser.id)
          token.role              = dbUser.role
          token.companyId         = dbUser.companyId
          token.platformAdmin     = dbUser.platformAdmin
          token.mustChangePassword = dbUser.mustChangePassword
        } else {
          // Novo usuário via Google → criar empresa + usuário
          const nome = user.name ?? user.email.split("@")[0]

          const newUser = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
              data: { name: nome, email: user.email!, plan: "FREE" },
            })
            return tx.user.create({
              data: {
                companyId:     company.id,
                name:          nome,
                email:         user.email!,
                password:      "", // sem senha — acesso só por Google
                role:          "ADMIN",
                platformAdmin: false,
              },
            })
          })

          token.sub               = String(newUser.id)
          token.role              = newUser.role
          token.companyId         = newUser.companyId
          token.platformAdmin     = false
          token.mustChangePassword = false
          token.needsOnboarding   = true
        }
      } else if (user) {
        // Login por credenciais — dados já vêm do authorize()
        token.role               = (user as { role: string }).role
        token.companyId          = (user as { companyId: number }).companyId
        token.platformAdmin      = (user as { platformAdmin: boolean }).platformAdmin ?? false
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword ?? false
      }

      return token
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id                 = token.sub ?? ""
        session.user.role               = token.role as never
        session.user.companyId          = token.companyId as number
        session.user.platformAdmin      = (token.platformAdmin as boolean) ?? false
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
  },
})
