export const CURRENT_SCHEMA_VERSION = 1

export interface Migration {
  fromVersion: number
  toVersion: number
  up: (data: unknown) => Promise<unknown>
}

export const migrations: Migration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    up: async (raw: unknown) => {
      if (!raw) return []
      const arr = Array.isArray(raw) ? raw : [raw]
      return arr.map((item: unknown, idx: number) => {
        const o = item as Record<string, unknown>
        return {
          id: typeof o.id === 'string' && o.id ? o.id : `esp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${idx}`,
          numero: typeof o.numero === 'number' ? o.numero : idx + 1,
          titulo: typeof o.titulo === 'string' ? o.titulo : 'Sem título',
          campo: typeof o.campo === 'string' && o.campo ? o.campo : 'Trabalho',
          tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
          conteudo: typeof o.conteudo === 'string' ? o.conteudo : '',
          data: typeof o.data === 'string' ? o.data : new Date().toISOString(),
          atualizadoEm: typeof o.atualizadoEm === 'string' ? o.atualizadoEm : undefined,
        }
      })
    },
  },
]

export async function migrate(data: unknown, fromVersion: number): Promise<unknown> {
  let current = data
  for (const m of migrations) {
    if (m.fromVersion >= fromVersion && m.toVersion > fromVersion) {
      current = await m.up(current)
    }
  }
  return current
}