'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { Search, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { CNPJData } from '@/lib/cnpj'

interface CnpjFieldProps {
  value: string
  onChange: (v: string) => void
  onFound: (data: CNPJData) => void
  error?: string
  disabled?: boolean
  autoFetch?: boolean
}

function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function CnpjField({ value, onChange, onFound, error, disabled, autoFetch = true }: CnpjFieldProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'ok' | 'warn' | 'err'; msg: string } | null>(null)
  const [last, setLast] = useState<CNPJData | null>(null)

  const doLookup = async (raw?: string) => {
    const cnpj = (raw ?? value).replace(/\D/g, '')
    if (cnpj.length !== 14) {
      setStatus({ type: 'err', msg: 'CNPJ deve ter 14 dígitos.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/cnpj/${cnpj}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'CNPJ não encontrado')
      const data = json as CNPJData
      setLast(data)
      onFound(data)
      if (data.situacaoCadastral && data.situacaoCadastral.toUpperCase() !== 'ATIVA') {
        setStatus({ type: 'warn', msg: `CNPJ localizado, mas situação: ${data.situacaoCadastral}.` })
      } else if (data.avisarNaoServico) {
        setStatus({
          type: 'warn',
          msg: `Localizado: ${data.razaoSocial || '—'} • CNAE ${data.cnaeFiscal || '?'} fora dos Anexos III/IV/V. Confira se é prestadora de serviços.`,
        })
      } else {
        setStatus({
          type: 'ok',
          msg: `Localizado: ${data.razaoSocial || '—'}${data.municipio ? ` • ${data.municipio}/${data.uf}` : ''}${data.anexoSugerido ? ` • Anexo ${data.anexoSugerido} sugerido` : ''}.`,
        })
      }
    } catch (e: any) {
      setStatus({ type: 'err', msg: e.message || 'Não foi possível consultar o CNPJ.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            label="CNPJ *"
            value={value}
            disabled={disabled || loading}
            onChange={e => {
              const masked = maskCNPJ(e.target.value)
              onChange(masked)
              setStatus(null)
              if (autoFetch && masked.replace(/\D/g, '').length === 14) {
                void doLookup(masked)
              }
            }}
            onBlur={() => {
              if (autoFetch && value.replace(/\D/g, '').length === 14 && !last) {
                void doLookup()
              }
            }}
            placeholder="00.000.000/0000-00"
            error={error}
            helperText={!error ? 'Digite o CNPJ e os dados da Receita são preenchidos automaticamente.' : undefined}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || loading || value.replace(/\D/g, '').length !== 14}
          onClick={() => doLookup()}
          className="shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Consultar
        </Button>
      </div>

      {status && (
        <div
          className={
            status.type === 'ok'
              ? 'flex items-start gap-2 text-sm bg-green-50 border border-green-200 text-green-800 rounded-lg p-2'
              : status.type === 'warn'
                ? 'flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2'
                : 'flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg p-2'
          }
          role="status"
        >
          {status.type === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{status.msg}</span>
        </div>
      )}

      {last && !status?.msg.startsWith('CNPJ') && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
          <span className="font-medium">{last.razaoSocial}</span>
          {last.nomeFantasia && last.nomeFantasia !== last.razaoSocial ? ` • Fantasia: ${last.nomeFantasia}` : ''}
          {last.municipio ? ` • ${last.municipio}/${last.uf}` : ''}
          {last.cnaeFiscal ? ` • CNAE ${last.cnaeFiscal} — ${last.cnaeFiscalDescricao}` : ''}
        </div>
      )}
    </div>
  )
}
