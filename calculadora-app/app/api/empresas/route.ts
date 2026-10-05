import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { empresaCreateSchema, empresaUpdateSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { lookupCNPJ } from '@/lib/cnpj'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const empresas = await prisma.empresa.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { notas: true } } },
    })

    return NextResponse.json(empresas)
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = empresaCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const data = parsed.data
    const cleanCnpj = data.cnpj.replace(/\D/g, '')

    // Check if CNPJ already exists for this user
    const existing = await prisma.empresa.findFirst({
      where: { cnpj: cleanCnpj, userId: session.user.id },
    })
    if (existing) {
      return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 })
    }

    // Fetch CNPJ data if provided
    let cnpjData: any = null
    try {
      cnpjData = await lookupCNPJ(cleanCnpj)
    } catch (e) {
      // CNPJ lookup failed, continue without it
    }

    const empresa = await prisma.empresa.create({
      data: {
        userId: session.user.id,
        cnpj: cleanCnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        regime: data.regime,
        anexo: data.anexo,
        rbt12: data.rbt12,
        issRetido: data.issRetido,
        informaIbsCbs: data.informaIbsCbs,
        dadosCnpj: cnpjData as any,
      },
    })

    return NextResponse.json(empresa, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    // CNPJ é único global no banco: outro usuário pode já tê-lo cadastrado
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'CNPJ já cadastrado no sistema' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}