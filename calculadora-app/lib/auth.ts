import NextAuth, { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { loginSchema } from './validators'

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
    }
  }
  interface User {
    role: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session: async ({ session, token }) => {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
        }
      }
      return session
    },
    authorized: async ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') || 
                            nextUrl.pathname.startsWith('/calculadora') ||
                            nextUrl.pathname.startsWith('/empresas') ||
                            nextUrl.pathname.startsWith('/emissao') ||
                            nextUrl.pathname.startsWith('/conciliacao')
      const isAuthRoute = nextUrl.pathname.startsWith('/login')

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/calculadora', nextUrl))
      }

      if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL(`/login?callback=${nextUrl.pathname}`, nextUrl))
      }

      return true
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)