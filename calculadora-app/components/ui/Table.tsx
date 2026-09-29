import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="overflow-x-auto">
      <table
        ref={ref}
        className={clsx('w-full text-sm text-slate-700', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
)

Table.displayName = 'Table'

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => (
    <thead ref={ref} className={clsx('bg-slate-50 border-b border-slate-100', className)} {...props}>
      {children}
    </thead>
  )
)

TableHeader.displayName = 'TableHeader'

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => (
    <tbody ref={ref} className={clsx('divide-y divide-slate-100', className)} {...props}>
      {children}
    </tbody>
  )
)

TableBody.displayName = 'TableBody'

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => (
    <tr ref={ref} className={clsx('hover:bg-slate-50 transition-colors', className)} {...props}>
      {children}
    </tr>
  )
)

TableRow.displayName = 'TableRow'

export const TableHead = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={clsx('px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs', className)}
      {...props}
    >
      {children}
    </th>
  )
)

TableHead.displayName = 'TableHead'

export const TableCell = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, ...props }, ref) => (
    <td ref={ref} className={clsx('px-4 py-3', className)} {...props}>
      {children}
    </td>
  )
)

TableCell.displayName = 'TableCell'