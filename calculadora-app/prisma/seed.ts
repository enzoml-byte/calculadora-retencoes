import { PrismaClient, Role, Regime, IssRetido } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@excellence.com.br' },
    update: {},
    create: {
      email: 'admin@excellence.com.br',
      name: 'Administrador Excellence',
      passwordHash,
      role: Role.ADMIN,
    },
  })

  console.log('✅ Usuário admin criado:', admin.email)

  // Create sample user
  const userPasswordHash = await bcrypt.hash('user123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'user@excellence.com.br' },
    update: {},
    create: {
      email: 'user@excellence.com.br',
      name: 'Usuário Teste',
      passwordHash: userPasswordHash,
      role: Role.USER,
    },
  })

  console.log('✅ Usuário teste criado:', user.email)

  // Create sample empresas for admin
  const empresas = [
    {
      userId: admin.id,
      cnpj: '11222333000181',
      razaoSocial: 'Padaria Pão Bom LTDA',
      nomeFantasia: 'Padaria Pão Bom',
      regime: Regime.SIMPLES,
      anexo: 'III',
      rbt12: 250000,
      issRetido: IssRetido.PERGUNTAR,
      informaIbsCbs: false,
    },
    {
      userId: admin.id,
      cnpj: '04252011000110',
      razaoSocial: 'Consultoria Alfa Serviços LTDA',
      nomeFantasia: 'Consultoria Alfa',
      regime: Regime.PRESUMIDO_GERAL,
      anexo: null,
      rbt12: null,
      issRetido: IssRetido.SEMPRE,
      informaIbsCbs: true,
    },
    {
      userId: admin.id,
      cnpj: '11024591000173',
      razaoSocial: 'Clínica Vida Saúde LTDA',
      nomeFantasia: 'Clínica Vida',
      regime: Regime.PRESUMIDO_HOSPITALAR,
      anexo: null,
      rbt12: null,
      issRetido: IssRetido.SEMPRE,
      informaIbsCbs: true,
    },
  ]

  for (const emp of empresas) {
    const existing = await prisma.empresa.findFirst({
      where: { cnpj: emp.cnpj, userId: admin.id },
    })

    if (!existing) {
      await prisma.empresa.create({ data: emp })
      console.log(`✅ Empresa criada: ${emp.nomeFantasia}`)
    }
  }

  // Create sample empresas for user
  const userEmpresas = [
    {
      userId: user.id,
      cnpj: '11333444000199',
      razaoSocial: 'Escritório Contábil Beta LTDA',
      nomeFantasia: 'Contábil Beta',
      regime: Regime.SIMPLES,
      anexo: 'III',
      rbt12: 180000,
      issRetido: IssRetido.SEMPRE,
      informaIbsCbs: false,
    },
    {
      userId: user.id,
      cnpj: '22333444000188',
      razaoSocial: 'TI Solutions Desenvolvimento LTDA',
      nomeFantasia: 'TI Solutions',
      regime: Regime.PRESUMIDO_GERAL,
      anexo: null,
      rbt12: null,
      issRetido: IssRetido.SEMPRE,
      informaIbsCbs: true,
    },
  ]

  for (const emp of userEmpresas) {
    const existing = await prisma.empresa.findFirst({
      where: { cnpj: emp.cnpj, userId: user.id },
    })

    if (!existing) {
      await prisma.empresa.create({ data: emp })
      console.log(`✅ Empresa criada para usuário: ${emp.nomeFantasia}`)
    }
  }

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })