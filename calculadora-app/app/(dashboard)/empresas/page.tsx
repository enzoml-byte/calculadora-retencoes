'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { Building2, Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'
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
      parsed.error.errors.forEach(err => {
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
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Building2 className="h-6 w-6 text-amber-600" />
            Empresas
          </h1>
          <p className="text-muted text-sm">Gerencie suas empresas para cálculo de retenções</p>
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
            <Search className="h-5 w-5 text-amber-600" />
            Lista de Empresas ({empresas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empresas.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted mx-auto mb-4" />
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
                          {regimeLabels[empresa.regime as keyof typeof regimeLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {empresa.anexo ? (
                          <Badge variant="info">{anexoLabels[empresa.anexo as keyof typeof anexoLabels]}</Badge>
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
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(empresa.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
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