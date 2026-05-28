import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: string
    companyId: number
    platformAdmin: boolean
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role: string
      companyId: number
      platformAdmin: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    companyId: number
    platformAdmin: boolean
  }
}
