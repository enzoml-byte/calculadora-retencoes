export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value / 100);
}

export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeBR(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
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

export function getAnexoLabel(anexo: string): string {
  return `Anexo ${anexo}`;
}

export function getAnexoColor(anexo: string): 'primary' | 'success' | 'warning' | 'danger' {
  switch (anexo) {
    case 'III': return 'primary';
    case 'IV': return 'success';
    case 'V': return 'warning';
    default: return 'primary';
  }
}

export function calculateDiffPercent(val1: number, val2: number): number {
  if (val1 === 0 && val2 === 0) return 0;
  if (val1 === 0) return 100;
  return Math.abs((val1 - val2) / val1) * 100;
}

export function isDivergent(val1: number | null, val2: number | null, threshold = 0.01): boolean {
  if (val1 === null || val2 === null) return false;
  return Math.abs(val1 - val2) > threshold;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}