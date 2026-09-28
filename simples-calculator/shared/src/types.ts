export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  dataCadastro: Date;
  ativo: boolean;
}

export interface Apuracao {
  id: string;
  empresaId: string;
  periodoApuracao: Date;
  receitaBrutaMes: number;
  rbt12InformadoPgdas: number | null;
  rbt12CalculadoSistema: number | null;
  anexo: 'III' | 'IV' | 'V';
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliquotaEfetiva: number;
  valorDas: number;
  arquivoOriginal: string | null;
  dataImportacao: Date;
  observacoes: string | null;
  versaoRegra: string;
  substituidaPorId: string | null;
}

export interface TaxRule {
  id: string;
  anexo: 'III' | 'IV' | 'V';
  faixa: number;
  limiteInferior: number;
  limiteSuperior: number | null;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  versao: string;
}

export interface FaixaTributaria {
  faixa: number;
  limiteInferior: number;
  limiteSuperior: number | null;
  aliquotaNominal: number;
  parcelaDeduzir: number;
}

export interface CalculoAliquotaResult {
  faixa: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliquotaEfetiva: number;
  valorDas: number;
  rbt12: number;
  anexo: 'III' | 'IV' | 'V';
  memoriaCalculo: string;
}

export interface PDFExtractedData {
  periodoApuracao: Date | null;
  receitaBrutaMes: number | null;
  rbt12Informado: number | null;
  anexo: 'III' | 'IV' | 'V' | null;
  cnpj: string | null;
  razaoSocial: string | null;
  rawText: string;
}

export interface ImportPreviewData {
  empresa: Empresa;
  periodo: Date;
  receitaBrutaMes: number;
  rbt12InformadoPgdas: number | null;
  rbt12CalculadoSistema: number | null;
  rbt12Usado: number | null;
  divergencia: boolean;
  diferencaRbt12: number | null;
  anexo: 'III' | 'IV' | 'V' | null;
  aliquotaNominal: number | null;
  parcelaDeduzir: number | null;
  aliquotaEfetiva: number | null;
  valorDas: number | null;
  faixa: number | null;
  memoriaCalculo: string | null;
  warnings: string[];
}

export interface ProjecaoProximoMes {
  proximoPeriodo: Date;
  rbt12Estimado: number;
  anexo: 'III' | 'IV' | 'V';
  faixa: number;
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliquotaEfetivaEstimada: number;
  baseCalculo: Array<{ periodo: Date; receita: number }>;
  observacoes: string[];
}

export interface HistoricoApuracao {
  periodo: Date;
  receita: number;
  rbt12Pgdas: number | null;
  rbt12Sistema: number | null;
  anexo: 'III' | 'IV' | 'V';
  aliquotaEfetiva: number;
  valorDas: number;
  divergencia: boolean;
}

export interface EmpresaDashboard {
  empresa: Empresa;
  ultimaApuracao: Apuracao | null;
  receitaAcumulada12m: number;
  rbt12Atual: number | null;
  anexoAtual: 'III' | 'IV' | 'V' | null;
  aliquotaEfetivaAtual: number | null;
  divergenciaRbt12: boolean;
  historico: HistoricoApuracao[];
}

export type AnexoType = 'III' | 'IV' | 'V';

export const ANEXOS: AnexoType[] = ['III', 'IV', 'V'];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value / 100);
}

export function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function parseCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function formatCNPJ(cnpj: string): string {
  const clean = parseCNPJ(cnpj);
  if (clean.length !== 14) return cnpj;
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function validateCNPJ(cnpj: string): boolean {
  const clean = parseCNPJ(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1+$/.test(clean)) return false;

  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  if (digit1 !== parseInt(clean[12])) return false;

  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(clean[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  if (digit2 !== parseInt(clean[13])) return false;

  return true;
}