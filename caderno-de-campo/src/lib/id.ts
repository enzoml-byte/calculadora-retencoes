export function newId(prefix = ''): string {
  const base = prefix ? prefix + '-' : ''
  return base + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
}
