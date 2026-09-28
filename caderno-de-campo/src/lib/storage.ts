import type { Especime } from '../types'
import { newId } from './id'

const ENTRIES_KEY = 'cadernoDeCampo_especimes_v1'
const THEME_KEY = 'cadernoDeCampo_theme'

export type Theme = 'light' | 'dark'

function coerceEntry(x: unknown): Especime | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  if (typeof o.titulo !== 'string' || typeof o.conteudo !== 'string') return null
  return {
    id: typeof o.id === 'string' && o.id ? o.id : newId(),
    numero: typeof o.numero === 'number' ? o.numero : 0,
    titulo: o.titulo,
    campo: typeof o.campo === 'string' && o.campo ? o.campo : 'Trabalho',
    tags: Array.isArray(o.tags)
      ? o.tags.filter((t: unknown): t is string => typeof t === 'string')
      : [],
    conteudo: o.conteudo,
    data: typeof o.data === 'string' ? o.data : new Date().toISOString(),
    atualizadoEm: typeof o.atualizadoEm === 'string' ? o.atualizadoEm : undefined,
  }
}

export function loadEntries(): Especime[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(coerceEntry).filter((e): e is Especime => e !== null)
  } catch {
    return []
  }
}

export function saveEntries(list: Especime[]): boolean {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function loadTheme(): Theme | null {
  try {
    const t = localStorage.getItem(THEME_KEY)
    return t === 'dark' || t === 'light' ? t : null
  } catch {
    return null
  }
}

export function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {}
}
