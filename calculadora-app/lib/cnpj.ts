import { getCachedCNPJ, setCachedCNPJ } from './kv'

export interface CNPJData {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  cnaeFiscal: string
  cnaeFiscalDescricao: string
  situacaoCadastral: string
  dataAbertura: string
  naturezaJuridica: string
  capitalSocial: string
  anexoSugerido?: 'III' | 'IV' | 'V'
  avisarNaoServico: boolean
}

const ANEXO_III_CNAES = [
  '6201', '6202', '6203', '6204', '6209',
  '6910', '6920', '7020', '7110', '7120',
  '7210', '7310', '7410', '7420', '7490',
  '8010', '8020', '8030', '8510', '8520',
  '8530', '8540', '8550', '8590', '8610',
  '8620', '8630', '8640', '8650', '8660',
  '8690', '8710', '8720', '8730', '8790',
  '8810', '8890', '9000', '9100', '9200',
  '9310', '9320', '9410', '9420', '9490',
  '9510', '9520', '9600',
]

const ANEXO_IV_CNAES = [
  '4321', '4322', '4329', '4330', '4390',
  '6910', '8121', '8129', '8130',
]

const ANEXO_V_CNAES = [
  '6910', '7110', '7120', '7210', '7310',
  '7410', '7420', '7490', '8610', '8620',
  '8630', '8640', '8650', '8660', '8690',
  '8710', '8720', '8730', '8790', '8810', '8890',
]

function identifyAnexoByCNAE(cnae: string): 'III' | 'IV' | 'V' | null {
  const prefix = cnae.substring(0, 4)
  
  if (ANEXO_IV_CNAES.includes(prefix)) return 'IV'
  if (ANEXO_V_CNAES.includes(prefix)) return 'V'
  if (ANEXO_III_CNAES.includes(prefix)) return 'III'
  
  return null
}

async function fetchBrasilAPI(cnpj: string): Promise<any> {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 86400 }, // 24h cache
  })
  
  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado')
    throw new Error(`Erro ao consultar CNPJ: ${response.status}`)
  }
  
  return response.json()
}

async function fetchCNPJio(cnpj: string): Promise<any> {
  const token = process.env.CNPJ_IO_TOKEN
  if (!token) throw new Error('CNPJ.io token não configurado')
  
  const response = await fetch(`https://api.cnpj.io/v1/${cnpj}`, {
    headers: { 'Authorization': token, 'Accept': 'application/json' },
    next: { revalidate: 86400 },
  })
  
  if (!response.ok) throw new Error(`CNPJ.io erro: ${response.status}`)
  return response.json()
}

export async function lookupCNPJ(cnpj: string): Promise<CNPJData> {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) throw new Error('CNPJ deve ter 14 dígitos')

  // Try cache first
  const cached = await getCachedCNPJ(clean)
  if (cached) return cached

  // Try BrasilAPI first (free, no key needed)
  let data: any
  try {
    data = await fetchBrasilAPI(clean)
  } catch (e) {
    // Fallback to CNPJ.io if configured
    try {
      data = await fetchCNPJio(clean)
    } catch (e2) {
      throw new Error('Não foi possível consultar o CNPJ. Verifique o número e tente novamente.')
    }
  }

  const cnae = data.cnae_fiscal || ''
  const anexoSugerido = identifyAnexoByCNAE(cnae)
  const avisarNaoServico = !anexoSugerido

  const result: CNPJData = {
    cnpj: clean,
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || '',
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep?.replace(/\D/g, '') || '',
    cnaeFiscal: cnae,
    cnaeFiscalDescricao: data.cnae_fiscal_descricao || '',
    situacaoCadastral: data.situacao_cadastral || '',
    dataAbertura: data.data_inicio_atividade || '',
    naturezaJuridica: data.natureza_juridica || '',
    capitalSocial: data.capital_social || '',
    anexoSugerido,
    avisarNaoServico,
  }

  // Cache for 24 hours
  await setCachedCNPJ(clean, result)

  return result
}

export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return cnpj
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}