import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { EmpresaService, ApuracaoService, ImportService } from '../services';
import { RBT12Calculator, SimplesCalculator, TaxRuleRepository } from '../calculation';
import { PDFParser } from '../pdf-parser';
import { JsonParser } from '../json-parser';
import { AnexoType } from '@simples/shared';

const prisma = new PrismaClient();
const taxRuleRepo = new TaxRuleRepository(prisma);
const rbt12Calculator = new RBT12Calculator(prisma);
const simplesCalculator = new SimplesCalculator(taxRuleRepo);
const pdfParser = new PDFParser();
const jsonParser = new JsonParser();
const empresaService = new EmpresaService(prisma);
const apuracaoService = new ApuracaoService(prisma, rbt12Calculator, simplesCalculator, taxRuleRepo);
const importService = new ImportService(prisma, pdfParser, jsonParser, empresaService, apuracaoService, rbt12Calculator, simplesCalculator, taxRuleRepo);

const createEmpresaSchema = z.object({
  razaoSocial: z.string().min(2),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().min(14).max(18),
});

const updateEmpresaSchema = z.object({
  razaoSocial: z.string().min(2).optional(),
  nomeFantasia: z.string().optional(),
  ativo: z.boolean().optional(),
});

const createApuracaoSchema = z.object({
  empresaId: z.string().cuid(),
  periodoApuracao: z.string().datetime(),
  receitaBrutaMes: z.number().positive(),
  rbt12InformadoPgdas: z.number().positive().optional().nullable(),
  anexo: z.enum(['III', 'IV', 'V']),
  arquivoOriginal: z.string().optional(),
  observacoes: z.string().optional(),
});

const retificarApuracaoSchema = z.object({
  receitaBrutaMes: z.number().positive().optional(),
  rbt12InformadoPgdas: z.number().positive().optional().nullable(),
  anexo: z.enum(['III', 'IV', 'V']).optional(),
  observacoes: z.string().optional(),
});

const confirmImportSchema = z.object({
  empresaId: z.string().min(1),
  periodoApuracao: z.string().datetime(),
  receitaBrutaMes: z.number().positive(),
  rbt12InformadoPgdas: z.number().positive().optional().nullable(),
  anexo: z.enum(['III', 'IV', 'V']),
  arquivoOriginal: z.string(),
  observacoes: z.string().optional(),
});

const previewJsonSchema = z.object({
  empresaId: z.string().min(1),
  dados: z.record(z.unknown()),
  arquivoOriginal: z.string().optional(),
});

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // Empresas
  app.get('/api/empresas', async () => {
    const empresas = await empresaService.findAll();
    return empresas.map(e => ({
      id: e.id,
      razaoSocial: e.razaoSocial,
      nomeFantasia: e.nomeFantasia,
      cnpj: e.cnpj,
      dataCadastro: e.dataCadastro,
      ativo: e.ativo,
      _count: { apuracoes: (e as any)._count?.apuracoes || 0 },
      ultimaApuracao: (e as any).apuracoes?.[0]?.periodoApuracao || null,
    }));
  });

  app.post('/api/empresas', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = createEmpresaSchema.parse(request.body);
    try {
      const empresa = await empresaService.create(data);
      return reply.status(201).send(empresa);
    } catch (error) {
      if ((error as any).code === 'P2002') {
        return reply.status(409).send({ error: 'CNPJ já cadastrado' });
      }
      throw error;
    }
  });

  app.get('/api/empresas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const empresa = await empresaService.findById(id);
    if (!empresa) return reply.status(404).send({ error: 'Empresa não encontrada' });
    return empresa;
  });

  app.put('/api/empresas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const data = updateEmpresaSchema.parse(request.body);
    try {
      const empresa = await empresaService.update(id, data);
      return empresa;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.status(404).send({ error: 'Empresa não encontrada' });
      }
      throw error;
    }
  });

  app.delete('/api/empresas/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    try {
      await empresaService.delete(id);
      return reply.status(204).send();
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.status(404).send({ error: 'Empresa não encontrada' });
      }
      throw error;
    }
  });

  // Dashboard da empresa
  app.get('/api/empresas/:id/dashboard', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const dashboard = await empresaService.getDashboardData(id);
    if (!dashboard) return reply.status(404).send({ error: 'Empresa não encontrada' });
    return dashboard;
  });

  // Apurações
  app.get('/api/empresas/:id/apuracoes', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const { id } = request.params;
    return apuracaoService.findByEmpresa(id);
  });

  app.post('/api/apuracoes', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = createApuracaoSchema.parse(request.body);
    try {
      const apuracao = await apuracaoService.create({
        ...data,
        periodoApuracao: new Date(data.periodoApuracao),
      });
      return reply.status(201).send(apuracao);
    } catch (error) {
      if ((error as Error).message.includes('Já existe')) {
        return reply.status(409).send({ error: (error as Error).message });
      }
      throw error;
    }
  });

  app.get('/api/apuracoes/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const apuracao = await apuracaoService.findById(id);
    if (!apuracao) return reply.status(404).send({ error: 'Apuração não encontrada' });
    return apuracao;
  });

  app.post('/api/apuracoes/:id/retificar', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const data = retificarApuracaoSchema.parse(request.body);
    try {
      const apuracao = await apuracaoService.retificar(id, data);
      return apuracao;
    } catch (error) {
      if ((error as Error).message.includes('não encontrada')) {
        return reply.status(404).send({ error: (error as Error).message });
      }
      throw error;
    }
  });

  app.delete('/api/apuracoes/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    try {
      await apuracaoService.delete(id);
      return reply.status(204).send();
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.status(404).send({ error: 'Apuração não encontrada' });
      }
      throw error;
    }
  });

  // Importação de PDF ou JSON (arquivo)
  app.post<{ Body: FormData }>('/api/import/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Arquivo PDF ou JSON não enviado' });
    }

    const empresaIdField = (request as unknown as { fields?: Record<string, unknown> }).fields?.empresaId
      ?? (data.fields as unknown as { empresaId?: { value?: string } })?.empresaId?.value
      ?? (request.query as Record<string, string | undefined>)?.empresaId;
    const empresaId = typeof empresaIdField === 'string' ? empresaIdField : String((empresaIdField as { value?: string })?.value ?? empresaIdField ?? '');
    if (!empresaId) {
      return reply.status(400).send({ error: 'empresaId é obrigatório' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > 10 * 1024 * 1024) {
      return reply.status(413).send({ error: 'Arquivo muito grande (máx. 10MB)' });
    }

    const filename = data.filename.toLowerCase();

    try {
      if (filename.endsWith('.json')) {
        const preview = await importService.previewJson(empresaId, JSON.parse(buffer.toString('utf-8')), data.filename);
        return preview;
      }
      if (filename.endsWith('.pdf')) {
        const preview = await importService.previewImport(empresaId, buffer, data.filename);
        return preview;
      }
      return reply.status(400).send({ error: 'Apenas arquivos PDF ou JSON são aceitos' });
    } catch (error) {
      return reply.status(500).send({ error: `Erro ao processar arquivo: ${(error as Error).message}` });
    }
  });

  // Importação via JSON colado (saída do Gemini)
  app.post('/api/import/preview-json', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = previewJsonSchema.parse(request.body);
      const preview = await importService.previewJson(
        parsed.empresaId,
        parsed.dados,
        parsed.arquivoOriginal ?? 'transcricao-gemini.json'
      );
      return preview;
    } catch (error) {
      if ((error as Error).name === 'ZodError') {
        return reply.status(400).send({ error: 'Body inválido: esperado { empresaId, dados: {...} }' });
      }
      return reply.status(500).send({ error: `Erro ao processar JSON: ${(error as Error).message}` });
    }
  });

  // Recalcular preview com RBT12 escolhido (PGDAS vs sistema)
  app.post('/api/import/recalculate', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      receitaBrutaMes: z.number().positive(),
      rbt12Usado: z.number().positive(),
      anexo: z.enum(['III', 'IV', 'V']),
      periodoApuracao: z.string().datetime(),
    });
    try {
      const parsed = schema.parse(request.body);
      const calculo = await simplesCalculator.calcularAliquotaEfetiva(
        parsed.rbt12Usado,
        parsed.receitaBrutaMes,
        parsed.anexo,
        new Date(parsed.periodoApuracao)
      );
      return calculo;
    } catch (error) {
      return reply.status(400).send({ error: `Erro no recálculo: ${(error as Error).message}` });
    }
  });

  app.post('/api/import/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = confirmImportSchema.parse(request.body);
    try {
      const apuracao = await importService.confirmImport(data.empresaId, {
        ...data,
        periodoApuracao: new Date(data.periodoApuracao),
      });
      return reply.status(201).send(apuracao);
    } catch (error) {
      if ((error as Error).message.includes('Já existe')) {
        return reply.status(409).send({ error: (error as Error).message });
      }
      throw error;
    }
  });

  // Projeção próximo mês
  app.get('/api/empresas/:id/projecao', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    try {
      const projecao = await importService.projetarProximoMes(id);
      return projecao;
    } catch (error) {
      if ((error as Error).message.includes('não encontrada') || (error as Error).message.includes('sem apurações')) {
        return reply.status(404).send({ error: (error as Error).message });
      }
      throw error;
    }
  });

  // Regras tributárias
  app.get('/api/tax-rules', async () => {
    return taxRuleRepo.getAllRules();
  });

  app.get('/api/tax-rules/:anexo', async (request: FastifyRequest<{ Params: { anexo: AnexoType } }>) => {
    const { anexo } = request.params;
    const rules = await taxRuleRepo.findByAnexoAndDate(anexo, new Date());
    return rules;
  });
}