'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Button, Switch } from '@/components/ui'
import { Settings, Save, User, Building2, DollarSign, FileText, Loader2 } from 'lucide-react'

type Config = {
  empresa: {
    razaoSocial: string
    nomeFantasia: string
    cnpj: string
    endereco: string
    cidade: string
    uf: string
    cep: string
    telefone: string
    email: string
    regimeTributario: string
    anexoSimples: string
    inscricaoEstadual: string
    inscricaoMunicipal: string
    cnae: string
  }
  contabil: {
    planoContas: string
    exercicioAtual: string
    regimeContabil: 'competencia' | 'caixa'
    metodoDepreciacao: 'linear' | 'decrescente' | 'soma_digitos'
    moedaBase: string
    casasDecimais: number
  }
  fiscais: {
    aliquotaPIS: number
    aliquotaCOFINS: number
    aliquotaCSLL: number
    aliquotaIRPJ: number
    aliquotaISS: number
    regimePISCOFINS: 'cumulativo' | 'nao_cumulativo'
    regimeISS: 'normal' | 'simples'
    retemISS: boolean
    retemPISCOFINS: boolean
    retemCSLL: boolean
    retemIR: boolean
  }
  integracao: {
    certificadoDigital: string
    ambienteNFe: 'producao' | 'homologacao'
    serieNFe: string
    proximoNumeroNFe: number
    certificadoValidade: string
  }
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<'empresa' | 'contabil' | 'fiscais' | 'integracao'>('empresa')
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Config>({
    empresa: {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      endereco: '',
      cidade: '',
      uf: '',
      cep: '',
      telefone: '',
      email: '',
      regimeTributario: 'PRESUMIDO_GERAL',
      anexoSimples: 'III',
      inscricaoEstadual: '',
      inscricaoMunicipal: '',
      cnae: '',
    },
    contabil: {
      planoContas: 'padrao',
      exercicioAtual: new Date().getFullYear().toString(),
      regimeContabil: 'competencia',
      metodoDepreciacao: 'linear',
      moedaBase: 'BRL',
      casasDecimais: 2,
    },
    fiscais: {
      aliquotaPIS: 0.65,
      aliquotaCOFINS: 3.0,
      aliquotaCSLL: 1.0,
      aliquotaIRPJ: 15.0,
      aliquotaISS: 5.0,
      regimePISCOFINS: 'cumulativo',
      regimeISS: 'normal',
      retemISS: true,
      retemPISCOFINS: true,
      retemCSLL: true,
      retemIR: true,
    },
    integracao: {
      certificadoDigital: '',
      ambienteNFe: 'homologacao',
      serieNFe: '1',
      proximoNumeroNFe: 1,
      certificadoValidade: '',
    },
  })

  useEffect(() => {
    // TODO: fetch config from API
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: POST to /api/contabil/configuracoes
      await new Promise(r => setTimeout(r, 1000))
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (section: keyof Config, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2 },
    { id: 'contabil', label: 'Contábil', icon: FileText },
    { id: 'fiscais', label: 'Fiscais', icon: DollarSign },
    { id: 'integracao', label: 'Integração', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Settings className="h-5 w-5" />
            </span>
            Configurações do Módulo Contábil
          </h1>
          <p className="text-muted text-sm">Gerencie parâmetros da empresa, contábeis, fiscais e integrações</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8" aria-label="Abas de configuração">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Empresa Tab */}
      {activeTab === 'empresa' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Razão Social"
                  value={config.empresa.razaoSocial}
                  onChange={e => handleChange('empresa', 'razaoSocial', e.target.value)}
                  placeholder="Razão Social"
                />
                <Input
                  label="Nome Fantasia"
                  value={config.empresa.nomeFantasia}
                  onChange={e => handleChange('empresa', 'nomeFantasia', e.target.value)}
                  placeholder="Nome Fantasia"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="CNPJ"
                  value={config.empresa.cnpj}
                  onChange={e => handleChange('empresa', 'cnpj', e.target.value.replace(/\D/g, ''))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <Input
                  label="Inscrição Estadual"
                  value={config.empresa.inscricaoEstadual}
                  onChange={e => handleChange('empresa', 'inscricaoEstadual', e.target.value)}
                  placeholder="Inscrição Estadual"
                />
                <Input
                  label="Inscrição Municipal"
                  value={config.empresa.inscricaoMunicipal}
                  onChange={e => handleChange('empresa', 'inscricaoMunicipal', e.target.value)}
                  placeholder="Inscrição Municipal"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="CNAE Principal"
                  value={config.empresa.cnae}
                  onChange={e => handleChange('empresa', 'cnae', e.target.value)}
                  placeholder="Ex: 6201-5/01"
                />
                <Select
                  label="Regime Tributário"
                  value={config.empresa.regimeTributario}
                  onChange={e => handleChange('empresa', 'regimeTributario', e.target.value)}
                  options={[
                    { value: 'SIMPLES', label: 'Simples Nacional' },
                    { value: 'PRESUMIDO_GERAL', label: 'Lucro Presumido Geral' },
                    { value: 'PRESUMIDO_HOSPITALAR', label: 'Lucro Presumido Hospitalar' },
                    { value: 'LUCRO_REAL', label: 'Lucro Real' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Anexo Simples"
                  value={config.empresa.anexoSimples}
                  onChange={e => handleChange('empresa', 'anexoSimples', e.target.value)}
                  options={[
                    { value: 'I', label: 'Anexo I - Comércio' },
                    { value: 'II', label: 'Anexo II - Indústria' },
                    { value: 'III', label: 'Anexo III - Serviços' },
                    { value: 'IV', label: 'Anexo IV - Serviços Específicos' },
                    { value: 'V', label: 'Anexo V - Serviços Intelectuais' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="CEP"
                  value={config.empresa.cep}
                  onChange={e => handleChange('empresa', 'cep', e.target.value.replace(/\D/g, ''))}
                  placeholder="00000-000"
                  maxLength={9}
                />
                <Input
                  label="Endereço"
                  value={config.empresa.endereco}
                  onChange={e => handleChange('empresa', 'endereco', e.target.value)}
                  placeholder="Logradouro, número, complemento"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Cidade"
                    value={config.empresa.cidade}
                    onChange={e => handleChange('empresa', 'cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                  <Select
                    label="UF"
                    value={config.empresa.uf}
                    onChange={e => handleChange('empresa', 'uf', e.target.value)}
                    options={['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => ({ value: uf, label: uf }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Telefone"
                  value={config.empresa.telefone}
                  onChange={e => handleChange('empresa', 'telefone', e.target.value.replace(/\D/g, ''))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={config.empresa.email}
                  onChange={e => handleChange('empresa', 'email', e.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contábil Tab */}
      {activeTab === 'contabil' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Parâmetros Contábeis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Plano de Contas"
                  value={config.contabil.planoContas}
                  onChange={e => handleChange('contabil', 'planoContas', e.target.value)}
                  options={[
                    { value: 'padrao', label: 'Padrão Brasileiro (CPC/IFRS)' },
                    { value: 'simples', label: 'Simples Nacional' },
                    { value: 'personalizado', label: 'Personalizado' },
                  ]}
                />
                <Input
                  label="Exercício Atual"
                  type="number"
                  value={config.contabil.exercicioAtual}
                  onChange={e => handleChange('contabil', 'exercicioAtual', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Regime Contábil"
                  value={config.contabil.regimeContabil}
                  onChange={e => handleChange('contabil', 'regimeContabil', e.target.value)}
                  options={[
                    { value: 'competencia', label: 'Competência' },
                    { value: 'caixa', label: 'Caixa' },
                  ]}
                />
                <Select
                  label="Método de Depreciação"
                  value={config.contabil.metodoDepreciacao}
                  onChange={e => handleChange('contabil', 'metodoDepreciacao', e.target.value)}
                  options={[
                    { value: 'linear', label: 'Linear' },
                    { value: 'decrescente', label: 'Decrescente (duplo-declínio)' },
                    { value: 'soma_digitos', label: 'Soma dos Dígitos' },
                  ]}
                />
                <Select
                  label="Moeda Base"
                  value={config.contabil.moedaBase}
                  onChange={e => handleChange('contabil', 'moedaBase', e.target.value)}
                  options={[
                    { value: 'BRL', label: 'Real Brasileiro (BRL)' },
                    { value: 'USD', label: 'Dólar Americano (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Casas Decimais"
                  type="number"
                  min={0}
                  max={6}
                  value={config.contabil.casasDecimais}
                  onChange={e => handleChange('contabil', 'casasDecimais', parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fiscais Tab */}
      {activeTab === 'fiscais' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Parâmetros Fiscais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Alíquota PIS (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={config.fiscais.aliquotaPIS}
                  onChange={e => handleChange('fiscais', 'aliquotaPIS', parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Alíquota COFINS (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={config.fiscais.aliquotaCOFINS}
                  onChange={e => handleChange('fiscais', 'aliquotaCOFINS', parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Alíquota CSLL (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={config.fiscais.aliquotaCSLL}
                  onChange={e => handleChange('fiscais', 'aliquotaCSLL', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Alíquota IRPJ (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={config.fiscais.aliquotaIRPJ}
                  onChange={e => handleChange('fiscais', 'aliquotaIRPJ', parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Alíquota ISS (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={config.fiscais.aliquotaISS}
                  onChange={e => handleChange('fiscais', 'aliquotaISS', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Regime PIS/COFINS"
                  value={config.fiscais.regimePISCOFINS}
                  onChange={e => handleChange('fiscais', 'regimePISCOFINS', e.target.value)}
                  options={[
                    { value: 'cumulativo', label: 'Cumulativo' },
                    { value: 'nao_cumulativo', label: 'Não Cumulativo' },
                  ]}
                />
                <Select
                  label="Regime ISS"
                  value={config.fiscais.regimeISS}
                  onChange={e => handleChange('fiscais', 'regimeISS', e.target.value)}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'simples', label: 'Simples Nacional' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.fiscais.retemISS}
                    onChange={e => handleChange('fiscais', 'retemISS', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Retém ISS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.fiscais.retemPISCOFINS}
                    onChange={e => handleChange('fiscais', 'retemPISCOFINS', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Retém PIS/COFINS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.fiscais.retemCSLL}
                    onChange={e => handleChange('fiscais', 'retemCSLL', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Retém CSLL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.fiscais.retemIR}
                    onChange={e => handleChange('fiscais', 'retemIR', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Retém IR</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integração Tab */}
      {activeTab === 'integracao' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-500" />
                Integração e NFe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Certificado Digital (A1/A3)"
                  value={config.integracao.certificadoDigital}
                  onChange={e => handleChange('integracao', 'certificadoDigital', e.target.value)}
                  placeholder="Caminho ou dados do certificado"
                />
                <Input
                  label="Validade do Certificado"
                  type="date"
                  value={config.integracao.certificadoValidade}
                  onChange={e => handleChange('integracao', 'certificadoValidade', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Ambiente NFe"
                  value={config.integracao.ambienteNFe}
                  onChange={e => handleChange('integracao', 'ambienteNFe', e.target.value)}
                  options={[
                    { value: 'homologacao', label: 'Homologação' },
                    { value: 'producao', label: 'Produção' },
                  ]}
                />
                <Input
                  label="Série NFe"
                  value={config.integracao.serieNFe}
                  onChange={e => handleChange('integracao', 'serieNFe', e.target.value)}
                  placeholder="Ex: 1"
                />
                <Input
                  label="Próximo Número NFe"
                  type="number"
                  min={1}
                  value={config.integracao.proximoNumeroNFe}
                  onChange={e => handleChange('integracao', 'proximoNumeroNFe', parseInt(e.target.value) || 1)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 sm:static sm:border-none sm:p-0">
        <div className="max-w-7xl mx-auto sm:static">
          <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Salvar Todas as Configurações
          </Button>
        </div>
      </div>
    </div>
  )
}