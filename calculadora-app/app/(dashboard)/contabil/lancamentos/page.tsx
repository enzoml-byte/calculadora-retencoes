'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { FileText, Plus, Edit, Trash2, Search, Loader2, Download, Filter, FileSpreadsheet } from 'lucide-react'
import { formatCurrency, parseBR } from '@/lib/calculations'

type Lancamento = {
  id: string
  data: string
  historico: string
  contaDebito: string
  contaCredito: string
  valor: number
  tipo: 'ENTRADA' | 'SAIDA'
  status: 'PENDENTE' | 'CONCILIADO' | 'CANCELADO'
  createdAt: string
}

export default function LancamentosPage() {
  const { data: session } = useSession()
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null)
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    historico: '',
    contaDebito: '',
    contaCredito: '',
    valor: '',
    tipo: 'ENTRADA',
    status: 'PENDENTE',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [filterTipo, setFilterTipo] = useState<'all' | 'ENTRADA' | 'SAIDA'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDENTE' | 'CONCILIADO' | 'CANCELADO'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchLancamentos()
  }, [])

  const fetchLancamentos = async () => {
    try {
      const res = await fetch('/api/contabil/lancamentos')
      if (res.ok) {
        const data = await res.json()
        setLancamentos(data)
      }
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const valor = parseBR(formData.valor)
    if (valor <= 0) {
      setErrors({ valor: 'Valor deve ser maior que zero' })
      return
    }

    if (!formData.historico.trim()) {
      setErrors({ historico: 'Histórico é obrigatório' })
      return
    }

    setSubmitLoading(true)

    try {
      const url = editingLancamento ? `/api/contabil/lancamentos/${editingLancamento.id}` : '/api/contabil/lancamentos'
      const method = editingLancamento ? 'PUT' : 'POST'
      const body = { ...formData, valor }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      await fetchLancamentos()
      closeModal()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return

    try {
      const res = await fetch(`/api/contabil/lancamentos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      await fetchLancamentos()
    } catch (error) {
      alert('Erro ao excluir lançamento')
    }
  }

  const openEdit = (lanc: Lancamento) => {
    setEditingLancamento(lanc)
    setFormData({
      data: lanc.data,
      historico: lanc.historico,
      contaDebito: lanc.contaDebito,
      contaCredito: lanc.contaCredito,
      valor: String(lanc.valor),
      tipo: lanc.tipo,
      status: lanc.status,
    })
    setShowModal(true)
  }

  const openNew = () => {
    setEditingLancamento(null)
    setFormData({
      data: new Date().toISOString().split('T')[0],
      historico: '',
      contaDebito: '',
      contaCredito: '',
      valor: '',
      tipo: 'ENTRADA',
      status: 'PENDENTE',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLancamento(null)
    setErrors({})
    setFormData({
      data: new Date().toISOString().split('T')[0],
      historico: '',
      contaDebito: '',
      contaCredito: '',
      valor: '',
      tipo: 'ENTRADA',
      status: 'PENDENTE',
    })
  }

  const filtered = lancamentos.filter(l => {
    if (filterTipo !== 'all' && l.tipo !== filterTipo) return false
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (search && !l.historico.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const tipoLabels = { ENTRADA: 'Entrada', SAIDA: 'Saída' }
  const statusLabels = { PENDENTE: 'Pendente', CONCILIADO: 'Conciliado', CANCELADO: 'Cancelado' }
  const statusColors = { PENDENTE: 'warning' as const, CONCILIADO: 'success' as const, CANCELADO: 'danger' as const }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
            </span>
            Lançamentos Contábeis
          </h1>
          <p className="text-muted text-sm">Gerencie seus lançamentos contábeis</p>
        </div>
        <Button onClick={openNew}>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Lançamento
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Buscar por histórico, conta..."
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
                { value: 'ENTRADA', label: 'Entradas' },
                { value: 'SAIDA', label: 'Saídas' },
              ]}
              className="w-full sm:w-40"
            />
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'PENDENTE', label: 'Pendentes' },
                { value: 'CONCILIADO', label: 'Conciliados' },
                { value: 'CANCELADO', label: 'Cancelados' },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
            </span>
            Lançamentos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>Nenhum lançamento encontrado</p>
              <Button onClick={openNew} className="mt-4">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Novo Lançamento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead>Conta Débito</TableHead>
                    <TableHead>Conta Crédito</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.historico}</TableCell>
                      <TableCell className="text-sm">{item.contaDebito}</TableCell>
                      <TableCell className="text-sm">{item.contaCredito}</TableCell>
                      <TableCell className="font-mono font-medium text-right">
                        {item.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === 'ENTRADA' ? 'success' : 'warning'}>
                          {tipoLabels[item.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[item.status as keyof typeof statusColors]}>
                          {statusLabels[item.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                            <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.432 17.34a2 2 0 00.666-2.695l-2.5-2.5a2 2 0 00-2.828 0l-2.5 2.5a2 2 0 00-2.828 0l-2.5 2.5a2 2 0 01-2.828 0l-2.5 2.5a2 2 0 012.828 0l2.5-2.5a2 2 0 012.828 0l2.5-2.5a2 2 0 002.828-2.828z" /></svg>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const tipoLabels = { ENTRADA: 'Entrada', SAIDA: 'Saída' }
const statusLabels = { PENDENTE: 'Pendente', CONCILIADO: 'Conciliado', CANCELADO: 'Cancelado' }
const statusColors = { PENDENTE: 'warning' as const, CONCILIADO: 'success' as const, CANCELADO: 'danger' as const }