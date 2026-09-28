import { PDFExtractedData, AnexoType } from '@simples/shared';

/**
 * JsonParser — aceita JSON transcrito (ex: via Gemini a partir do PDF do PGDAS-D)
 * e normaliza para o mesmo formato do PDFParser, permitindo reutilizar
 * todo o fluxo de preview/confirmação/cálculo.
 *
 * Schema aceito (todas as chaves tolerantes):
 * {
 *   "cnpj": "12.345.678/0001-95" | "12345678000195",
 *   "razaoSocial": "...",
 *   "periodoApuracao": "06/2024" | "2024-06" | "2024-06-01" | "2024-06-01T00:00:00.000Z",
 *   "receitaBrutaMes": 25000.00 | "25.000,00" | "25000,00",
 *   "rbt12Informado": 280000.00 | "280.000,00",
 *   "rbt12": 280000.00,            // alias
 *   "anexo": "III" | "3" | "Anexo III" | "anexo 3"
 * }
 */

type RawJson = Record<string, unknown>;

const ANEXO_MAP: Record<string, AnexoType> = {
  'iii': 'III',
  '3': 'III',
  'anexo iii': 'III',
  'anexo 3': 'III',
  'iv': 'IV',
  '4': 'IV',
  'anexo iv': 'IV',
  'anexo 4': 'IV',
  'v': 'V',
  '5': 'V',
  'anexo v': 'V',
  'anexo 5': 'V',
};

function pick<T = unknown>(obj: RawJson, ...keys: string[]): T | undefined {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

export function parseNumeroBR(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return null;
    // Remove R$, espaços
    s = s.replace(/R\$\s*/gi, '').trim();
    // Formato BR: 1.234.567,89 -> 1234567.89
    // Formato US/ISO: 1234567.89 -> mantém
    if (s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/\s/g, '');
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parsePeriodo(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), 1);
  }
  if (typeof value === 'number') {
    // Epoch ms? improvável, mas tolera
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    // MM/YYYY
    let m = s.match(/^(\d{2})\/(\d{4})$/);
    if (m) {
      const mes = parseInt(m[1], 10) - 1;
      const ano = parseInt(m[2], 10);
      if (mes >= 0 && mes <= 11 && ano >= 2000 && ano <= 2100) return new Date(ano, mes, 1);
      return null;
    }
    // YYYY-MM ou YYYY-MM-DD ou ISO
    m = s.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
    if (m) {
      const ano = parseInt(m[1], 10);
      const mes = parseInt(m[2], 10) - 1;
      if (mes >= 0 && mes <= 11 && ano >= 2000 && ano <= 2100) return new Date(ano, mes, 1);
      return null;
    }
    // DD/MM/YYYY -> usa mês/ano
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const mes = parseInt(m[2], 10) - 1;
      const ano = parseInt(m[3], 10);
      if (mes >= 0 && mes <= 11) return new Date(ano, mes, 1);
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return null;
}

export function parseAnexo(value: unknown): AnexoType | null {
  if (value === null || value === undefined || value === '') return null;
  const key = String(value).trim().toLowerCase();
  return ANEXO_MAP[key] ?? null;
}

export function parseCnpj(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 14) return digits;
  return null;
}

export class JsonParser {
  parse(input: unknown): PDFExtractedData {
    let obj: RawJson;
    if (typeof input === 'string') {
      obj = JSON.parse(input) as RawJson;
    } else if (typeof input === 'object' && input !== null) {
      obj = input as RawJson;
    } else {
      throw new Error('JSON inválido: esperado objeto ou string JSON');
    }

    const periodoApuracao = parsePeriodo(
      pick(obj, 'periodoApuracao', 'periodo', 'competencia', 'competência', 'mesReferencia', 'mes_referencia', 'data')
    );
    const receitaBrutaMes = parseNumeroBR(
      pick(obj, 'receitaBrutaMes', 'receita', 'receitaMes', 'faturamento', 'receita_bruta_mes')
    );
    const rbt12Informado =
      parseNumeroBR(pick(obj, 'rbt12Informado', 'rbt12', 'rbt_12', 'receitaBruta12', 'receitaBrutaTotal12')) ?? null;
    const anexo = parseAnexo(pick(obj, 'anexo'));
    const cnpj = parseCnpj(pick(obj, 'cnpj'));
    const razaoSocialRaw = pick<string | number>(obj, 'razaoSocial', 'razao_social', 'nomeEmpresarial', 'empresa');
    const razaoSocial = razaoSocialRaw ? String(razaoSocialRaw).trim() || null : null;

    return {
      periodoApuracao,
      receitaBrutaMes,
      rbt12Informado,
      anexo,
      cnpj,
      razaoSocial,
      rawText: JSON.stringify(obj),
    };
  }

  validateExtractedData(data: PDFExtractedData): string[] {
    const warnings: string[] = [];
    if (!data.periodoApuracao) warnings.push('JSON sem período de apuração válido. Informe manualmente (MM/AAAA).');
    if (!data.receitaBrutaMes) warnings.push('JSON sem receita bruta do mês válida. Informe manualmente.');
    if (!data.rbt12Informado) warnings.push('JSON sem RBT12. Será usado o RBT12 calculado pelo sistema ou informe manualmente.');
    if (!data.anexo) warnings.push('JSON sem Anexo (III, IV ou V). Selecione manualmente.');
    if (!data.cnpj) warnings.push('JSON sem CNPJ válido. Confira a empresa selecionada.');
    return warnings;
  }
}
