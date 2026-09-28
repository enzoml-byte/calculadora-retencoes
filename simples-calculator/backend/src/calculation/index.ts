import { PrismaClient, TaxRule, Apuracao } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { AnexoType, FaixaTributaria, CalculoAliquotaResult } from '@simples/shared';

export class TaxRuleRepository {
  constructor(private prisma: PrismaClient) {}

  async findByAnexoAndDate(anexo: AnexoType, date: Date): Promise<TaxRule[]> {
    return this.prisma.taxRule.findMany({
      where: {
        anexo,
        vigenciaInicio: { lte: date },
        OR: [
          { vigenciaFim: null },
          { vigenciaFim: { gte: date } },
        ],
      },
      orderBy: { faixa: 'asc' },
    });
  }

  async findLatestVersion(anexo: AnexoType): Promise<string | null> {
    const rule = await this.prisma.taxRule.findFirst({
      where: { anexo },
      orderBy: { createdAt: 'desc' },
      select: { versao: true },
    });
    return rule?.versao ?? null;
  }

  async getAllRules(): Promise<TaxRule[]> {
    return this.prisma.taxRule.findMany({
      orderBy: [{ anexo: 'asc' }, { vigenciaInicio: 'asc' }, { faixa: 'asc' }],
    });
  }

  async createMany(rules: Omit<TaxRule, 'id' | 'createdAt'>[]): Promise<void> {
    await this.prisma.taxRule.createMany({ data: rules, skipDuplicates: true });
  }

  toFaixas(rules: TaxRule[]): FaixaTributaria[] {
    return rules.map(r => ({
      faixa: r.faixa,
      limiteInferior: Number(r.limiteInferior),
      limiteSuperior: r.limiteSuperior ? Number(r.limiteSuperior) : null,
      aliquotaNominal: Number(r.aliquotaNominal),
      parcelaDeduzir: Number(r.parcelaDeduzir),
    }));
  }
}

export class RBT12Calculator {
  constructor(private prisma: PrismaClient) {}

  async calcularRBT12(empresaId: string, periodoApuracao: Date): Promise<{
    rbt12: number;
    baseCalculo: Array<{ periodo: Date; receita: number }>;
    mesesFaltantes: number;
    avisos: string[];
  }> {
    const inicioPeriodo = new Date(periodoApuracao);
    inicioPeriodo.setMonth(inicioPeriodo.getMonth() - 12);
    inicioPeriodo.setDate(1);
    inicioPeriodo.setHours(0, 0, 0, 0);

    const fimPeriodo = new Date(periodoApuracao);
    fimPeriodo.setDate(0);
    fimPeriodo.setHours(23, 59, 59, 999);

    const apuracoes = await this.prisma.apuracao.findMany({
      where: {
        empresaId,
        periodoApuracao: {
          gte: inicioPeriodo,
          lte: fimPeriodo,
        },
      },
      orderBy: { periodoApuracao: 'asc' },
    });

    const baseCalculo = apuracoes.map(a => ({
      periodo: a.periodoApuracao,
      receita: Number(a.receitaBrutaMes),
    }));

    const rbt12 = baseCalculo.reduce((sum, item) => sum + item.receita, 0);
    const mesesFaltantes = 12 - baseCalculo.length;

    const avisos: string[] = [];
    if (mesesFaltantes > 0) {
      if (baseCalculo.length === 0) {
        avisos.push('Empresa sem histórico de apurações. RBT12 calculado como zero.');
      } else {
        avisos.push(`Histórico incompleto: apenas ${baseCalculo.length} de 12 meses disponíveis. RBT12 pode estar subestimado.`);
      }
    }

    return { rbt12, baseCalculo, mesesFaltantes, avisos };
  }

  async getHistoricoCompleto(empresaId: string): Promise<Array<{ periodo: Date; receita: number }>> {
    const apuracoes = await this.prisma.apuracao.findMany({
      where: { empresaId },
      orderBy: { periodoApuracao: 'asc' },
    });
    return apuracoes.map(a => ({
      periodo: a.periodoApuracao,
      receita: Number(a.receitaBrutaMes),
    }));
  }
}

function encontrarFaixa(faixas: FaixaTributaria[], rbt12: number): FaixaTributaria | null {
  for (const faixa of faixas) {
    const inferior = faixa.limiteInferior;
    const superior = faixa.limiteSuperior ?? Infinity;
    if (rbt12 >= inferior && rbt12 <= superior) {
      return faixa;
    }
  }
  return null;
}

export class SimplesCalculator {
  constructor(private taxRuleRepo: TaxRuleRepository) {}

  async calcularAliquotaEfetiva(
    rbt12: number,
    receitaMes: number,
    anexo: AnexoType,
    dataApuracao: Date
  ): Promise<CalculoAliquotaResult> {
    const rules = await this.taxRuleRepo.findByAnexoAndDate(anexo, dataApuracao);
    
    if (rules.length === 0) {
      throw new Error(`Nenhuma regra tributária encontrada para Anexo ${anexo} na data ${dataApuracao.toISOString()}`);
    }

    const faixas = this.taxRuleRepo.toFaixas(rules);
    const faixa = encontrarFaixa(faixas, rbt12);

    if (!faixa) {
      throw new Error(`RBT12 ${rbt12} não se enquadra em nenhuma faixa do Anexo ${anexo}`);
    }

    const aliquotaNominal = faixa.aliquotaNominal;
    const parcelaDeduzir = faixa.parcelaDeduzir;

    const aliquotaEfetiva = ((rbt12 * aliquotaNominal - parcelaDeduzir) / rbt12) * 100;
    const valorDas = receitaMes * (aliquotaEfetiva / 100);

    const memoriaCalculo = this.gerarMemoriaCalculo(
      rbt12,
      faixa.faixa,
      aliquotaNominal,
      parcelaDeduzir,
      aliquotaEfetiva,
      valorDas,
      anexo
    );

    return {
      faixa: faixa.faixa,
      aliquotaNominal,
      parcelaDeduzir,
      aliquotaEfetiva: Number(aliquotaEfetiva.toFixed(4)),
      valorDas: Number(valorDas.toFixed(2)),
      rbt12,
      anexo,
      memoriaCalculo,
    };
  }

  private gerarMemoriaCalculo(
    rbt12: number,
    faixa: number,
    aliquotaNominal: number,
    parcelaDeduzir: number,
    aliquotaEfetiva: number,
    valorDas: number,
    anexo: AnexoType
  ): string {
    const rbt12Formatado = rbt12.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const aliquotaNominalFormatada = (aliquotaNominal * 100).toFixed(2);
    const parcelaFormatada = parcelaDeduzir.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const aliquotaEfetivaFormatada = aliquotaEfetiva.toFixed(2);
    const valorDasFormatado = valorDas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
RBT12: R$ ${rbt12Formatado}

Faixa utilizada: ${faixa}ª faixa

Alíquota nominal: ${aliquotaNominalFormatada}%

Parcela a deduzir: R$ ${parcelaFormatada}

Cálculo:
(${rbt12Formatado} × ${aliquotaNominalFormatada}% − ${parcelaFormatada}) / ${rbt12Formatado}

Alíquota efetiva: ${aliquotaEfetivaFormatada}%

Valor DAS estimado: R$ ${valorDasFormatado}

Anexo: ${anexo}
Versão da regra: Vigente na data da apuração
    `.trim();
  }

  async projetarProximoMes(
    empresaId: string,
    rbt12Calculator: RBT12Calculator,
    anexoAtual: AnexoType,
    dataProximaApuracao: Date
  ): Promise<{
    rbt12Estimado: number;
    faixa: number;
    aliquotaNominal: number;
    parcelaDeduzir: number;
    aliquotaEfetivaEstimada: number;
    baseCalculo: Array<{ periodo: Date; receita: number }>;
    observacoes: string[];
  }> {
    const { rbt12, baseCalculo, mesesFaltantes, avisos } = 
      await rbt12Calculator.calcularRBT12(empresaId, dataProximaApuracao);

    const rules = await this.taxRuleRepo.findByAnexoAndDate(anexoAtual, dataProximaApuracao);
    const faixas = this.taxRuleRepo.toFaixas(rules);
    const faixa = encontrarFaixa(faixas, rbt12);

    if (!faixa) {
      throw new Error(`RBT12 estimado ${rbt12} não se enquadra em nenhuma faixa do Anexo ${anexoAtual}`);
    }

    const aliquotaEfetivaEstimada = ((rbt12 * faixa.aliquotaNominal - faixa.parcelaDeduzir) / rbt12) * 100;

    const observacoes = [...avisos];
    if (mesesFaltantes > 0) {
      observacoes.push('ESTIMATIVA: Baseado em histórico parcial. Valores podem divergir do PGDAS oficial.');
    }
    observacoes.push('Esta é uma projeção baseada nos dados cadastrados. Confira com o PGDAS-D oficial quando disponível.');

    return {
      rbt12Estimado: rbt12,
      faixa: faixa.faixa,
      aliquotaNominal: faixa.aliquotaNominal,
      parcelaDeduzir: faixa.parcelaDeduzir,
      aliquotaEfetivaEstimada: Number(aliquotaEfetivaEstimada.toFixed(4)),
      baseCalculo,
      observacoes,
    };
  }
}