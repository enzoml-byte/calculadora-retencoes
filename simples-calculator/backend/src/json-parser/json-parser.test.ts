import { describe, it, expect } from 'vitest';
import { JsonParser, parseNumeroBR, parsePeriodo, parseAnexo } from './index';

const parser = new JsonParser();

describe('JsonParser', () => {
  it('converte schema simples completo', () => {
    const out = parser.parse({
      cnpj: '12.345.678/0001-95',
      razaoSocial: 'Exemplo Ltda',
      periodoApuracao: '06/2024',
      receitaBrutaMes: 25000,
      rbt12Informado: 280000,
      anexo: 'III',
    });
    expect(out.cnpj).toBe('12345678000195');
    expect(out.periodoApuracao?.getMonth()).toBe(5);
    expect(out.receitaBrutaMes).toBe(25000);
    expect(out.rbt12Informado).toBe(280000);
    expect(out.anexo).toBe('III');
  });

  it('aceita alias e formatos BR', () => {
    const out = parser.parse({
      periodo: '2024-06',
      receita: '25.000,00',
      rbt12: '280.000,00',
      anexo: 'anexo 3',
    });
    expect(out.receitaBrutaMes).toBe(25000);
    expect(out.rbt12Informado).toBe(280000);
    expect(out.anexo).toBe('III');
  });

  it('aceita anexo 4/5 e ISO date', () => {
    expect(parser.parse({ anexo: '4' }).anexo).toBe('IV');
    expect(parser.parse({ anexo: 'V' }).anexo).toBe('V');
    expect(parser.parse({ anexo: '5' }).anexo).toBe('V');
    const out = parser.parse({ periodoApuracao: '2024-06-01T00:00:00.000Z' });
    expect(out.periodoApuracao?.getMonth()).toBe(5);
  });

  it('string JSON também funciona', () => {
    const out = parser.parse('{"receitaBrutaMes":1000,"anexo":"IV","periodoApuracao":"01/2024"}');
    expect(out.receitaBrutaMes).toBe(1000);
    expect(out.anexo).toBe('IV');
  });

  it('gera warnings para campos ausentes', () => {
    const w = parser.validateExtractedData(parser.parse({}));
    expect(w.length).toBeGreaterThan(0);
  });

  it('parseNumeroBR tolera R$ e formatos', () => {
    expect(parseNumeroBR('R$ 1.234,56')).toBeCloseTo(1234.56);
    expect(parseNumeroBR('25000,00')).toBe(25000);
    expect(parseNumeroBR(10.5)).toBe(10.5);
    expect(parseNumeroBR('')).toBeNull();
  });

  it('parsePeriodo tolera variantes', () => {
    expect(parsePeriodo('06/2024')?.getMonth()).toBe(5);
    expect(parsePeriodo('2024-06')?.getMonth()).toBe(5);
    expect(parsePeriodo('2024-06-15')?.getMonth()).toBe(5);
    expect(parsePeriodo('invalido')).toBeNull();
  });

  it('parseAnexo tolera variantes', () => {
    expect(parseAnexo('III')).toBe('III');
    expect(parseAnexo('3')).toBe('III');
    expect(parseAnexo('Anexo V')).toBe('V');
    expect(parseAnexo('xx')).toBeNull();
  });
});
