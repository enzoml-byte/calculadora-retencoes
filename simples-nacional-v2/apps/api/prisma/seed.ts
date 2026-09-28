import { PrismaClient } from "@prisma/client";
import { TAX_RULES } from "@v2/tax-rules";

/** Seed idempotente: so regras tributarias. Empresas de exemplo, nao. */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const r of TAX_RULES) {
      await prisma.taxRule.upsert({
        where: { anexo_faixa_versao: { anexo: r.anexo, faixa: r.faixa, versao: r.versao } },
        update: {
          limiteInferior: r.limiteInferior,
          limiteSuperior: r.limiteSuperior,
          aliquotaNominal: r.aliquotaNominal,
          parcelaDeduzir: r.parcelaDeduzir,
          vigenciaInicio: new Date(r.vigenciaInicio),
          vigenciaFim: r.vigenciaFim ? new Date(r.vigenciaFim) : null,
        },
        create: {
          anexo: r.anexo,
          faixa: r.faixa,
          limiteInferior: r.limiteInferior,
          limiteSuperior: r.limiteSuperior,
          aliquotaNominal: r.aliquotaNominal,
          parcelaDeduzir: r.parcelaDeduzir,
          vigenciaInicio: new Date(r.vigenciaInicio),
          vigenciaFim: r.vigenciaFim ? new Date(r.vigenciaFim) : null,
          versao: r.versao,
        },
      });
    }
    console.log(`seed ok: ${TAX_RULES.length} regras`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
