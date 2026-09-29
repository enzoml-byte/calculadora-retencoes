import { kv } from '@vercel/kv'

const hasKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

async function safeKVOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasKV) return fallback
  try {
    return await operation()
  } catch (error) {
    console.warn('KV operation failed, using fallback:', error)
    return fallback
  }
}

export async function rateLimitCheck(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (!hasKV) {
    return { allowed: true, remaining: limit, resetMs: windowMs }
  }

  return safeKVOperation(async () => {
    const now = Date.now()
    const windowStart = now - windowMs

    const pipeline = kv.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart)
    pipeline.zcard(key)
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` })
    pipeline.expire(key, Math.ceil(windowMs / 1000))

    const results = await pipeline.exec()
    const currentCount = (results[1] as number) + 1

    return {
      allowed: currentCount <= limit,
      remaining: Math.max(0, limit - currentCount),
      resetMs: windowMs,
    }
  }, { allowed: true, remaining: limit, resetMs: windowMs })
}

export async function getCachedCNPJ(cnpj: string): Promise<any | null> {
  if (!hasKV) return null
  return safeKVOperation(() => kv.get(`cnpj:${cnpj}`), null)
}

export async function setCachedCNPJ(cnpj: string, data: any, ttlSeconds = 86400): Promise<void> {
  if (!hasKV) return
  return safeKVOperation(() => kv.set(`cnpj:${cnpj}`, data, { ex: ttlSeconds }), undefined)
}

export async function logAudit(event: {
  userId?: string
  route: string
  method: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
}): Promise<void> {
  if (!hasKV) return
  return safeKVOperation(async () => {
    const key = `audit:${Date.now()}:${Math.random().toString(36).slice(2)}`
    await kv.set(key, event, { ex: 2592000 }) // 30 days TTL
  }, undefined)
}