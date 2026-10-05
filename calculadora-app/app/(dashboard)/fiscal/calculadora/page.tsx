'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui'
import { Calculator, Building2, Download, Upload, RefreshCw, AlertTriangle, Info, FileText, Copy, X } from 'lucide-react'
import { calculateRetencao, formatCurrency, formatPercent, formatPercent8, parseBR, validateCNPJ } from '@/lib/calculations'
import { empresaCreateSchema } from '@/lib/validators'
import { CnpjField } from '@/components/cnpj/CnpjField'
import type { CNPJData } from '@/lib/cnpj'

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

type RetencaoResult = {
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
  parcelaDeduzir?: number
  aliquotaNominal?: number
}

export default function CalculadoraPage() {
  const { data: session } = useSession()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [valorBruto, setValorBruto] = useState('10000,00')
  const [issRetido, setIssRetido] = useState<'S' | 'N'>('S')
  const [informaIbsCbs, setInformaIbsCbs] = useState(false)
  const [ibsPerc, setIbsPerc] = useState('0')
  const [cbsPerc, setCbsPerc] = useState('0')
  const [result, setResult] = useState<RetencaoResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showEmpresaModal, setShowEmpresaModal] = useState(false)
  const [empresaForm, setEmpresaForm] = useState<{
    razaoSocial: string
    nomeFantasia: string
    cnpj: string
    regime: 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR'
    anexo: 'III' | 'IV' | 'V'
    rbt12: string
    issRetido: 'SEMPRE' | 'NUNCA' | 'PERGUNTAR'
    informaIbsCbs: boolean
  }>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    regime: 'PRESUMIDO_GERAL',
    anexo: 'III',
    rbt12: '',
    issRetido: 'SEMPRE',
    informaIbsCbs: true,
  })
  const [cnpjInfo, setCnpjInfo] = useState<CNPJData | null>(null)
  const [empresaError, setEmpresaError] = useState<Record<string, string>>({})

  // Fetch empresas on mount
  useEffect(() => {
    fetchEmpresas()
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

  const handleCalcular = async () => {
    if (!selectedEmpresaId) {
      alert('Selecione uma empresa')
      return
    }

    const empresa = empresas.find(e => e.id === selectedEmpresaId)
    if (!empresa) return

    const bruto = parseBR(valorBruto)
    if (bruto <= 0) {
      alert('Digite o valor bruto da NF')
      return
    }

    setLoading(true)

    const regime = empresa.regime as 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR'
    const isHospitalar = regime === 'PRESUMIDO_HOSPITALAR'
    const anexo = (empresa.anexo as 'III' | 'IV' | 'V') || undefined
    const rbt12 = empresa.rbt12 ? Number(empresa.rbt12) : undefined

    const res = calculateRetencao({
      regime,
      isHospitalar,
      valorBruto: bruto,
      issRetido: issRetido === 'S',
      informaIbsCbs,
      ibsPerc: parseBR(ibsPerc),
      cbsPerc: parseBR(cbsPerc),
      anexo,
      rbt12,
    })

    setResult(res)
    setLoading(false)
  }

  const handleCreateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmpresaError({})

    const parsed = empresaCreateSchema.safeParse({
      ...empresaForm,
      cnpj: empresaForm.cnpj.replace(/\D/g, ''),
      rbt12: empresaForm.rbt12 ? parseBR(empresaForm.rbt12) : undefined,
    })

    if (!parsed.success) {
      const errors: Record<string, string> = {}
      parsed.error.issues.forEach((err: any) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message
      })
      setEmpresaError(errors)
      return
    }

    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          cnpj: parsed.data.cnpj.replace(/\D/g, ''),
          rbt12: parsed.data.rbt12,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar empresa')
      }

      await fetch('/api/empresas').then(r => r.json()).then(data => setEmpresas(data))
      setShowEmpresaModal(false)
      setCnpjInfo(null)
      setEmpresaForm({
        razaoSocial: '',
        nomeFantasia: '',
        cnpj: '',
        regime: 'PRESUMIDO_GERAL',
        anexo: 'III',
        rbt12: '',
        issRetido: 'SEMPRE',
        informaIbsCbs: true,
      })
    } catch (error: any) {
      alert(error.message || 'Erro ao criar empresa')
    }
  }

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId)
  const regimeLabels = {
    SIMPLES: 'Simples Nacional',
    PRESUMIDO_GERAL: 'Lucro Presumido Geral',
    PRESUMIDO_HOSPITALAR: 'Lucro Presumido Hospitalar',
  }
  const anexoLabels = { III: 'Anexo III', IV: 'Anexo IV', V: 'Anexo V' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Calculator className="h-6 w-6 text-amber-600" />
            Calculadora de Retenções
          </h1>
          <p className="text-muted text-sm">Cálculo de retenções federais, ISS e Simples Nacional</p>
        </div>
        <Button variant="outline" onClick={() => setShowEmpresaModal(true)}>
          <Building2 className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Empresa Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            Empresa Selecionada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={selectedEmpresaId}
              onChange={e => setSelectedEmpresaId(e.target.value)}
              options={[
                { value: '', label: '— Selecione uma empresa —' },
                ...empresas.map(e => ({ value: e.id, label: e.nomeFantasia || e.razaoSocial }))
              ]}
              placeholder="Selecione uma empresa"
            />
            {empresas.length === 0 && (
              <div className="col-span-4 text-center py-4 text-muted">
                Nenhuma empresa cadastrada. Clique em "Nova Empresa" para começar.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parâmetros da Nota */}
      {selectedEmpresaId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-amber-600" />
                Parâmetros da Nota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor Bruto (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold text-lg">R$</span>
                    <input
                      type="text"
                      value={valorBruto}
                      onChange={e => setValorBruto(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 text-right text-lg font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-amber-50"
                      placeholder="10.000,00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ISS Retido</label>
                  <Select
                    value={issRetido}
                    onChange={e => setIssRetido(e.target.value as 'S' | 'N')}
                    options={[
                      { value: 'S', label: 'Sim — Retido na fonte' },
                      { value: 'N', label: 'Não — Recolhido pelo prestador' },
                    ]}
                    placeholder="ISS Retido"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IBS/CBS (informativo)</label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={informaIbsCbs}
                      onChange={e => setInformaIbsCbs(e.target.checked)}
                      className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">Destacar IBS/CBS na nota</span>
                  </label>
                </div>
              </div>

              {informaIbsCbs && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Alíquota IBS %"
                    type="text"
                    value={ibsPerc}
                    onChange={e => setIbsPerc(e.target.value)}
                    placeholder="0"
                  />
                  <Input
                    label="Alíquota CBS %"
                    type="text"
                    value={cbsPerc}
                    onChange={e => setCbsPerc(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              <Button onClick={handleCalcular} className="w-full" size="lg" loading={loading}>
                Calcular Retenções
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Resultado */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              Resultado do Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-muted">IR Retido</p>
                <p className="text-lg font-bold text-ink">{formatCurrency(result.ir)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-muted">PIS (0,65%)</p>
                <p className="text-lg font-bold text-ink">{formatCurrency(result.pis)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-muted">COFINS (3%)</p>
                <p className="text-lg font-bold text-ink">{formatCurrency(result.cofins)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-muted">CSLL (1%)</p>
                <p className="text-lg font-bold text-ink">{formatCurrency(result.csll)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-navy border border-navy rounded-lg p-3 text-white">
                <p className="text-xs text-amber-200">Total Federal</p>
                <p className="text-lg font-bold">{formatCurrency(result.totalFederal)}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-muted">ISS Retido (5%)</p>
                <p className="text-lg font-bold text-ink">{formatCurrency(result.iss)}</p>
              </div>
              <div className="bg-navy border border-navy rounded-lg p-3 text-white">
                <p className="text-xs text-amber-200">Total Retido Geral</p>
                <p className="text-lg font-bold">{formatCurrency(result.totalGeral)}</p>
              </div>
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-3 text-navy">
                <p className="text-xs text-amber-900/80">Valor Líquido</p>
                <p className="text-xl font-bold">{formatCurrency(result.liquido)}</p>
              </div>
            </div>

            {result.aliquotaEfetivaSimples && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-amber-800 mb-2">Simples Nacional - Detalhamento</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div><span className="text-muted">Faixa:</span> {result.simplesFaixa}ª</div>
                  <div><span className="text-muted">Nominal:</span> {result.aliquotaNominal ? formatPercent(result.aliquotaNominal * 100) : '—'}</div>
                  <div><span className="text-muted">Efetiva:</span> {formatPercent8(result.aliquotaEfetivaSimples * 100)}</div>
                  <div><span className="text-muted">DAS:</span> {formatCurrency(result.dasSimples || 0)}</div>
                </div>
              </div>
            )}

            {result.ibs > 0 || result.cbs > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">IBS/CBS (Informativo - não abate do líquido)</p>
                <p>IBS: {formatCurrency(result.ibs)} + CBS: {formatCurrency(result.cbs)} = {formatCurrency(result.ibs + result.cbs)}</p>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(
                `Valor Bruto: ${result.liquido + result.totalGeral}\nIR: ${result.ir}\nPIS: ${result.pis}\nCOFINS: ${result.cofins}\nCSLL: ${result.csll}\nISS: ${result.iss}\nTotal Retido: ${result.totalGeral}\nLíquido: ${result.liquido}`
              )}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Memória
              </Button>
              <Button variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empresa Info */}
      {selectedEmpresaId && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted">Empresa</p>
                <p className="font-medium">{empresas.find(e => e.id === selectedEmpresaId)?.nomeFantasia || empresas.find(e => e.id === selectedEmpresaId)?.razaoSocial}</p>
              </div>
              <div>
                <p className="text-muted">Regime</p>
                <p className="font-medium">
                  <Badge variant="secondary">{regimeLabels[empresas.find(e => e.id === selectedEmpresaId)?.regime as keyof typeof regimeLabels] || '—'}</Badge>
                </p>
              </div>
              {empresas.find(e => e.id === selectedEmpresaId)?.regime === 'SIMPLES' && empresas.find(e => e.id === selectedEmpresaId)?.anexo && (
                <div>
                  <p className="text-muted">Anexo</p>
                  <p className="font-medium">
                    <Badge variant="info">{anexoLabels[empresas.find(e => e.id === selectedEmpresaId)?.anexo as keyof typeof anexoLabels]}</Badge>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showEmpresaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Nova Empresa — consulta automática</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowEmpresaModal(false); setCnpjInfo(null) }} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateEmpresa} className="p-4 space-y-4">
              <CnpjField
                value={empresaForm.cnpj}
                onChange={v => setEmpresaForm(prev => ({ ...prev, cnpj: v }))}
                onFound={data => {
                  setCnpjInfo(data)
                  setEmpresaForm(prev => ({
                    ...prev,
                    cnpj: data.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'),
                    razaoSocial: data.razaoSocial || prev.razaoSocial,
                    nomeFantasia: data.nomeFantasia || prev.nomeFantasia,
                    anexo: (data.anexoSugerido as 'III' | 'IV' | 'V') || prev.anexo,
                  }))
                }}
                error={empresaError.cnpj}
              />
              <Input
                label="Razão Social *"
                value={empresaForm.razaoSocial}
                onChange={e => setEmpresaForm(prev => ({ ...prev, razaoSocial: e.target.value }))}
                error={empresaError.razaoSocial}
                placeholder="Preenchida automaticamente pela Receita"
              />
              <Input
                label="Nome Fantasia"
                value={empresaForm.nomeFantasia}
                onChange={e => setEmpresaForm(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                placeholder="Preenchido automaticamente (editável)"
              />
              {cnpjInfo && (
                <div className="text-xs bg-slate-50 border rounded-lg p-2">
                  {cnpjInfo.razaoSocial} • {cnpjInfo.municipio}/{cnpjInfo.uf} • CNAE {cnpjInfo.cnaeFiscal}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Regime"
                  value={empresaForm.regime}
                  onChange={e => setEmpresaForm(prev => ({ ...prev, regime: e.target.value as 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR' }))}
                  options={[
                    { value: 'SIMPLES', label: 'Simples Nacional' },
                    { value: 'PRESUMIDO_GERAL', label: 'Lucro Presumido Geral' },
                    { value: 'PRESUMIDO_HOSPITALAR', label: 'Lucro Presumido Hospitalar' },
                  ]}
                />
                <Select
                  label="Anexo"
                  value={empresaForm.anexo}
                  onChange={e => setEmpresaForm(prev => ({ ...prev, anexo: e.target.value as 'III' | 'IV' | 'V' }))}
                  options={[
                    { value: 'III', label: 'Anexo III' },
                    { value: 'IV', label: 'Anexo IV' },
                    { value: 'V', label: 'Anexo V' },
                  ]}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEmpresaModal(false); setCnpjInfo(null) }} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Cadastrar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}