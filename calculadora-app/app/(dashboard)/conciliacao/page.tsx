'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { FileText, Upload, Loader2, CheckCircle, XCircle, AlertCircle, Download, Search, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'

type Conciliacao = {
  id: string
  notaId: string | null
  contaBancaria: string | null
  dataLancamento: string
  valor: number
  descricao: string | null
  status: string
  nota?: {
    id: string
    numeroNf: string
    valorBruto: number
    liquido: number
    empresa: {
      nomeFantasia: string | null
      razaoSocial: string
    }
  } | null
}

export default function ConciliacaoPage() {
  const { data: session } = useSession()
  const [conciliacoes, setConciliacoes] = useState<Conciliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDENTE' | 'CONCILIADO' | 'DIVERGENTE'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchConciliacoes()
  }, [])

  const fetchConciliacoes = async () => {
    try {
      const res = await fetch('/api/conciliacao')
      if (res.ok) {
        const data = await res.json()
        setConciliacoes(data)
      }
    } catch (error) {
      console.error('Erro ao buscar conciliações:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('contaBancaria', 'Conta Principal')

    setUploading(true)

    try {
      const res = await fetch('/api/conciliacao', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Erro ao processar arquivo')

      const data = await res.json()
      await fetchConciliacoes()
      alert(`${data.created} lançamentos importados. ${data.conciliacoes?.filter((c: any) => c.status === 'CONCILIADO').length || 0} conciliados automaticamente.`)
    } catch (error: any) {
      alert(error.message || 'Erro ao importar')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleConfirm = async (id: string, confirm: boolean) => {
    try {
      const res = await fetch(`/api/conciliacao/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      })

      if (!res.ok) throw new Error('Erro ao confirmar')

      await fetchConciliacoes()
    } catch (error) {
      alert('Erro ao atualizar')
    }
  }

  const filtered = conciliacoes.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (search && !c.descricao?.toLowerCase().includes(search.toLowerCase()) && 
        !c.nota?.numeroNf?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const statusColors = {
    PENDENTE: 'warning' as const,
    CONCILIADO: 'success' as const,
    DIVERGENTE: 'danger' as const,
  }

  const statusLabels = {
    PENDENTE: 'Pendente',
    CONCILIADO: 'Conciliado',
    DIVERGENTE: 'Divergente',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-600" />
            Conciliação Bancária
          </h1>
          <p className="text-muted text-sm">Importe extratos OFX/CSV e concilie com notas emitidas</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="file"
              accept=".ofx,.csv,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
              id="file-upload"
            />
            <Button variant="outline" disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              Importar OFX/CSV
            </Button>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Total Lançamentos</p>
            <p className="text-2xl font-bold text-ink">{conciliacoes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Conciliados</p>
            <p className="text-2xl font-bold text-green-600">
              {conciliacoes.filter(c => c.status === 'CONCILIADO').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">
              {conciliacoes.filter(c => c.status === 'PENDENTE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Divergentes</p>
            <p className="text-2xl font-bold text-red-600">
              {conciliacoes.filter(c => c.status === 'DIVERGENTE').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Buscar por descrição, nota, empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'PENDENTE', label: 'Pendentes' },
                { value: 'CONCILIADO', label: 'Conciliados' },
                { value: 'DIVERGENTE', label: 'Divergentes' },
              ]}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-amber-600" />
            Lançamentos ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota Fiscal</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id} className={item.status === 'DIVERGENTE' ? 'bg-red-50' : item.status === 'CONCILIADO' ? 'bg-green-50' : ''}>
                      <TableCell className="font-mono text-sm">{new Date(item.dataLancamento).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.descricao || '—'}</TableCell>
                      <TableCell className="font-mono font-medium">
                        {item.valor >= 0 ? '+' : ''}{formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className="text-sm text-muted">{item.contaBancaria || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[item.status as keyof typeof statusColors]}>
                          {statusLabels[item.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.nota ? (
                          <div>
                            <p className="text-sm font-medium">NF {item.nota.numeroNf}/{item.nota.serie}</p>
                            <p className="text-xs text-muted">{item.nota.empresa?.nomeFantasia || item.nota.empresa?.razaoSocial}</p>
                            <p className="text-xs text-muted">{formatCurrency(item.nota.liquido)}</p>
                          </div>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === 'PENDENTE' && item.nota && (
                          <Button variant="outline" size="sm" onClick={() => handleConfirm(item.id, true)} className="mr-1">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Confirmar
                          </Button>
                        )}
                        {item.status === 'CONCILIADO' && (
                          <Button variant="ghost" size="sm" onClick={() => handleConfirm(item.id, false)} className="text-amber-600 hover:text-amber-700">
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Desfazer
                          </Button>
                        )}
                        {item.status === 'DIVERGENTE' && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="border-dashed border-amber-300 bg-amber-50">
        <CardContent className="py-8 text-center">
          <Upload className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-ink mb-1">Importe seu extrato bancário</h3>
          <p className="text-muted mb-4">Arraste um arquivo OFX, CSV ou TXT aqui, ou clique para selecionar</p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".ofx,.csv,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
            />
            <Button variant="outline" disabled={uploading} className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Processando...' : 'Selecionar arquivo'}
            </Button>
          </label>
          <p className="text-xs text-muted mt-3">Formatos suportados: OFX, CSV (data;valor;descrição), TXT</p>
        </CardContent>
      </Card>
    </div>
  )
}