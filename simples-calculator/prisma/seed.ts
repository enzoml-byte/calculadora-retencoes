import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TAX_RULES_VERSION = '2024.1';

const anexoIIIRules = [
  { anexo: 'III', faixa: 1, limiteInferior: 0, limiteSuperior: 180000, aliquotaNominal: 0.06, parcelaDeduzir: 0 },
  { anexo: 'III', faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000, aliquotaNominal: 0.112, parcelaDeduzir: 9360 },
  { anexo: 'III', faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000, aliquotaNominal: 0.135, parcelaDeduzir: 17640 },
  { anexo: 'III', faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000, aliquotaNominal: 0.16, parcelaDeduzir: 35640 },
  { anexo: 'III', faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000, aliquotaNominal: 0.21, parcelaDeduzir: 125640 },
  { anexo: 'III', faixa: 6, limiteInferior: 3600000.01, limiteSuperior: null, aliquotaNominal: 0.33, parcelaDeduzir: 648000 },
];

const anexoIVRules = [
  { anexo: 'IV', faixa: 1, limiteInferior: 0, limiteSuperior: 180000, aliquotaNominal: 0.045, parcelaDeduzir: 0 },
  { anexo: 'IV', faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000, aliquotaNominal: 0.09, parcelaDeduzir: 8100 },
  { anexo: 'IV', faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000, aliquotaNominal: 0.102, parcelaDeduzir: 12420 },
  { anexo: 'IV', faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000, aliquotaNominal: 0.14, parcelaDeduzir: 39780 },
  { anexo: 'IV', faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000, aliquotaNominal: 0.22, parcelaDeduzir: 183780 },
  { anexo: 'IV', faixa: 6, limiteInferior: 3600000.01, limiteSuperior: null, aliquotaNominal: 0.33, parcelaDeduzir: 828000 },
];

const anexoVRules = [
  { anexo: 'V', faixa: 1, limiteInferior: 0, limiteSuperior: 180000, aliquotaNominal: 0.155, parcelaDeduzir: 0 },
  { anexo: 'V', faixa: 2, limiteInferior: 180000.01, limiteSuperior: 360000, aliquotaNominal: 0.18, parcelaDeduzir: 4500 },
  { anexo: 'V', faixa: 3, limiteInferior: 360000.01, limiteSuperior: 720000, aliquotaNominal: 0.195, parcelaDeduzir: 9900 },
  { anexo: 'V', faixa: 4, limiteInferior: 720000.01, limiteSuperior: 1800000, aliquotaNominal: 0.205, parcelaDeduzir: 17100 },
  { anexo: 'V', faixa: 5, limiteInferior: 1800000.01, limiteSuperior: 3600000, aliquotaNominal: 0.23, parcelaDeduzir: 62100 },
  { anexo: 'V', faixa: 6, limiteInferior: 3600000.01, limiteSuperior: null, aliquotaNominal: 0.305, parcelaDeduzir: 540000 },
];

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  const vigenciaInicio = new Date('2024-01-01');

  const allRules = [
    ...anexoIIIRules,
    ...anexoIVRules,
    ...anexoVRules,
  ];

  for (const rule of allRules) {
    await prisma.taxRule.upsert({
      where: {
        id: `${rule.anexo}-${rule.faixa}-${TAX_RULES_VERSION}`,
      },
      update: {},
      create: {
        id: `${rule.anexo}-${rule.faixa}-${TAX_RULES_VERSION}`,
        anexo: rule.anexo,
        faixa: rule.faixa,
        limiteInferior: rule.limiteInferior,
        limiteSuperior: rule.limiteSuperior,
        aliquotaNominal: rule.aliquotaNominal,
        parcelaDeduzir: rule.parcelaDeduzir,
        vigenciaInicio,
        vigenciaFim: null,
        versao: TAX_RULES_VERSION,
      },
    });
  }

  console.log('✅ Regras tributárias inseridas com sucesso!');
  console.log(`   Anexo III: ${anexoIIIRules.length} faixas`);
  console.log(`   Anexo IV: ${anexoIVRules.length} faixas`);
  console.log(`   Anexo V: ${anexoVRules.length} faixas`);
  console.log(`   Versão: ${TAX_RULES_VERSION}`);
  console.log(`   Vigência: ${vigenciaInicio.toISOString().split('T')[0]} em diante`);

  // Empresas de exemplo
  const empresasExemplo = [
    { razaoSocial: 'Empresa Exemplo Ltda', nomeFantasia: 'Exemplo Serviços', cnpj: '12345678000195' },
    { razaoSocial: 'Consultoria Técnica ME', nomeFantasia: 'Consultoria Técnica', cnpj: '98765432000110' },
  ];

  for (const emp of empresasExemplo) {
    await prisma.empresa.upsert({
      where: { cnpj: emp.cnpj },
      update: {},
      create: emp,
    });
  }

  console.log('✅ Empresas de exemplo criadas!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });