import type { Especime } from '../types'
import { newId } from './id'

export function exportBackup(entries: Especime[]): boolean {
  try {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = 'caderno-de-campo-backup-' + stamp + '.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

export function parseBackup(text: string): Especime[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Arquivo inválido: não é um JSON de backup reconhecível.')
  }
  if (!Array.isArray(parsed)) throw new Error('Arquivo inválido: formato inesperado.')
  const validos: Especime[] = []
  for (const x of parsed) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    if (typeof o.titulo !== 'string' || !o.titulo) continue
    if (typeof o.conteudo !== 'string' || !o.conteudo) continue
    validos.push({
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
    })
  }
  return validos
}
