import { useEffect } from 'react'
import { useToasts } from '../hooks/useToasts'

export function Toasts() {
  const { toasts, remove } = useToasts()

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      toasts.forEach((t) => {
        if (t.expiresAt && t.expiresAt <= now) remove(t.id)
      })
    }, 500)
    return () => clearInterval(timer)
  }, [toasts, remove])

  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span>{t.message}</span>
          {t.actionLabel && (
            <button
              className="toast-action"
              onClick={() => {
                t.onAction?.()
                remove(t.id)
              }}
            >
              {t.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
