import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
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
          where: {
            email: credentials.email as string,
            deletedAt: null,
          },
        })

        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!valid) return null

        return {
          id:            String(user.id),
          name:          user.name,
          email:         user.email,
          role:          user.role,
          companyId:     user.companyId,
          platformAdmin: user.platformAdmin,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role          = (user as { role: string }).role
        token.companyId     = (user as { companyId: number }).companyId
        token.platformAdmin = (user as { platformAdmin: boolean }).platformAdmin ?? false
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id            = token.sub ?? ""
        session.user.role          = token.role as never
        session.user.companyId     = token.companyId as number
        session.user.platformAdmin = (token.platformAdmin as boolean) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
