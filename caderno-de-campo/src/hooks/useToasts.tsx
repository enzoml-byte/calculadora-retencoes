import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface ToastItem {
  id: string
  message: string
  actionLabel?: string
  onAction?: () => void
  expiresAt?: number
}

interface PushOptions {
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (message: string, opts?: PushOptions) => void
  upsert: (id: string, message: string) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message: string, opts?: PushOptions) => {
    const id = 'toast-' + ++seq.current
    setToasts((list) => [
      ...list,
      {
        id,
        message,
        actionLabel: opts?.actionLabel,
        onAction: opts?.onAction,
        expiresAt: Date.now() + (opts?.duration ?? 5500),
      },
    ])
  }, [])

  const upsert = useCallback((id: string, message: string) => {
    setToasts((list) => {
      const existing = list.find((t) => t.id === id)
      if (existing) return list.map((t) => (t.id === id ? { ...t, message } : t))
      return [...list, { id, message }]
    })
  }, [])

  const value = useMemo(() => ({ toasts, push, upsert, remove }), [toasts, push, upsert, remove])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToasts deve ser usado dentro de ToastProvider')
  return ctx
}
