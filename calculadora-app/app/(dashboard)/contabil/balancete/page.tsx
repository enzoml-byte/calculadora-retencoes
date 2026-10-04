'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select, Button } from '@/components/ui'
import { FileSpreadsheet, Download, Filter, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'

type BalanceteItem = {
  conta: string
  descricao: string
  saldoAnterior: number
  debitoPeriodo: number
  creditoPeriodo: number
  saldoAtual: number
}

export default function BalancetePage() {
  const { data: session } = useSession()
  const [balancete, setBalancete] = useState<BalanceteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(new Date().toISOString().split('T')[0].substring(0, 7))
  const [filterTipo, setFilterTipo] = useState<'all' | 'ativo' | 'passivo' | 'receita' | 'despesa' | 'resultado'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchBalancete()
  }, [periodo])

  const fetchBalancete = async () => {
    try {
      const res = await fetch(`/api/contabil/balancete?periodo=${periodo}`)
      if (res.ok) {
        const data = await res.json()
        setBalancete(data)
      }
    } catch (error) {
      console.error('Erro ao buscar balancete:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = balancete.filter(item => {
    if (search && !item.descricao.toLowerCase().includes(search.toLowerCase()) && !item.conta.includes(search)) return false
    return true
  })

  const totalSaldoAnterior = filtered.reduce((sum, item) => sum + item.saldoAnterior, 0)
  const totalDebitoPeriodo = filtered.reduce((sum, item) => sum + item.debitoPeriodo, 0)
  const totalCreditoPeriodo = filtered.reduce((sum, item) => sum + item.creditoPeriodo, 0)
  const totalSaldoAtual = filtered.reduce((sum, item) => sum + item.saldoAtual, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
            </span>
            Balancete de Verificação
          </h1>
          <p className="text-muted text-sm">Balancete de verificação por período</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Período:</label>
            <input
              type="month"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2h2" /></svg>
            Imprimir
          </Button>
          <Button variant="secondary">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Buscar por conta, descrição..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as any)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'ativo', label: 'Ativo' },
                { value: 'passivo', label: 'Passivo' },
                { value: 'receita', label: 'Receita' },
                { value: 'despesa', label: 'Despesa' },
                { value: 'resultado', label: 'Resultado' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Saldo Anterior</p>
            <p className="text-2xl font-bold text-ink">{formatCurrency(totalSaldoAnterior)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Débitos do Período</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalDebitoPeriodo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Créditos do Período</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCreditoPeriodo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Saldo Atual</p>
            <p className="text-2xl font-bold text-ink">{formatCurrency(totalSaldoAtual)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
            </span>
            Balancete de Verificação ({filtered.length} contas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>Nenhuma conta encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Saldo Anterior</TableHead>
                    <TableHead className="text-right">Débitos</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.conta}>
                      <TableCell className="font-mono font-medium">{item.conta}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.descricao}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.saldoAnterior)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600">{formatCurrency(item.debitoPeriodo)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{formatCurrency(item.creditoPeriodo)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(item.saldoAtual)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell colSpan={2}>TOTAIS</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSaldoAnterior)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(totalDebitoPeriodo)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totalCreditoPeriodo)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalSaldoAtual)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}