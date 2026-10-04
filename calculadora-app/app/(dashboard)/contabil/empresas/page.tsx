'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { FileText, Building2, Plus, Edit, Trash2, Search, Loader2, Download, Upload } from 'lucide-react'
import { formatCurrency, parseBR } from '@/lib/calculations'
import { empresaCreateSchema } from '@/lib/validators'

type Empresa = {
  id: string
  nomeFantasia: string | null
  razaoSocial: string
  cnpj: string
  regime: string
  anexo: string | null
  rbt12: number | null
  issRetido: string
  informaIbsCbs: boolean
  createdAt: string
}

export default function EmpresasPage() {
  const { data: session } = useSession()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    regime: 'PRESUMIDO_GERAL',
    anexo: 'III',
    rbt12: '',
    issRetido: 'SEMPRE',
    informaIbsCbs: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas')
      if (res.ok) {
        const data = await res.json()
        setEmpresas(data)
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = empresaCreateSchema.safeParse({
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ''),
      rbt12: formData.rbt12 ? parseFloat(formData.rbt12.replace(/\./g, '').replace(',', '.')) : undefined,
    })

    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.issues.forEach((err: any) => {
        if (err.path[0]) errs[err.path[0] as string] = err.message
      })
      setErrors(errs)
      return
    }

    setSubmitLoading(true)

    try {
      const url = editingEmpresa ? `/api/empresas/${editingEmpresa.id}` : '/api/empresas'
      const method = editingEmpresa ? 'PUT' : 'POST'
      const body = {
        ...parsed.data,
        cnpj: parsed.data.cnpj.replace(/\D/g, ''),
        rbt12: parsed.data.rbt12,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar')
      }

      await fetchEmpresas()
      closeModal()
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar')
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return

    try {
      const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      await fetchEmpresas()
    } catch (error) {
      alert('Erro ao excluir empresa')
    }
  }

  const openEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa)
    setFormData({
      razaoSocial: empresa.razaoSocial,
      cnpj: empresa.cnpj,
      regime: empresa.regime,
      anexo: empresa.anexo || 'III',
      rbt12: empresa.rbt12 ? String(empresa.rbt12) : '',
      issRetido: empresa.issRetido,
      informaIbsCbs: empresa.informaIbsCbs,
    })
    setShowModal(true)
  }

  const openNew = () => {
    setEditingEmpresa(null)
    setFormData({
      razaoSocial: '',
      cnpj: '',
      regime: 'PRESUMIDO_GERAL',
      anexo: 'III',
      rbt12: '',
      issRetido: 'SEMPRE',
      informaIbsCbs: true,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEmpresa(null)
    setErrors({})
    setFormData({
      razaoSocial: '',
      cnpj: '',
      regime: 'PRESUMIDO_GERAL',
      anexo: 'III',
      rbt12: '',
      issRetido: 'SEMPRE',
      informaIbsCbs: true,
    })
  }

  const regimeLabels = {
    SIMPLES: 'Simples Nacional',
    PRESUMIDO_GERAL: 'Lucro Presumido Geral',
    PRESUMIDO_HOSPITALAR: 'Lucro Presumido Hospitalar',
  }

  const anexoLabels = { III: 'Anexo III', IV: 'Anexo IV', V: 'Anexo V' }

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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-3-3a2 2 0 00-1.414-.586H7" /></svg>
            </span>
            Empresas
          </h1>
          <p className="text-muted text-sm">Gerencie suas empresas para o módulo Contábil</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-3-3a2 2 0 00-1.414-.586H7" /></svg>
            </span>
            Lista de Empresas ({empresas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empresas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="h-12 w-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-3-3a2 2 0 00-1.414-.586H7" /></svg>
              <h3 className="text-lg font-medium text-ink mb-1">Nenhuma empresa cadastrada</h3>
              <p className="text-muted mb-4">Clique em "Nova Empresa" para cadastrar a primeira</p>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Empresa
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead>Anexo</TableHead>
                    <TableHead>ISS</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map(empresa => (
                    <TableRow key={empresa.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{empresa.nomeFantasia || empresa.razaoSocial}</p>
                          <p className="text-xs text-muted">{empresa.razaoSocial}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{empresa.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</TableCell>
                      <TableCell>
                        <Badge variant={empresa.regime === 'SIMPLES' ? 'info' : empresa.regime === 'PRESUMIDO_HOSPITALAR' ? 'warning' : 'secondary'}>
                          {empresa.regime === 'SIMPLES' ? 'Simples Nacional' : empresa.regime === 'PRESUMIDO_HOSPITALAR' ? 'Lucro Presumido Hospitalar' : 'Lucro Presumido Geral'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {empresa.anexo ? (
                          <Badge variant="info">Anexo {empresa.anexo}</Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={empresa.issRetido === 'SEMPRE' ? 'success' : empresa.issRetido === 'NUNCA' ? 'danger' : 'warning'}>
                          {empresa.issRetido === 'SEMPRE' ? 'Sempre' : empresa.issRetido === 'NUNCA' ? 'Nunca' : 'Perguntar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(empresa)}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.432 17.34a2 2 0 00.666-2.695l-2.5-2.5a2 2 0 00-2.828 0l-2.5 2.5a2 2 0 01-2.828 0l-2.5 2.5a2 2 0 002.828 2.828l2.5-2.5a2 2 0 012.828 0l2.5 2.5a2 2 0 002.828-2.828z" /></svg>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(empresa.id)} className="text-red-600 hover:text-red-700">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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