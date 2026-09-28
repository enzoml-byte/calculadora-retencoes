export type DateFormat = 'date' | 'datetime' | 'time' | 'relative'

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}

const DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}

export function fmtDate(iso: string, format: DateFormat = 'date'): string {
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return ''
    switch (format) {
      case 'datetime':
        return date.toLocaleString('pt-BR', DATETIME_OPTIONS)
      case 'time':
        return date.toLocaleString('pt-BR', TIME_OPTIONS)
      case 'relative':
        return formatRelative(date)
      default:
        return date.toLocaleDateString('pt-BR', DEFAULT_OPTIONS)
    }
  } catch {
    return ''
  }
}

function formatRelative(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  return date.toLocaleDateString('pt-BR', DEFAULT_OPTIONS)
}

export function nowISO(): string {
  return new Date().toISOString()
}