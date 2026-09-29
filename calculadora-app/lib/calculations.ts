export const ALIQ = {
  PIS: 0.0065,
  COFINS: 0.03,
  CSLL: 0.01,
  IR_GERAL: 0.015,
  IR_HOSP: 0.012,
  ISS: 0.05,
} as const

export const SIMPLES_TABLES = {
  III: [
    { lim: 180000, aliq: 0.06, pd: 0 },
    { lim: 360000, aliq: 0.112, pd: 9360 },
    { lim: 720000, aliq: 0.135, pd: 17640 },
    { lim: 1800000, aliq: 0.16, pd: 35640 },
    { lim: 3600000, aliq: 0.21, pd: 125640 },
    { lim: 4800000, aliq: 0.33, pd: 648000 },
  ],
  IV: [
    { lim: 180000, aliq: 0.045, pd: 0 },
    { lim: 360000, aliq: 0.09, pd: 8100 },
    { lim: 720000, aliq: 0.102, pd: 12420 },
    { lim: 1800000, aliq: 0.14, pd: 39780 },
    { lim: 3600000, aliq: 0.22, pd: 183780 },
    { lim: 4800000, aliq: 0.33, pd: 828000 },
  ],
  V: [
    { lim: 180000, aliq: 0.155, pd: 0 },
    { lim: 360000, aliq: 0.18, pd: 4500 },
    { lim: 720000, aliq: 0.195, pd: 9900 },
    { lim: 1800000, aliq: 0.205, pd: 17100 },
    { lim: 3600000, aliq: 0.23, pd: 62100 },
    { lim: 4800000, aliq: 0.305, pd: 540000 },
  ],
} as const

export type Anexo = 'III' | 'IV' | 'V'
export type Regime = 'SIMPLES' | 'PRESUMIDO_GERAL' | 'PRESUMIDO_HOSPITALAR'
export type IssRetido = 'SEMPRE' | 'NUNCA' | 'PERGUNTAR'

export interface SimplesFaixa {
  lim: number
  aliq: number
  pd: number
  faixa: number
}

export interface SimplesResult {
  faixa: number
  aliquotaNominal: number
  parcelaDeduzir: number
  aliquotaEfetiva: number
  das: number
}

export function getSimplesFaixa(anexo: Anexo, rbt12: number): SimplesFaixa {
  const table = SIMPLES_TABLES[anexo]
  for (let i = 0; i < table.length; i++) {
    if (rbt12 <= table[i].lim) {
      return { ...table[i], faixa: i + 1 }
    }
  }
  const last = table[table.length - 1]
  return { ...last, faixa: table.length }
}

export function calculateSimples(anexo: Anexo, rbt12: number, receitaMes: number): SimplesResult | null {
  if (rbt12 <= 0 || receitaMes <= 0) return null
  const f = getSimplesFaixa(anexo, rbt12)
  const efetiva = (rbt12 * f.aliq - f.pd) / rbt12
  return {
    faixa: f.faixa,
    aliquotaNominal: f.aliq,
    parcelaDeduzir: f.pd,
    aliquotaEfetiva: Math.max(efetiva, 0),
    das: Math.max(efetiva, 0) * receitaMes,
  }
}

export interface RetencaoResult {
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

export function calculateRetencao(params: {
  regime: Regime
  isHospitalar: boolean
  valorBruto: number
  issRetido: boolean
  informaIbsCbs: boolean
  ibsPerc: number
  cbsPerc: number
  anexo?: Anexo
  rbt12?: number
}): RetencaoResult {
  const { regime, isHospitalar, valorBruto, issRetido, informaIbsCbs, ibsPerc, cbsPerc, anexo, rbt12 } = params

  let ir = 0
  let pis = 0
  let cofins = 0
  let csll = 0
  let aliquotaEfetivaSimples: number | undefined
  let dasSimples: number | undefined
  let simplesFaixa: number | undefined

  if (regime === 'PRESUMIDO_GERAL') {
    ir = valorBruto * ALIQ.IR_GERAL
    pis = valorBruto * ALIQ.PIS
    cofins = valorBruto * ALIQ.COFINS
    csll = valorBruto * ALIQ.CSLL
  } else if (regime === 'PRESUMIDO_HOSPITALAR') {
    ir = valorBruto * ALIQ.IR_HOSP
    pis = valorBruto * ALIQ.PIS
    cofins = valorBruto * ALIQ.COFINS
    csll = valorBruto * ALIQ.CSLL
  } else if (regime === 'SIMPLES' && anexo && rbt12) {
    const simples = calculateSimples(anexo, rbt12, valorBruto)
    if (simples) {
      aliquotaEfetivaSimples = simples.aliquotaEfetiva
      dasSimples = simples.das
      simplesFaixa = simples.faixa
    }
  }

  const totalFederal = ir + pis + cofins + csll
  const iss = issRetido ? valorBruto * ALIQ.ISS : 0
  const totalGeral = totalFederal + iss
  const liquido = valorBruto - totalGeral

  const ibs = informaIbsCbs ? valorBruto * (ibsPerc / 100) : 0
  const cbs = informaIbsCbs ? valorBruto * (cbsPerc / 100) : 0

  return {
    ir,
    pis,
    cofins,
    csll,
    totalFederal,
    iss,
    totalGeral,
    liquido,
    ibs,
    cbs,
    aliquotaEfetivaSimples,
    dasSimples,
    simplesFaixa,
  }
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatPercent(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + ' %'
}

export function formatPercent8(value: number): string {
  return formatPercent(value, 8)
}

export function parseBR(value: string | number): number {
  if (typeof value === 'number') return value
  const cleaned = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14 || /^(\d)\1+$/.test(clean)) return false

  let t = clean.length - 2
  let d = clean.substring(0, t)
  let dg = clean.substring(t)
  let s = 0
  let p = t - 7

  for (let i = t; i >= 1; i--) {
    s += +d[t - i] * p--
    if (p < 2) p = 9
  }
  let r = s % 11 < 2 ? 0 : 11 - (s % 11)
  if (r !== +dg[0]) return false

  t++
  d = clean.substring(0, t)
  s = 0
  p = t - 7
  for (let i = t; i >= 1; i--) {
    s += +d[t - i] * p--
    if (p < 2) p = 9
  }
  r = s % 11 < 2 ? 0 : 11 - (s % 11)
  return r === +dg[1]
}

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}