import type { Especime, Scored } from '../types'

const ACCENT_GROUPS: Record<string, string> = {
  a: 'aàáâãä',
  e: 'eèéêë',
  i: 'iìíîï',
  o: 'oòóôõö',
  u: 'uùúûü',
  c: 'cç',
  n: 'nñ',
}

export function normalize(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function accentPattern(ch: string): string {
  const lower = ch.toLowerCase()
  const group = ACCENT_GROUPS[lower]
  if (group) return '[' + group + group.toUpperCase() + ']'
  return escapeRegExp(ch)
}

function tokenToRegexSource(token: string): string {
  return token
    .split('')
    .map(accentPattern)
    .join('')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  let prev = new Array<number>(bl + 1)
  for (let j = 0; j <= bl; j++) prev[j] = j
  for (let i = 1; i <= al; i++) {
    const cur = [i]
    for (let jj = 1; jj <= bl; jj++) {
      const cost = a[i - 1] === b[jj - 1] ? 0 : 1
      cur[jj] = Math.min(prev[jj] + 1, cur[jj - 1] + 1, prev[jj - 1] + cost)
    }
    prev = cur
  }
  return prev[bl]
}

export function searchAndFilter(
  list: Especime[],
  rawQuery: string,
  activeTag: string | null,
): { scored: Scored[]; plainTerms: string[] } {
  const byTag = activeTag ? list.filter((e) => e.tags.includes(activeTag)) : list.slice()
  const q = (rawQuery || '').trim()
  if (!q) {
    return { scored: byTag.map((entry) => ({ entry, score: 0 })), plainTerms: [] }
  }
  const rawTokens = q.split(/\s+/).filter(Boolean)
  const plainTerms = rawTokens.filter((tk) => !/^(tag|campo):/i.test(tk))
  const scored: Scored[] = []
  for (const entry of byTag) {
    const fields = {
      titulo: normalize(entry.titulo),
      campo: normalize(entry.campo || ''),
      tags: normalize(entry.tags.join(' ')),
      conteudo: normalize(entry.conteudo || ''),
    }
    let total = 0
    let matchedAll = true
    for (const rawToken of rawTokens) {
      const m = rawToken.match(/^(tag|campo):(.+)$/i)
      const field = m ? (m[1].toLowerCase() === 'tag' ? 'tags' : 'campo') : null
      const term = m ? m[2] : rawToken
      const nTerm = normalize(term)
      if (!nTerm) continue
      let tokenScore = 0
      if (field) {
        if (fields[field].includes(nTerm)) tokenScore = 4
      } else {
        if (fields.titulo.includes(nTerm)) tokenScore = Math.max(tokenScore, 5)
        if (fields.tags.includes(nTerm)) tokenScore = Math.max(tokenScore, 3)
        if (fields.campo.includes(nTerm)) tokenScore = Math.max(tokenScore, 2)
        if (fields.conteudo.includes(nTerm)) tokenScore = Math.max(tokenScore, 1)
        if (tokenScore === 0 && nTerm.length >= 4) {
          const haystack = (
            fields.titulo +
            ' ' +
            fields.tags +
            ' ' +
            fields.campo +
            ' ' +
            fields.conteudo
          ).split(/\s+/)
          for (const word of haystack) {
            if (word.length >= 3 && levenshtein(word, nTerm) <= 1) {
              tokenScore = 0.5
              break
            }
          }
        }
      }
      if (tokenScore === 0) {
        matchedAll = false
        break
      }
      total += tokenScore
    }
    if (matchedAll) scored.push({ entry, score: total })
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      new Date(b.entry.data).getTime() - new Date(a.entry.data).getTime(),
  )
  return { scored, plainTerms }
}

export interface HighlightPart {
  text: string
  hit: boolean
}

export function highlightParts(text: string, terms: string[]): HighlightPart[] {
  const sources = terms.filter(Boolean).map(tokenToRegexSource)
  if (!sources.length) return [{ text, hit: false }]
  let re: RegExp
  try {
    re = new RegExp('(' + sources.join('|') + ')', 'gi')
  } catch {
    return [{ text, hit: false }]
  }
  const parts: HighlightPart[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false })
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
    if (m[0].length === 0) re.lastIndex++
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts
}
