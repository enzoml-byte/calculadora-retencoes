import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { RBT12Calculator, SimplesCalculator, TaxRuleRepository } from '../calculation';

const prisma = new PrismaClient();
const taxRuleRepo = new TaxRuleRepository(prisma);
const rbt12Calculator = new RBT12Calculator(prisma);
const simplesCalculator = new SimplesCalculator(taxRuleRepo);

const TEST_EMPRESA_ID = 'test-empresa-' + Date.now();
const TEST_CNPJ = '11222333000181';

describe('SimplesCalculator - Cálculo de Alíquota Efetiva', () => {
  beforeAll(async () => {
    // Limpar dados de teste anteriores
    await prisma.apuracao.deleteMany({ where: { empresaId: TEST_EMPRESA_ID } });
    await prisma.empresa.deleteMany({ where: { id: TEST_EMPRESA_ID } });
    
    // Criar empresa de teste
    await prisma.empresa.create({
      data: {
        id: TEST_EMPRESA_ID,
        razaoSocial: 'Empresa Teste',
        cnpj: TEST_CNPJ,
        ativo: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.apuracao.deleteMany({ where: { empresaId: TEST_EMPRESA_ID } });
    await prisma.empresa.deleteMany({ where: { id: TEST_EMPRESA_ID } });
    await prisma.$disconnect();
  });

  describe('Anexo III', () => {
    it('deve calcular alíquota efetiva na 1ª faixa (até R$ 180.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        100000, // RBT12
        10000,  // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(1);
      expect(result.aliquotaNominal).toBe(0.06);
      expect(result.parcelaDeduzir).toBe(0);
      expect(result.aliquotaEfetiva).toBeCloseTo(6.0, 2);
      expect(result.anexo).toBe('III');
    });

    it('deve calcular alíquota efetiva na 2ª faixa (R$ 180.000,01 a R$ 360.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        250000, // RBT12
        20000,  // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(2);
      expect(result.aliquotaNominal).toBe(0.112);
      expect(result.parcelaDeduzir).toBe(9360);
      // (250000 * 0.112 - 9360) / 250000 = (28000 - 9360) / 250000 = 18640 / 250000 = 0.07456 = 7.456%
      expect(result.aliquotaEfetiva).toBeCloseTo(7.456, 2);
    });

    it('deve calcular alíquota efetiva na 3ª faixa (R$ 360.000,01 a R$ 720.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        500000, // RBT12
        40000,  // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(3);
      expect(result.aliquotaNominal).toBe(0.135);
      expect(result.parcelaDeduzir).toBe(17640);
      // (500000 * 0.135 - 17640) / 500000 = (67500 - 17640) / 500000 = 49860 / 500000 = 0.09972 = 9.972%
      expect(result.aliquotaEfetiva).toBeCloseTo(9.972, 2);
    });

    it('deve calcular alíquota efetiva na 4ª faixa (R$ 720.000,01 a R$ 1.800.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        1000000, // RBT12
        80000,   // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(4);
      expect(result.aliquotaNominal).toBe(0.16);
      expect(result.parcelaDeduzir).toBe(35640);
      // (1000000 * 0.16 - 35640) / 1000000 = (160000 - 35640) / 1000000 = 124360 / 1000000 = 0.12436 = 12.436%
      expect(result.aliquotaEfetiva).toBeCloseTo(12.436, 2);
    });

    it('deve calcular alíquota efetiva na 5ª faixa (R$ 1.800.000,01 a R$ 3.600.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        2500000, // RBT12
        200000,  // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(5);
      expect(result.aliquotaNominal).toBe(0.21);
      expect(result.parcelaDeduzir).toBe(125640);
      // (2500000 * 0.21 - 125640) / 2500000 = (525000 - 125640) / 2500000 = 399360 / 2500000 = 0.159744 = 15.9744%
      expect(result.aliquotaEfetiva).toBeCloseTo(15.9744, 2);
    });

    it('deve calcular alíquota efetiva na 6ª faixa (acima de R$ 3.600.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        4000000, // RBT12
        300000,  // Receita do mês
        'III',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(6);
      expect(result.aliquotaNominal).toBe(0.33);
      expect(result.parcelaDeduzir).toBe(648000);
      // (4000000 * 0.33 - 648000) / 4000000 = (1320000 - 648000) / 4000000 = 672000 / 4000000 = 0.168 = 16.8%
      expect(result.aliquotaEfetiva).toBeCloseTo(16.8, 2);
    });

    it('deve lançar erro para RBT12 fora das faixas', async () => {
      await expect(
        simplesCalculator.calcularAliquotaEfetiva(-100, 10000, 'III', new Date('2024-06-01'))
      ).rejects.toThrow('não se enquadra em nenhuma faixa');
    });
  });

  describe('Anexo IV', () => {
    it('deve calcular alíquota efetiva na 1ª faixa (até R$ 180.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        100000, // RBT12
        10000,  // Receita do mês
        'IV',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(1);
      expect(result.aliquotaNominal).toBe(0.045);
      expect(result.parcelaDeduzir).toBe(0);
      expect(result.aliquotaEfetiva).toBeCloseTo(4.5, 2);
      expect(result.anexo).toBe('IV');
    });

    it('deve calcular alíquota efetiva na 6ª faixa (acima de R$ 3.600.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        4000000, // RBT12
        300000,  // Receita do mês
        'IV',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(6);
      expect(result.aliquotaNominal).toBe(0.33);
      expect(result.parcelaDeduzir).toBe(828000);
      // (4000000 * 0.33 - 828000) / 4000000 = (1320000 - 828000) / 4000000 = 492000 / 4000000 = 0.123 = 12.3%
      expect(result.aliquotaEfetiva).toBeCloseTo(12.3, 2);
    });
  });

  describe('Anexo V', () => {
    it('deve calcular alíquota efetiva na 1ª faixa (até R$ 180.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        100000, // RBT12
        10000,  // Receita do mês
        'V',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(1);
      expect(result.aliquotaNominal).toBe(0.155);
      expect(result.parcelaDeduzir).toBe(0);
      expect(result.aliquotaEfetiva).toBeCloseTo(15.5, 2);
      expect(result.anexo).toBe('V');
    });

    it('deve calcular alíquota efetiva na 6ª faixa (acima de R$ 3.600.000)', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        4000000, // RBT12
        300000,  // Receita do mês
        'V',
        new Date('2024-06-01')
      );

      expect(result.faixa).toBe(6);
      expect(result.aliquotaNominal).toBe(0.305);
      expect(result.parcelaDeduzir).toBe(540000);
      // (4000000 * 0.305 - 540000) / 4000000 = (1220000 - 540000) / 4000000 = 680000 / 4000000 = 0.17 = 17%
      expect(result.aliquotaEfetiva).toBeCloseTo(17.0, 2);
    });
  });

  describe('Transição de faixa', () => {
    it('deve transicionar corretamente no limite entre 1ª e 2ª faixa do Anexo III', async () => {
      // Exatamente no limite superior da 1ª faixa
      const result1 = await simplesCalculator.calcularAliquotaEfetiva(
        180000, 10000, 'III', new Date('2024-06-01')
      );
      expect(result1.faixa).toBe(1);

      // Um centavo acima - deve ir para 2ª faixa
      const result2 = await simplesCalculator.calcularAliquotaEfetiva(
        180000.01, 10000, 'III', new Date('2024-06-01')
      );
      expect(result2.faixa).toBe(2);
    });

    it('deve transicionar corretamente no limite entre 5ª e 6ª faixa do Anexo III', async () => {
      const result1 = await simplesCalculator.calcularAliquotaEfetiva(
        3600000, 200000, 'III', new Date('2024-06-01')
      );
      expect(result1.faixa).toBe(5);

      const result2 = await simplesCalculator.calcularAliquotaEfetiva(
        3600000.01, 200000, 'III', new Date('2024-06-01')
      );
      expect(result2.faixa).toBe(6);
    });
  });

  describe('Memória de cálculo', () => {
    it('deve gerar memória de cálculo legível', async () => {
      const result = await simplesCalculator.calcularAliquotaEfetiva(
        250000, 20000, 'III', new Date('2024-06-01')
      );

      expect(result.memoriaCalculo).toContain('RBT12');
      expect(result.memoriaCalculo).toContain('Faixa utilizada');
      expect(result.memoriaCalculo).toContain('Alíquota nominal');
      expect(result.memoriaCalculo).toContain('Parcela a deduzir');
      expect(result.memoriaCalculo).toContain('Cálculo:');
      expect(result.memoriaCalculo).toContain('Alíquota efetiva');
      expect(result.memoriaCalculo).toContain('Valor DAS');
      expect(result.memoriaCalculo).toContain('Anexo: III');
    });
  });
});

describe('RBT12Calculator - Cálculo do RBT12', () => {
  const TEST_EMPRESA_RBT12 = 'test-rbt12-' + Date.now();
  const TEST_CNPJ_RBT12 = '22333444000192';

  beforeAll(async () => {
    await prisma.apuracao.deleteMany({ where: { empresaId: TEST_EMPRESA_RBT12 } });
    await prisma.empresa.deleteMany({ where: { id: TEST_EMPRESA_RBT12 } });
    
    await prisma.empresa.create({
      data: {
        id: TEST_EMPRESA_RBT12,
        razaoSocial: 'Empresa RBT12 Teste',
        cnpj: TEST_CNPJ_RBT12,
        ativo: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.apuracao.deleteMany({ where: { empresaId: TEST_EMPRESA_RBT12 } });
    await prisma.empresa.deleteMany({ where: { id: TEST_EMPRESA_RBT12 } });
  });

  it('deve retornar RBT12 = 0 para empresa sem histórico', async () => {
    const result = await rbt12Calculator.calcularRBT12(TEST_EMPRESA_RBT12, new Date('2024-06-01'));
    
    expect(result.rbt12).toBe(0);
    expect(result.baseCalculo).toHaveLength(0);
    expect(result.mesesFaltantes).toBe(12);
    expect(result.avisos).toContain('Empresa sem histórico de apurações. RBT12 calculado como zero.');
  });

  it('deve calcular RBT12 corretamente com 12 meses de histórico', async () => {
    // Criar 12 meses de apurações
    const baseDate = new Date('2023-06-01');
    for (let i = 0; i < 12; i++) {
      const periodo = new Date(baseDate);
      periodo.setMonth(baseDate.getMonth() + i);
      
      await prisma.apuracao.create({
        data: {
          empresaId: TEST_EMPRESA_RBT12,
          periodoApuracao: periodo,
          receitaBrutaMes: new Decimal(10000 * (i + 1)), // 10k, 20k, 30k...
          anexo: 'III',
          aliquotaNominal: new Decimal(0.06),
          parcelaDeduzir: new Decimal(0),
          aliquotaEfetiva: new Decimal(6),
          valorDas: new Decimal(600 * (i + 1)),
          versaoRegra: '2024.1',
        },
      });
    }

    const result = await rbt12Calculator.calcularRBT12(TEST_EMPRESA_RBT12, new Date('2024-06-01'));
    
    // Soma: 10k + 20k + ... + 120k = 10k * (12*13/2) = 10k * 78 = 780.000
    expect(result.rbt12).toBe(780000);
    expect(result.baseCalculo).toHaveLength(12);
    expect(result.mesesFaltantes).toBe(0);
    expect(result.avisos).toHaveLength(0);
  });

  it('deve avisar quando histórico incompleto (< 12 meses)', async () => {
    const result = await rbt12Calculator.calcularRBT12(TEST_EMPRESA_RBT12, new Date('2023-12-01'));
    
    // Só teria 6 meses (jun a nov 2023)
    expect(result.baseCalculo.length).toBeLessThan(12);
    expect(result.mesesFaltantes).toBeGreaterThan(0);
    expect(result.avisos.some(a => a.includes('incompleto'))).toBe(true);
  });
});

describe('TaxRuleRepository - Regras Tributárias', () => {
  it('deve buscar regras do Anexo III vigentes', async () => {
    const rules = await taxRuleRepo.findByAnexoAndDate('III', new Date('2024-06-01'));
    
    expect(rules.length).toBe(6);
    expect(rules.every(r => r.anexo === 'III')).toBe(true);
    expect(rules[0].faixa).toBe(1);
    expect(rules[5].faixa).toBe(6);
  });

  it('deve buscar regras do Anexo IV vigentes', async () => {
    const rules = await taxRuleRepo.findByAnexoAndDate('IV', new Date('2024-06-01'));
    
    expect(rules.length).toBe(6);
    expect(rules.every(r => r.anexo === 'IV')).toBe(true);
  });

  it('deve buscar regras do Anexo V vigentes', async () => {
    const rules = await taxRuleRepo.findByAnexoAndDate('V', new Date('2024-06-01'));
    
    expect(rules.length).toBe(6);
    expect(rules.every(r => r.anexo === 'V')).toBe(true);
  });

  it('deve converter regras para faixas corretamente', async () => {
    const rules = await taxRuleRepo.findByAnexoAndDate('III', new Date('2024-06-01'));
    const faixas = taxRuleRepo.toFaixas(rules);
    
    expect(faixas).toHaveLength(6);
    expect(faixas[0]).toEqual({
      faixa: 1,
      limiteInferior: 0,
      limiteSuperior: 180000,
      aliquotaNominal: 0.06,
      parcelaDeduzir: 0,
    });
    expect(faixas[5].limiteSuperior).toBeNull(); // Sem teto
  });
});

describe('Cenários de Integração', () => {
  const INTEGRATION_EMPRESA = 'test-integration-' + Date.now();
  const INTEGRATION_CNPJ = '33444555000103';

  beforeAll(async () => {
    await prisma.apuracao.deleteMany({ where: { empresaId: INTEGRATION_EMPRESA } });
    await prisma.empresa.deleteMany({ where: { id: INTEGRATION_EMPRESA } });
    
    await prisma.empresa.create({
      data: {
        id: INTEGRATION_EMPRESA,
        razaoSocial: 'Empresa Integração',
        cnpj: INTEGRATION_CNPJ,
        ativo: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.apuracao.deleteMany({ where: { empresaId: INTEGRATION_EMPRESA } });
    await prisma.empresa.deleteMany({ where: { id: INTEGRATION_EMPRESA } });
  });

  it('deve calcular RBT12 e alíquota em sequência (fluxo completo)', async () => {
    // Criar histórico de 6 meses
    const baseDate = new Date('2024-01-01');
    const receitas = [15000, 18000, 22000, 20000, 25000, 30000];
    
    for (let i = 0; i < receitas.length; i++) {
      const periodo = new Date(baseDate);
      periodo.setMonth(baseDate.getMonth() + i);
      
      await prisma.apuracao.create({
        data: {
          empresaId: INTEGRATION_EMPRESA,
          periodoApuracao: periodo,
          receitaBrutaMes: new Decimal(receitas[i]),
          anexo: 'III',
          aliquotaNominal: new Decimal(0.06),
          parcelaDeduzir: new Decimal(0),
          aliquotaEfetiva: new Decimal(6),
          valorDas: new Decimal(receitas[i] * 0.06),
          versaoRegra: '2024.1',
        },
      });
    }

    // Calcular RBT12 para julho/2024 (deve somar jan a jun)
    const { rbt12 } = await rbt12Calculator.calcularRBT12(INTEGRATION_EMPRESA, new Date('2024-07-01'));
    
    // Soma: 15k + 18k + 22k + 20k + 25k + 30k = 130.000
    expect(rbt12).toBe(130000);

    // Calcular alíquota para julho/2024 com RBT12 = 130.000 (1ª faixa Anexo III)
    const calculo = await simplesCalculator.calcularAliquotaEfetiva(
      rbt12,
      32000, // Receita de julho
      'III',
      new Date('2024-07-01')
    );

    expect(calculo.faixa).toBe(1);
    expect(calculo.aliquotaEfetiva).toBeCloseTo(6.0, 2);
    expect(calculo.valorDas).toBeCloseTo(1920, 2); // 32000 * 6%
  });

  it('deve projetar próximo mês baseado no histórico', async () => {
    const projecao = await simplesCalculator.projetarProximoMes(
      INTEGRATION_EMPRESA,
      rbt12Calculator,
      'III',
      new Date('2024-08-01')
    );

    expect(projecao.rbt12Estimado).toBeGreaterThan(0);
    expect(projecao.faixa).toBeGreaterThanOrEqual(1);
    expect(projecao.aliquotaEfetivaEstimada).toBeGreaterThan(0);
    expect(projecao.observacoes.length).toBeGreaterThan(0);
    expect(projecao.baseCalculo.length).toBeGreaterThan(0);
  });
});

describe('Validações e Casos de Borda', () => {
  it('deve lançar erro para anexo inválido', async () => {
    await expect(
      simplesCalculator.calcularAliquotaEfetiva(100000, 10000, 'VI' as any, new Date('2024-06-01'))
    ).rejects.toThrow();
  });

  it('deve lançar erro para data sem regras vigentes', async () => {
    await expect(
      simplesCalculator.calcularAliquotaEfetiva(100000, 10000, 'III', new Date('2020-01-01'))
    ).rejects.toThrow('Nenhuma regra tributária encontrada');
  });

  it('deve calcular DAS corretamente: receita * aliquotaEfetiva / 100', async () => {
    const result = await simplesCalculator.calcularAliquotaEfetiva(
      200000, // RBT12 - 2ª faixa Anexo III
      50000,  // Receita do mês
      'III',
      new Date('2024-06-01')
    );

    const dasEsperado = 50000 * (result.aliquotaEfetiva / 100);
    expect(result.valorDas).toBeCloseTo(dasEsperado, 2);
  });
});