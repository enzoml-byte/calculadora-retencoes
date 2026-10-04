'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, Select, Button } from '@/components/ui'
import { FileSpreadsheet, Download, Filter, Loader2, Calculator } from 'lucide-react'
import { formatCurrency } from '@/lib/calculations'

type DREItem = {
  conta: string
  descricao: string
  tipo: 'receita' | 'despesa'
  valor: number
  percentual: number
}

type DREData = {
  receitaBruta: number
  deducoes: number
  receitaLiquida: number
  custos: number
  lucroBruto: number
  despesasOperacionais: number
  lucroOperacional: number
  resultadoFinanceiro: number
  lucroAntesImpostos: number
  ir_csll: number
  lucroLiquido: number
  itens: DREItem[]
}

export default function DREPage() {
  const { data: session } = useSession()
  const [dre, setDre] = useState<DREData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(new Date().toISOString().split('T')[0].substring(0, 7))
  const [regime, setRegime] = useState<'competencia' | 'caixa'>('competencia')

  useEffect(() => {
    fetchDRE()
  }, [periodo, regime])

  const fetchDRE = async () => {
    try {
      const res = await fetch(`/api/contabil/dre?periodo=${periodo}&regime=${regime}`)
      if (res.ok) {
        const data = await res.json()
        setDre(data)
      }
    } catch (error) {
      console.error('Erro ao buscar DRE:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!dre) {
    return (
      <div className="text-center py-12 text-muted">
        <Calculator className="h-12 w-12 text-muted mx-auto mb-4" />
        <p>Não foi possível carregar o DRE</p>
      </div>
    )
  }

  const receitaBruta = dre.receitaBruta
  const receitaLiquida = dre.receitaLiquida
  const lucroBruto = dre.lucroBruto
  const lucroOperacional = dre.lucroOperacional
  const lucroLiquido = dre.lucroLiquido
  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0
  const margemOperacional = receitaLiquida > 0 ? (lucroOperacional / receitaLiquida) * 100 : 0
  const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0

  const formatPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Calculator className="h-5 w-5" />
            </span>
            Demonstração do Resultado do Exercício (DRE)
          </h1>
          <p className="text-muted text-sm">Regime de {regime === 'competencia' ? 'Competência' : 'Caixa'} - Período: {new Date(periodo + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            options={Array.from({ length: 12 }, (_, i) => {
              const d = new Date()
              d.setMonth(d.getMonth() - i)
              const val = d.toISOString().substring(0, 7)
              return { value: val, label: new Date(val + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
            })}
            className="w-full sm:w-56"
          />
          <Select
            value={regime}
            onChange={e => setRegime(e.target.value as any)}
            options={[
              { value: 'competencia', label: 'Competência' },
              { value: 'caixa', label: 'Caixa' },
            ]}
            className="w-full sm:w-40"
          />
          <Button variant="outline" onClick={() => window.print()}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2" /></svg>
            Imprimir
          </Button>
          <Button variant="secondary">
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Receita Bruta</p>
            <p className="text-2xl font-bold text-ink">{formatCurrency(dre.receitaBruta)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Receita Líquida</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(dre.receitaLiquida)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Lucro Bruto</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(dre.lucroBruto)} <span className="text-lg font-normal text-muted">({formatPct(margemBruta)})</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Lucro Operacional</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(dre.lucroOperacional)} <span className="text-lg font-normal text-muted">({formatPct(margemOperacional)})</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted">Lucro Líquido</p>
            <p className="text-2xl font-bold text-ink">{formatCurrency(dre.lucroLiquido)} <span className="text-lg font-normal text-muted">({formatPct(margemLiquida)})</span></p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Calculator className="h-5 w-5" />
            </span>
            DRE Detalhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs">Conta</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-xs">Descrição</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider text-xs">Valor</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 uppercase tracking-wider text-xs">% Receita Líquida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Receita Bruta */}
                <tr className="bg-blue-50">
                  <td className="px-4 py-2 font-mono font-medium text-blue-600">3.1</td>
                  <td className="px-4 py-2 font-semibold text-blue-800">Receita Bruta de Vendas/Serviços</td>
                  <td className="px-4 py-2 text-right font-bold text-ink">{formatCurrency(dre.receitaBruta)}</td>
                  <td className="px-4 py-2 text-right text-blue-600">{formatPct((dre.receitaBruta / dre.receitaLiquida) * 100)}</td>
                </tr>
                {/* Deduções */}
                {dre.itens.filter(i => i.tipo === 'receita' && i.conta.startsWith('3.1')).map(item => (
                  <tr key={item.conta} className="bg-blue-50/50">
                    <td className="px-4 py-2 font-mono text-sm text-blue-600">{item.conta}</td>
                    <td className="px-4 py-2 text-sm text-blue-700">{item.descricao}</td>
                    <td className="px-4 py-2 text-right text-red-600">-{formatCurrency(item.valor)}</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatPct(-item.percentual)}</td>
                  </tr>
                ))}
                {/* Receita Líquida */}
                <tr className="bg-blue-100 font-bold">
                  <td className="px-4 py-3 font-mono text-blue-800">3.1.9</td>
                  <td className="px-4 py-3 font-semibold text-blue-900">(=) Receita Líquida de Vendas/Serviços</td>
                  <td className="px-4 py-3 text-right font-bold text-ink">{formatCurrency(dre.receitaLiquida)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">100,00%</td>
                </tr>
                {/* Custos */}
                <tr className="bg-red-50">
                  <td className="px-4 py-2 font-mono text-red-600">4.1</td>
                  <td className="px-4 py-2 font-semibold text-red-800">Custos dos Serviços/Produtos Vendidos (CPV/CSV)</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">-{formatCurrency(dre.custos)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatPct(-(dre.custos / dre.receitaLiquida) * 100)}</td>
                </tr>
                {/* Lucro Bruto */}
                <tr className="bg-green-100 font-bold">
                  <td className="px-4 py-3 font-mono text-green-800">4.2</td>
                  <td className="px-4 py-3 font-semibold text-green-900">(=) Lucro Bruto</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(dre.lucroBruto)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatPct(margemBruta)}</td>
                </tr>
                {/* Despesas Operacionais */}
                {dre.itens.filter(i => i.tipo === 'despesa' && i.conta.startsWith('5')).map(item => (
                  <tr key={item.conta} className="bg-red-50/50">
                    <td className="px-4 py-2 font-mono text-sm text-red-600">{item.conta}</td>
                    <td className="px-4 py-2 text-sm text-red-700">{item.descricao}</td>
                    <td className="px-4 py-2 text-right text-red-600">-{formatCurrency(item.valor)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatPct(-item.percentual)}</td>
                  </tr>
                ))}
                {/* Total Despesas Operacionais */}
                <tr className="bg-red-100 font-bold">
                  <td className="px-4 py-3 font-mono text-red-800">5.9</td>
                  <td className="px-4 py-3 font-semibold text-red-900">Total Despesas Operacionais</td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">-{formatCurrency(dre.despesasOperacionais)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatPct(-(dre.despesasOperacionais / dre.receitaLiquida) * 100)}</td>
                </tr>
                {/* Lucro Operacional */}
                <tr className="bg-blue-100 font-bold">
                  <td className="px-4 py-3 font-mono text-blue-800">6.1</td>
                  <td className="px-4 py-3 font-semibold text-blue-900">(=) Lucro Operacional (antes do Resultado Financeiro)</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(dre.lucroOperacional)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{formatPct(margemOperacional)}</td>
                </tr>
                {/* Resultado Financeiro */}
                {dre.resultadoFinanceiro !== 0 && (
                  <tr className={dre.resultadoFinanceiro > 0 ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="px-4 py-2 font-mono text-green-600">7.1</td>
                    <td className="px-4 py-2 font-semibold text-green-800">Resultado Financeiro Líquido</td>
                    <td className="px-4 py-2 text-right font-bold">{dre.resultadoFinanceiro > 0 ? '+' : ''}{formatCurrency(dre.resultadoFinanceiro)}</td>
                    <td className="px-4 py-2 text-right">{formatPct((dre.resultadoFinanceiro / dre.receitaLiquida) * 100)}</td>
                  </tr>
                )}
                {/* Lucro Antes dos Impostos */}
                <tr className="bg-purple-100 font-bold">
                  <td className="px-4 py-3 font-mono text-purple-800">8.1</td>
                  <td className="px-4 py-3 font-semibold text-purple-900">(=) Lucro Antes do IR/CSLL</td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">{formatCurrency(dre.lucroAntesImpostos)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{formatPct((dre.lucroAntesImpostos / dre.receitaLiquida) * 100)}</td>
                </tr>
                {/* IR/CSLL */}
                <tr className="bg-red-50">
                  <td className="px-4 py-2 font-mono text-red-600">9.1</td>
                  <td className="px-4 py-2 font-semibold text-red-800">IRPJ e CSLL (Impostos)</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">-{formatCurrency(dre.ir_csll)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatPct(-(dre.ir_csll / dre.receitaLiquida) * 100)}</td>
                </tr>
                {/* Lucro Líquido */}
                <tr className="bg-gray-900 text-white font-bold">
                  <td className="px-4 py-3 font-mono text-amber-400">10.1</td>
                  <td className="px-4 py-3 font-semibold">(=) LUCRO LÍQUIDO DO EXERCÍCIO</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-300">{formatCurrency(dre.lucroLiquido)}</td>
                  <td className="px-4 py-3 text-right text-amber-400">{formatPct(margemLiquida)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatPct(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}