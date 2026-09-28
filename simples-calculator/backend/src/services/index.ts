import { PrismaClient, Prisma, Apuracao, Empresa } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  Empresa as EmpresaType, 
  Apuracao as ApuracaoType, 
  AnexoType,
  ImportPreviewData,
  HistoricoApuracao,
  EmpresaDashboard,
  ProjecaoProximoMes
} from '@simples/shared';
import { RBT12Calculator, SimplesCalculator, TaxRuleRepository } from '../calculation';
import { PDFParser } from '../pdf-parser';
import { JsonParser } from '../json-parser';

export class EmpresaService {
  constructor(private prisma: PrismaClient) {}

  async create(data: { razaoSocial: string; nomeFantasia?: string; cnpj: string }): Promise<Empresa> {
    const cnpjLimpo = data.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve ter 14 dígitos');
    }

    return this.prisma.empresa.create({
      data: {
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        cnpj: cnpjLimpo,
      },
    });
  }

  async findAll(apenasAtivas = true): Promise<Empresa[]> {
    return this.prisma.empresa.findMany({
      where: apenasAtivas ? { ativo: true } : {},
      orderBy: { razaoSocial: 'asc' },
      include: {
        _count: { select: { apuracoes: true } },
        apuracoes: {
          take: 1,
          orderBy: { periodoApuracao: 'desc' },
          select: { periodoApuracao: true },
        },
      },
    });
  }

  async findById(id: string): Promise<Empresa | null> {
    return this.prisma.empresa.findUnique({ where: { id } });
  }

  async findByCNPJ(cnpj: string): Promise<Empresa | null> {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return this.prisma.empresa.findUnique({ where: { cnpj: cnpjLimpo } });
  }

  async update(id: string, data: Partial<Pick<Empresa, 'razaoSocial' | 'nomeFantasia' | 'ativo'>>): Promise<Empresa> {
    return this.prisma.empresa.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.empresa.delete({ where: { id } });
  }

  async getDashboardData(empresaId: string): Promise<EmpresaDashboard | null> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        apuracoes: {
          orderBy: { periodoApuracao: 'asc' },
        },
      },
    });

    if (!empresa) return null;

    const apuracoes = empresa.apuracoes;
    const ultimaApuracao = apuracoes[apuracoes.length - 1] || null;

    const receitaAcumulada12m = apuracoes
      .slice(-12)
      .reduce((sum, a) => sum + Number(a.receitaBrutaMes), 0);

    let rbt12Atual: number | null = null;
    let divergenciaRbt12 = false;
    
    if (ultimaApuracao) {
      rbt12Atual = Number(ultimaApuracao.rbt12CalculadoSistema ?? ultimaApuracao.rbt12InformadoPgdas ?? 0);
      if (ultimaApuracao.rbt12InformadoPgdas && ultimaApuracao.rbt12CalculadoSistema) {
        const diff = Math.abs(Number(ultimaApuracao.rbt12InformadoPgdas) - Number(ultimaApuracao.rbt12CalculadoSistema));
        divergenciaRbt12 = diff > 0.01;
      }
    }

    const historico: HistoricoApuracao[] = apuracoes.map(a => ({
      periodo: a.periodoApuracao,
      receita: Number(a.receitaBrutaMes),
      rbt12Pgdas: a.rbt12InformadoPgdas ? Number(a.rbt12InformadoPgdas) : null,
      rbt12Sistema: a.rbt12CalculadoSistema ? Number(a.rbt12CalculadoSistema) : null,
      anexo: a.anexo as AnexoType,
      aliquotaEfetiva: Number(a.aliquotaEfetiva),
      valorDas: Number(a.valorDas),
      divergencia: a.rbt12InformadoPgdas && a.rbt12CalculadoSistema 
        ? Math.abs(Number(a.rbt12InformadoPgdas) - Number(a.rbt12CalculadoSistema)) > 0.01
        : false,
    }));

    return {
      empresa: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        dataCadastro: empresa.dataCadastro,
        ativo: empresa.ativo,
      },
      ultimaApuracao: ultimaApuracao ? this.mapApuracao(ultimaApuracao) : null,
      receitaAcumulada12m,
      rbt12Atual,
      anexoAtual: ultimaApuracao?.anexo as AnexoType | null,
      aliquotaEfetivaAtual: ultimaApuracao ? Number(ultimaApuracao.aliquotaEfetiva) : null,
      divergenciaRbt12,
      historico,
    };
  }

  private mapApuracao(a: Apuracao): ApuracaoType {
    return {
      id: a.id,
      empresaId: a.empresaId,
      periodoApuracao: a.periodoApuracao,
      receitaBrutaMes: Number(a.receitaBrutaMes),
      rbt12InformadoPgdas: a.rbt12InformadoPgdas ? Number(a.rbt12InformadoPgdas) : null,
      rbt12CalculadoSistema: a.rbt12CalculadoSistema ? Number(a.rbt12CalculadoSistema) : null,
      anexo: a.anexo as AnexoType,
      aliquotaNominal: Number(a.aliquotaNominal),
      parcelaDeduzir: Number(a.parcelaDeduzir),
      aliquotaEfetiva: Number(a.aliquotaEfetiva),
      valorDas: Number(a.valorDas),
      arquivoOriginal: a.arquivoOriginal,
      dataImportacao: a.dataImportacao,
      observacoes: a.observacoes,
      versaoRegra: a.versaoRegra,
      substituidaPorId: a.substituidaPorId,
    };
  }
}

export class ApuracaoService {
  constructor(
    private prisma: PrismaClient,
    private rbt12Calculator: RBT12Calculator,
    private simplesCalculator: SimplesCalculator,
    private taxRuleRepo: TaxRuleRepository
  ) {}

  async create(data: {
    empresaId: string;
    periodoApuracao: Date;
    receitaBrutaMes: number;
    rbt12InformadoPgdas?: number | null;
    anexo: AnexoType;
    arquivoOriginal?: string;
    observacoes?: string;
  }): Promise<ApuracaoType> {
    const existing = await this.prisma.apuracao.findUnique({
      where: {
        empresaId_periodoApuracao: {
          empresaId: data.empresaId,
          periodoApuracao: data.periodoApuracao,
        },
      },
    });

    if (existing) {
      throw new Error('Já existe uma apuração para esta empresa neste período. Use retificação se necessário.');
    }

    const { rbt12: rbt12Calculado, avisos } = await this.rbt12Calculator.calcularRBT12(
      data.empresaId,
      data.periodoApuracao
    );

    const rbt12ParaCalculo = data.rbt12InformadoPgdas ?? rbt12Calculado;
    const versaoRegra = await this.taxRuleRepo.findLatestVersion(data.anexo) || '1.0';

    const calculo = await this.simplesCalculator.calcularAliquotaEfetiva(
      rbt12ParaCalculo,
      data.receitaBrutaMes,
      data.anexo,
      data.periodoApuracao
    );

    const apuracao = await this.prisma.apuracao.create({
      data: {
        empresaId: data.empresaId,
        periodoApuracao: data.periodoApuracao,
        receitaBrutaMes: new Prisma.Decimal(data.receitaBrutaMes.toFixed(2)),
        rbt12InformadoPgdas: data.rbt12InformadoPgdas ? new Prisma.Decimal(data.rbt12InformadoPgdas.toFixed(2)) : null,
        rbt12CalculadoSistema: new Prisma.Decimal(rbt12Calculado.toFixed(2)),
        anexo: data.anexo,
        aliquotaNominal: new Prisma.Decimal(calculo.aliquotaNominal.toFixed(4)),
        parcelaDeduzir: new Prisma.Decimal(calculo.parcelaDeduzir.toFixed(2)),
        aliquotaEfetiva: new Prisma.Decimal(calculo.aliquotaEfetiva.toFixed(4)),
        valorDas: new Prisma.Decimal(calculo.valorDas.toFixed(2)),
        arquivoOriginal: data.arquivoOriginal,
        observacoes: data.observacoes,
        versaoRegra,
      },
    });

    return this.mapApuracao(apuracao);
  }

  async retificar(
    apuracaoId: string,
    data: {
      receitaBrutaMes?: number;
      rbt12InformadoPgdas?: number | null;
      anexo?: AnexoType;
      observacoes?: string;
    }
  ): Promise<ApuracaoType> {
    const original = await this.prisma.apuracao.findUnique({ where: { id: apuracaoId } });
    if (!original) throw new Error('Apuração não encontrada');

    const novaReceita = data.receitaBrutaMes ?? Number(original.receitaBrutaMes);
    const novoRbt12Informado = data.rbt12InformadoPgdas ?? Number(original.rbt12InformadoPgdas ?? 0);
    const novoAnexo = data.anexo ?? (original.anexo as AnexoType);

    const { rbt12: rbt12Calculado } = await this.rbt12Calculator.calcularRBT12(
      original.empresaId,
      original.periodoApuracao
    );

    const rbt12ParaCalculo = novoRbt12Informado ?? rbt12Calculado;
    const versaoRegra = await this.taxRuleRepo.findLatestVersion(novoAnexo) || '1.0';

    const calculo = await this.simplesCalculator.calcularAliquotaEfetiva(
      rbt12ParaCalculo,
      novaReceita,
      novoAnexo,
      original.periodoApuracao
    );

    const novaApuracao = await this.prisma.apuracao.create({
      data: {
        empresaId: original.empresaId,
        periodoApuracao: original.periodoApuracao,
        receitaBrutaMes: new Prisma.Decimal(novaReceita.toFixed(2)),
        rbt12InformadoPgdas: novoRbt12Informado > 0 ? new Prisma.Decimal(novoRbt12Informado.toFixed(2)) : null,
        rbt12CalculadoSistema: new Prisma.Decimal(rbt12Calculado.toFixed(2)),
        anexo: novoAnexo,
        aliquotaNominal: new Prisma.Decimal(calculo.aliquotaNominal.toFixed(4)),
        parcelaDeduzir: new Prisma.Decimal(calculo.parcelaDeduzir.toFixed(2)),
        aliquotaEfetiva: new Prisma.Decimal(calculo.aliquotaEfetiva.toFixed(4)),
        valorDas: new Prisma.Decimal(calculo.valorDas.toFixed(2)),
        arquivoOriginal: original.arquivoOriginal,
        observacoes: data.observacoes ?? `Retificação: ${original.observacoes ?? ''}`,
        versaoRegra,
        substituidaPorId: original.id,
      },
    });

    await this.prisma.apuracao.update({
      where: { id: original.id },
      data: { substituidaPorId: novaApuracao.id },
    });

    return this.mapApuracao(novaApuracao);
  }

  async findByEmpresa(empresaId: string): Promise<ApuracaoType[]> {
    const apuracoes = await this.prisma.apuracao.findMany({
      where: { empresaId },
      orderBy: { periodoApuracao: 'asc' },
    });
    return apuracoes.map(this.mapApuracao);
  }

  async findById(id: string): Promise<ApuracaoType | null> {
    const a = await this.prisma.apuracao.findUnique({ where: { id } });
    return a ? this.mapApuracao(a) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.apuracao.delete({ where: { id } });
  }

  async getHistorico(empresaId: string): Promise<HistoricoApuracao[]> {
    const apuracoes = await this.prisma.apuracao.findMany({
      where: { empresaId },
      orderBy: { periodoApuracao: 'asc' },
    });
    return apuracoes.map(a => ({
      periodo: a.periodoApuracao,
      receita: Number(a.receitaBrutaMes),
      rbt12Pgdas: a.rbt12InformadoPgdas ? Number(a.rbt12InformadoPgdas) : null,
      rbt12Sistema: a.rbt12CalculadoSistema ? Number(a.rbt12CalculadoSistema) : null,
      anexo: a.anexo as AnexoType,
      aliquotaEfetiva: Number(a.aliquotaEfetiva),
      valorDas: Number(a.valorDas),
      divergencia: a.rbt12InformadoPgdas && a.rbt12CalculadoSistema
        ? Math.abs(Number(a.rbt12InformadoPgdas) - Number(a.rbt12CalculadoSistema)) > 0.01
        : false,
    }));
  }

  private mapApuracao(a: Apuracao): ApuracaoType {
    return {
      id: a.id,
      empresaId: a.empresaId,
      periodoApuracao: a.periodoApuracao,
      receitaBrutaMes: Number(a.receitaBrutaMes),
      rbt12InformadoPgdas: a.rbt12InformadoPgdas ? Number(a.rbt12InformadoPgdas) : null,
      rbt12CalculadoSistema: a.rbt12CalculadoSistema ? Number(a.rbt12CalculadoSistema) : null,
      anexo: a.anexo as AnexoType,
      aliquotaNominal: Number(a.aliquotaNominal),
      parcelaDeduzir: Number(a.parcelaDeduzir),
      aliquotaEfetiva: Number(a.aliquotaEfetiva),
      valorDas: Number(a.valorDas),
      arquivoOriginal: a.arquivoOriginal,
      dataImportacao: a.dataImportacao,
      observacoes: a.observacoes,
      versaoRegra: a.versaoRegra,
      substituidaPorId: a.substituidaPorId,
    };
  }
}

export class ImportService {
  constructor(
    private prisma: PrismaClient,
    private pdfParser: PDFParser,
    private jsonParser: JsonParser,
    private empresaService: EmpresaService,
    private apuracaoService: ApuracaoService,
    private rbt12Calculator: RBT12Calculator,
    private simplesCalculator: SimplesCalculator,
    private taxRuleRepo: TaxRuleRepository
  ) {}

  private async buildPreview(
    empresaId: string,
    extracted: { periodoApuracao: Date | null; receitaBrutaMes: number | null; rbt12Informado: number | null; anexo: AnexoType | null },
    warnings: string[]
  ): Promise<ImportPreviewData> {
    const empresa = await this.empresaService.findById(empresaId);
    if (!empresa) throw new Error('Empresa não encontrada');

    const anexo = extracted.anexo;
    let aliquotaNominal: number | null = null;
    let parcelaDeduzir: number | null = null;
    let aliquotaEfetiva: number | null = null;
    let valorDas: number | null = null;
    let faixa: number | null = null;
    let memoriaCalculo: string | null = null;

    let rbt12CalculadoSistema: number | null = null;
    if (extracted.periodoApuracao) {
      const { rbt12 } = await this.rbt12Calculator.calcularRBT12(empresaId, extracted.periodoApuracao);
      rbt12CalculadoSistema = rbt12;
    }

    const rbt12InformadoPgdas = extracted.rbt12Informado ?? null;
    // Prioridade: PGDAS se existir, senão sistema (usuário pode trocar na tela)
    const rbt12Usado = rbt12InformadoPgdas ?? rbt12CalculadoSistema ?? null;

    const divergencia =
      rbt12InformadoPgdas !== null &&
      rbt12CalculadoSistema !== null &&
      Math.abs(rbt12InformadoPgdas - rbt12CalculadoSistema) > 0.01;
    const diferencaRbt12 =
      rbt12InformadoPgdas !== null && rbt12CalculadoSistema !== null
        ? Number((rbt12InformadoPgdas - rbt12CalculadoSistema).toFixed(2))
        : null;

    if (divergencia) {
      warnings.push(
        `Divergência de RBT12: PGDAS informa ${rbt12InformadoPgdas?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e o sistema calculou ${rbt12CalculadoSistema?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (diferença de ${diferencaRbt12?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Escolha qual usar no cálculo.`
      );
    }

    if (extracted.receitaBrutaMes && anexo && rbt12Usado && rbt12Usado > 0) {
      const periodo = extracted.periodoApuracao || new Date();
      try {
        const calculo = await this.simplesCalculator.calcularAliquotaEfetiva(
          rbt12Usado,
          extracted.receitaBrutaMes,
          anexo,
          periodo
        );
        aliquotaNominal = calculo.aliquotaNominal;
        parcelaDeduzir = calculo.parcelaDeduzir;
        aliquotaEfetiva = calculo.aliquotaEfetiva;
        valorDas = calculo.valorDas;
        faixa = calculo.faixa;
        memoriaCalculo = calculo.memoriaCalculo;
      } catch (e) {
        warnings.push(`Erro no cálculo automático: ${(e as Error).message}`);
      }
    }

    return {
      empresa: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        dataCadastro: empresa.dataCadastro,
        ativo: empresa.ativo,
      },
      periodo: extracted.periodoApuracao || new Date(),
      receitaBrutaMes: extracted.receitaBrutaMes || 0,
      rbt12InformadoPgdas,
      rbt12CalculadoSistema,
      rbt12Usado,
      divergencia,
      diferencaRbt12,
      anexo,
      aliquotaNominal,
      parcelaDeduzir,
      aliquotaEfetiva,
      valorDas,
      faixa,
      memoriaCalculo,
      warnings,
    };
  }

  async previewImport(
    empresaId: string,
    pdfBuffer: Buffer,
    arquivoOriginal: string
  ): Promise<ImportPreviewData> {
    const extracted = await this.pdfParser.parse(pdfBuffer);
    const warnings = this.pdfParser.validateExtractedData(extracted);
    return this.buildPreview(empresaId, extracted, warnings);
  }

  async previewJson(
    empresaId: string,
    jsonInput: unknown,
    arquivoOriginal = 'importacao.json'
  ): Promise<ImportPreviewData> {
    void arquivoOriginal;
    const extracted = this.jsonParser.parse(jsonInput);
    const warnings = this.jsonParser.validateExtractedData(extracted);
    warnings.unshift('Dados originados de transcrição JSON (ex: Gemini). Confira todos os campos antes de salvar.');
    return this.buildPreview(empresaId, extracted, warnings);
  }

  async confirmImport(
    empresaId: string,
    data: {
      periodoApuracao: Date;
      receitaBrutaMes: number;
      rbt12InformadoPgdas?: number | null;
      anexo: AnexoType;
      arquivoOriginal: string;
      observacoes?: string;
    }
  ): Promise<ApuracaoType> {
    return this.apuracaoService.create({
      empresaId,
      periodoApuracao: data.periodoApuracao,
      receitaBrutaMes: data.receitaBrutaMes,
      rbt12InformadoPgdas: data.rbt12InformadoPgdas,
      anexo: data.anexo,
      arquivoOriginal: data.arquivoOriginal,
      observacoes: data.observacoes,
    });
  }

  async projetarProximoMes(empresaId: string): Promise<ProjecaoProximoMes> {
    const empresa = await this.empresaService.findById(empresaId);
    if (!empresa) throw new Error('Empresa não encontrada');

    const ultimaApuracao = await this.prisma.apuracao.findFirst({
      where: { empresaId },
      orderBy: { periodoApuracao: 'desc' },
    });

    if (!ultimaApuracao) {
      throw new Error('Empresa sem apurações anteriores. Importe ao menos um PGDAS para projetar.');
    }

    const proximoPeriodo = new Date(ultimaApuracao.periodoApuracao);
    proximoPeriodo.setMonth(proximoPeriodo.getMonth() + 1);

    const anexoAtual = ultimaApuracao.anexo as AnexoType;

    const projecao = await this.simplesCalculator.projetarProximoMes(
      empresaId,
      this.rbt12Calculator,
      anexoAtual,
      proximoPeriodo
    );

    return {
      proximoPeriodo,
      rbt12Estimado: projecao.rbt12Estimado,
      anexo: anexoAtual,
      faixa: projecao.faixa,
      aliquotaNominal: projecao.aliquotaNominal,
      parcelaDeduzir: projecao.parcelaDeduzir,
      aliquotaEfetivaEstimada: projecao.aliquotaEfetivaEstimada,
      baseCalculo: projecao.baseCalculo,
      observacoes: projecao.observacoes,
    };
  }
}