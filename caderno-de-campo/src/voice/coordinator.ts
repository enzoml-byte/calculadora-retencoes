const stoppers = new Map<string, () => void>()

export function registerStopper(key: string, stop: () => void): void {
  stoppers.set(key, stop)
}

export function unregisterStopper(key: string): void {
  stoppers.delete(key)
}

export function stopOthers(key: string): void {
  stoppers.forEach((stop, k) => {
    if (k !== key) {
      try {
        stop()
      } catch {}
    }
  })
}
