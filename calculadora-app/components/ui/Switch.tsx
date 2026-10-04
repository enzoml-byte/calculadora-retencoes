import { forwardRef } from 'react'
import { clsx } from 'clsx'

export const Switch = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={clsx(
        'h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300',
        'checked:bg-blue-600 checked:border-blue-600',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
)

Switch.displayName = 'Switch'