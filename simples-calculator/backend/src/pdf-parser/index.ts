import pdfParse from 'pdf-parse';
import { PDFExtractedData } from '@simples/shared';

const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
const DATE_REGEX = /(\d{2})\/(\d{4})/g;
const CURRENCY_REGEX = /R\$\s*([\d\.]+,\d{2})/g;
const SIMPLE_CURRENCY_REGEX = /([\d\.]+,\d{2})/g;

const ANEXO_KEYWORDS = {
  III: ['anexo iii', 'anexo 3', 'anexo iii -'],
  IV: ['anexo iv', 'anexo 4', 'anexo iv -'],
  V: ['anexo v', 'anexo 5', 'anexo v -'],
};

const PERIODO_KEYWORDS = [
  'período de apuração',
  'periodo de apuracao',
  'competência',
  'competencia',
  'mês de referência',
  'mes de referencia',
];

const RECEITA_KEYWORDS = [
  'receita bruta',
  'receita bruta do mês',
  'receita bruta do mes',
  'faturamento',
  'valor da receita',
  'total da receita',
];

const RBT12_KEYWORDS = [
  'rbt12',
  'rbt 12',
  'receita bruta total 12',
  'receita bruta dos 12',
  'base de cálculo rbt12',
  'base de calculo rbt12',
];

export class PDFParser {
  async parse(buffer: Buffer): Promise<PDFExtractedData> {
    const data = await pdfParse(buffer);
    const text = data.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const result: PDFExtractedData = {
      periodoApuracao: null,
      receitaBrutaMes: null,
      rbt12Informado: null,
      anexo: null,
      cnpj: null,
      razaoSocial: null,
      rawText: text,
    };

    // Extrair CNPJ
    result.cnpj = this.extractCNPJ(text);

    // Extrair Razão Social
    result.razaoSocial = this.extractRazaoSocial(lines);

    // Extrair Período de Apuração
    result.periodoApuracao = this.extractPeriodo(text, lines);

    // Extrair Anexo
    result.anexo = this.extractAnexo(text);

    // Extrair Receita Bruta do Mês
    result.receitaBrutaMes = this.extractReceitaBruta(text, lines);

    // Extrair RBT12
    result.rbt12Informado = this.extractRBT12(text, lines);

    return result;
  }

  private extractCNPJ(text: string): string | null {
    const matches = text.match(CNPJ_REGEX);
    if (matches && matches.length > 0) {
      return matches[0].replace(/\D/g, '');
    }
    return null;
  }

  private extractRazaoSocial(lines: string[]): string | null {
    // Procurar por linhas que parecem razão social (geralmente após CNPJ ou no cabeçalho)
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('razão social') || line.includes('razao social') || line.includes('nome empresarial')) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.match(/^\d/)) {
          return nextLine.trim();
        }
        // Tentar extrair da mesma linha
        const parts = lines[i].split(':');
        if (parts.length > 1) return parts[1].trim();
      }
    }
    return null;
  }

  private extractPeriodo(text: string, lines: string[]): Date | null {
    // Tentar encontrar no texto completo primeiro
    for (const keyword of PERIODO_KEYWORDS) {
      const idx = text.toLowerCase().indexOf(keyword);
      if (idx !== -1) {
        const snippet = text.substring(idx, idx + 100);
        const dateMatch = snippet.match(DATE_REGEX);
        if (dateMatch) {
          return this.parsePeriodo(dateMatch[0]);
        }
      }
    }

    // Tentar nas linhas
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const keyword of PERIODO_KEYWORDS) {
        if (lower.includes(keyword)) {
          const dateMatch = line.match(DATE_REGEX);
          if (dateMatch) {
            return this.parsePeriodo(dateMatch[0]);
          }
        }
      }
    }

    return null;
  }

  private parsePeriodo(periodoStr: string): Date | null {
    const match = periodoStr.match(/(\d{2})\/(\d{4})/);
    if (match) {
      const mes = parseInt(match[1], 10) - 1; // 0-indexed
      const ano = parseInt(match[2], 10);
      if (mes >= 0 && mes <= 11 && ano >= 2000 && ano <= 2100) {
        return new Date(ano, mes, 1);
      }
    }
    return null;
  }

  private extractAnexo(text: string): 'III' | 'IV' | 'V' | null {
    const lower = text.toLowerCase();
    
    for (const [anexo, keywords] of Object.entries(ANEXO_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          return anexo as 'III' | 'IV' | 'V';
        }
      }
    }
    return null;
  }

  private extractReceitaBruta(text: string, lines: string[]): number | null {
    // Procurar por palavras-chave de receita
    for (const keyword of RECEITA_KEYWORDS) {
      const idx = text.toLowerCase().indexOf(keyword);
      if (idx !== -1) {
        const snippet = text.substring(idx, idx + 200);
        const values = this.extractCurrencyValues(snippet);
        if (values.length > 0) {
          // Geralmente o primeiro valor após a palavra-chave é a receita do mês
          return values[0];
        }
      }
    }

    // Fallback: procurar em linhas específicas
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const keyword of RECEITA_KEYWORDS) {
        if (lower.includes(keyword)) {
          const values = this.extractCurrencyValues(line);
          if (values.length > 0) {
            return values[0];
          }
        }
      }
    }

    return null;
  }

  private extractRBT12(text: string, lines: string[]): number | null {
    for (const keyword of RBT12_KEYWORDS) {
      const idx = text.toLowerCase().indexOf(keyword);
      if (idx !== -1) {
        const snippet = text.substring(idx, idx + 200);
        const values = this.extractCurrencyValues(snippet);
        if (values.length > 0) {
          // O RBT12 geralmente é um valor maior
          return Math.max(...values);
        }
      }
    }

    // Fallback em linhas
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const keyword of RBT12_KEYWORDS) {
        if (lower.includes(keyword)) {
          const values = this.extractCurrencyValues(line);
          if (values.length > 0) {
            return Math.max(...values);
          }
        }
      }
    }

    return null;
  }

  private extractCurrencyValues(text: string): number[] {
    const values: number[] = [];
    
    // Tentar formato R$ X.XXX,XX
    const matches1 = text.match(/R\$\s*([\d\.]+,\d{2})/g);
    if (matches1) {
      for (const m of matches1) {
        const num = parseFloat(m.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
        if (!isNaN(num)) values.push(num);
      }
    }

    // Tentar formato simples X.XXX,XX
    const matches2 = text.match(/([\d]{1,3}(?:\.[\d]{3})*,\d{2})/g);
    if (matches2) {
      for (const m of matches2) {
        const num = parseFloat(m.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(num) && num > 0) values.push(num);
      }
    }

    return [...new Set(values)].sort((a, b) => b - a); // Únicos e ordenados desc
  }

  validateExtractedData(data: PDFExtractedData): string[] {
    const warnings: string[] = [];
    
    if (!data.periodoApuracao) {
      warnings.push('Não foi possível identificar automaticamente o período de apuração. Confira e informe manualmente.');
    }
    if (!data.receitaBrutaMes) {
      warnings.push('Não foi possível identificar automaticamente a receita bruta do mês. Confira e informe manualmente.');
    }
    if (!data.rbt12Informado) {
      warnings.push('Não foi possível identificar automaticamente o RBT12. Confira e informe manualmente.');
    }
    if (!data.anexo) {
      warnings.push('Não foi possível identificar automaticamente o Anexo (III, IV ou V). Confira e informe manualmente.');
    }
    if (!data.cnpj) {
      warnings.push('Não foi possível identificar automaticamente o CNPJ. Confira e informe manualmente.');
    }

    return warnings;
  }
}