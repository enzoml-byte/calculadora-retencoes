'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { FileText, Building2, Calculator, Download, Copy, Loader2, AlertTriangle } from 'lucide-react'
import { calculateRetencao, formatCurrency, formatPercent, parseBR } from '@/lib/calculations'
import { notaCreateSchema } from '@/lib/validators'

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
}

type NotaResult = {
  ir: number
  pis: number
  cofins: number
  csll: number
  totalFederal: number
  iss: number
  totalGeral: number
  liquido: number
  ibs: number
  cbs: number
  aliquotaEfetivaSimples?: number
  dasSimples?: number
  simplesFaixa?: number
}

export default function EmissaoPage() {
  const { data: session } = useSession()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [emitindo, setEmitindo] = useState(false)
  const [preview, setPreview] = useState<any>(null)

  // Form
  const [formData, setFormData] = useState({
    valorBruto: '10000,00',
    issRetido: 'S' as 'S' | 'N',
    informaIbsCbs: false,
    ibsPerc: '0',
    cbsPerc: '0',
    numeroNf: '',
    serie: '1',
  })

  useEffect(() => {
    fetchEmpresas()
    fetchNotas()
  }, [])

  const fetchEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas')
      if (res.ok) {
        const data = await res.json()
        setEmpresas(data)
        if (data.length > 0 && !selectedEmpresaId) {
          setSelectedEmpresaId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar empresas:', error)
    }
  }

  const fetchNotas = async () => {
    try {
      const res = await fetch('/api/notas')
      if (res.ok) {
        const data = await res.json()
        setNotas(data)
      }
    } catch (error) {
      console.error('Erro ao buscar notas:', error)
    } finally {
      setLoading(false)
    }
  }

  const calcularPreview = async () => {
    if (!selectedEmpresaId) return

    const empresa = empresas.find(e => e.id === selectedEmpresaId)
    if (!empresa) return

    const bruto = parseBR(formData.valorBruto)
    if (bruto <= 0) return

    const regime = empresa.regime as 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR'
    const isHospitalar = regime === 'PRESUMIDO_HOSPITALAR'
    const anexo = (empresas.find(e => e.id === selectedEmpresaId)?.anexo as 'III' | 'IV' | 'V') || undefined
    const rbt12 = empresas.find(e => e.id === selectedEmpresaId)?.rbt12 ? Number(empresas.find(e => e.id === selectedEmpresaId)?.rbt12) : undefined

    // Import calculateRetencao dynamically
    const { calculateRetencao } = await import('@/lib/calculations')
    const res = calculateRetencao({
      regime: empresa.regime as 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR',
      isHospitalar,
      valorBruto: parseBR(formData.valorBruto),
      issRetido: formData.issRetido === 'S',
      informaIbsCbs: formData.informaIbsCbs,
      ibsPerc: parseBR(formData.ibsPerc),
      cbsPerc: parseBR(formData.cbsPerc),
      anexo,
      rbt12,
    })

    setPreview(res)
  }

  const handleEmitir = async () => {
    if (!selectedEmpresaId) return alert('Selecione uma empresa')
    if (!preview) return alert('Calcule a prévia primeiro')

    setEmitindo(true)

    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: selectedEmpresaId,
          valorBruto: parseBR(formData.valorBruto),
          regime: empresas.find(e => e.id === selectedEmpresaId)?.regime,
          issRetido: formData.issRetido === 'S',
          informaIbsCbs: formData.informaIbsCbs,
          ibsPerc: parseBR(formData.ibsPerc),
          cbsPerc: parseBR(formData.cbsPerc),
          numeroNf: formData.numeroNf || undefined,
          serie: formData.serie,
        }),
      })

      if (!res.ok) throw new Error('Erro ao emitir nota')

      const nota = await res.json()
      alert(`Nota ${nota.numeroNf} emitida com sucesso!`)
      fetchNotas()
      setPreview(null)
    } catch (error: any) {
      alert(error.message || 'Erro ao emitir nota')
    } finally {
      setEmitindo(false)
    }
  }

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-600" />
            Emissão de Notas
          </h1>
          <p className="text-muted text-sm">Emita notas fiscais com cálculo automático de retenções</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-600" />
                Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedEmpresaId}
                onChange={e => { setSelectedEmpresaId(e.target.value); setPreview(null); }}
                options={[
                  { value: '', label: '— Selecione a empresa —' },
                  ...empresas.map(e => ({ value: e.id, label: e.nomeFantasia || e.razaoSocial }))
                ]}
                placeholder="Selecione a empresa"
              />
              {selectedEmpresa && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm">
                  <p><span className="font-medium">Regime:</span> {selectedEmpresa.regime === 'SIMPLES' ? 'Simples Nacional' : selectedEmpresa.regime === 'PRESUMIDO_HOSPITALAR' ? 'Lucro Presumido Hospitalar' : 'Lucro Presumido Geral'}</p>
                  {selectedEmpresa.anexo && <p className="mt-1"><span className="font-medium">Anexo:</span> Anexo {selectedEmpresa.anexo}</p>}
                  <p className="mt-1"><span className="font-medium">ISS:</span> {selectedEmpresa.issRetido === 'SEMPRE' ? 'Sempre retido' : selectedEmpresa.issRetido === 'NUNCA' ? 'Nunca retido' : 'Perguntar a cada NF'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parâmetros da Nota */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-600" />
                Parâmetros da Nota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Valor Bruto (R$)"
                  type="text"
                  value={formData.valorBruto}
                  onChange={e => { setFormData({ ...formData, valorBruto: e.target.value }); setPreview(null); }}
                  placeholder="10.000,00"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número da NF / Série</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      label="Número NF"
                      type="text"
                      value={formData.numeroNf}
                      onChange={e => setFormData({ ...formData, numeroNf: e.target.value })}
                      placeholder="Automático"
                    />
                    <Input
                      label="Série"
                      type="text"
                      value={formData.serie}
                      onChange={e => setFormData({ ...formData, serie: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="ISS Retido"
                  value={formData.issRetido}
                  onChange={e => { setFormData({ ...formData, issRetido: e.target.value as 'S' | 'N' }); setPreview(null); }}
                  options={[
                    { value: 'S', label: 'Sim — Retido na fonte' },
                    { value: 'N', label: 'Não — Recolhido pelo prestador' },
                  ]}
                />
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.informaIbsCbs}
                      onChange={e => { setFormData({ ...formData, informaIbsCbs: e.target.checked }); setPreview(null); }}
                      className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">Destacar IBS/CBS na nota (informativo 2026)</span>
                  </label>
                </div>
              </div>

              {formData.informaIbsCbs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Alíquota IBS %"
                    type="text"
                    value={formData.ibsPerc}
                    onChange={e => { setFormData({ ...formData, ibsPerc: e.target.value }); setPreview(null); }}
                    placeholder="0"
                  />
                  <Input
                    label="Alíquota CBS %"
                    type="text"
                    value={formData.cbsPerc}
                    onChange={e => { setFormData({ ...formData, cbsPerc: e.target.value }); setPreview(null); }}
                    placeholder="0"
                  />
                </div>
              )}

              <Button onClick={calcularPreview} className="w-full" size="lg" variant="primary">
                Calcular Prévia
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          {preview && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Prévia do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-muted">Total Federal</p>
                    <p className="text-lg font-bold text-ink">{preview.totalFederal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-xs text-muted">ISS</p>
                    <p className="text-lg font-bold text-ink">{preview.iss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-white">
                    <p className="text-xs text-amber-200">Total Retido</p>
                    <p className="text-lg font-bold">{preview.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-3 text-white">
                    <p className="text-xs text-amber-100">Valor Líquido</p>
                    <p className="text-xl font-bold">{preview.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleEmitir} className="flex-1" size="lg" loading={emitindo}>
                    Emitir Nota Fiscal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Notas Recentes */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Notas Emitidas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notas.length === 0 ? (
                <div className="text-center py-8 text-muted">
                  <p>Nenhuma nota emitida ainda</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {notas.slice(0, 10).map(nota => (
                    <div key={nota.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">NF {nota.numeroNf}/{nota.serie}</p>
                          <p className="text-xs text-muted">{nota.empresa?.nomeFantasia || nota.empresa?.razaoSocial}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-600 text-sm">{nota.valorBruto?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          <p className="text-xs text-muted">{new Date(nota.emitidaEm).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}