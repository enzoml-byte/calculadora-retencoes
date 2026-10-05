'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { ReactNode } from 'react'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={clsx(
          'min-h-screen transition-all duration-300',
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <header className="sticky top-0 z-30 bg-white border-b border-line shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <h1 className="text-lg font-semibold text-ink hidden sm:block">
              {getPageTitle()}
            </h1>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm text-muted">Excellence Contábil</span>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

function getPageTitle(): string {
  if (typeof window === 'undefined') return 'Dashboard'
  const path = window.location.pathname
  if (path === '/fiscal/calculadora') return 'Calculadora de Retenções'
  if (path.startsWith('/fiscal/empresas') || path.startsWith('/contabil/empresas')) return 'Empresas'
  if (path.startsWith('/fiscal/emissao')) return 'Emissão de Notas'
  if (path.startsWith('/fiscal/conciliacao')) return 'Conciliação Bancária'
  if (path.startsWith('/contabil/')) return 'Módulo Contábil'
  return 'Dashboard'
}

function clsx(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}