'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Calculator,
  CreditCard,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui'

const navigation = [
  { name: 'Dashboard', href: '/calculadora', icon: LayoutDashboard },
  { name: 'Calculadora', href: '/calculadora', icon: Calculator },
  { name: 'Empresas', href: '/empresas', icon: Building2 },
  { name: 'Emissão', href: '/emissao', icon: FileText },
  { name: 'Conciliação', href: '/conciliacao', icon: CreditCard },
]

export function Sidebar({ collapsed = false, onToggle }: { collapsed?: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-navy border-r border-slate-700 transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
      aria-label="Navegação principal"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={clsx('flex items-center justify-between h-16 px-4 border-b border-slate-700', collapsed && 'justify-center')}>
          <Link href="/calculadora" className="flex items-center gap-2" aria-label="Ir para Calculadora">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-white text-lg">Excellence</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="text-slate-300 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto" aria-label="Menu principal">
          {navigation.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white',
                  collapsed && 'justify-center'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={clsx('h-5 w-5 flex-shrink-0', isActive && 'text-amber-300')} aria-hidden="true" />
                {!collapsed && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className={clsx('p-4 border-t border-slate-700', collapsed && 'items-center justify-center')}>
          {session?.user && (
            <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-medium">
                {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{session.user.name || session.user.email}</p>
                  <p className="text-slate-400 text-xs truncate capitalize">{session.user.role?.toLowerCase()}</p>
                </div>
              )}
            </div>
          )}
          <form action={ '/api/auth/signout' } method="POST" className={clsx('w-full mt-4', collapsed && 'justify-center')}>
            <Button
              type="submit"
              variant="ghost"
              className={clsx('w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10', collapsed && 'justify-center px-2')}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              {!collapsed && <span>Sair</span>}
            </Button>
          </form>
        </div>
      </div>
    </aside>
  )
}