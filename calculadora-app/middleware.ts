import { auth } from '@/lib/auth'
import { rateLimitCheck, logAudit } from '@/lib/kv'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: [
    '/calculadora/:path*',
    '/empresas/:path*',
    '/emissao/:path*',
    '/conciliacao/:path*',
    '/dashboard/:path*',
    '/api/empresas/:path*',
    '/api/notas/:path*',
    '/api/conciliacao/:path*',
    '/api/cnpj/:path*',
  ],
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_ANONYMOUS = 60 // req/min
const RATE_LIMIT_AUTHENTICATED = 300 // req/min

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  return realIP || forwarded?.split(',')[0]?.trim() || 'unknown'
}

export default async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const method = request.method

  // Rate limiting
  const session = await auth()
  const isAuthenticated = !!session?.user
  const userId = session?.user?.id
  const rateKey = isAuthenticated && userId ? `rate:user:${userId}` : `rate:ip:${ip}`
  const limit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS

  const rateResult = await rateLimitCheck(rateKey, limit, RATE_LIMIT_WINDOW_MS)

  // Security headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  )

  // Rate limit headers
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateResult.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil((Date.now() + rateResult.resetMs) / 1000).toString())

  if (!rateResult.allowed) {
    const retryAfter = Math.ceil(rateResult.resetMs / 1000)
    response.headers.set('Retry-After', retryAfter.toString())
    return new NextResponse(
      JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          ...Object.fromEntries(response.headers),
        },
      }
    )
  }

  // CORS for API routes
  if (path.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowedOrigin = process.env.NEXTAUTH_URL
    
    if (origin === allowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    if (method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }

  // Audit logging (async, don't await)
  logAudit({
    userId: session?.user?.id,
    route: path,
    method,
    ip,
    userAgent,
    metadata: { authenticated: isAuthenticated },
  }).catch(() => {})

  return response
}