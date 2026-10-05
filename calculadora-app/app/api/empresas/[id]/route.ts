import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { empresaUpdateSchema } from '@/lib/validators'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { lookupCNPJ } from '@/lib/cnpj'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const empresa = await prisma.empresa.findFirst({
      where: { id, userId: session.user.id },
      include: { notas: { orderBy: { emitidaEm: 'desc' }, take: 10 } },
    })

    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    return NextResponse.json(empresa)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = empresaUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const empresa = await prisma.empresa.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const data = parsed.data
    let cnpjData = empresa.dadosCnpj

    if (data.cnpj && data.cnpj !== empresa.cnpj) {
      const cleanCnpj = data.cnpj.replace(/\D/g, '')
      const existing = await prisma.empresa.findFirst({
        where: { cnpj: cleanCnpj, userId: session.user.id, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 400 })
      }

      try {
        cnpjData = await lookupCNPJ(cleanCnpj) as any
      } catch (e) {
        // Keep existing CNPJ data if lookup fails
        cnpjData = null
      }
    }

    const updated = await prisma.empresa.update({
      where: { id },
      data: {
        cnpj: data.cnpj ? data.cnpj.replace(/\D/g, '') : undefined,
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'CNPJ já cadastrado no sistema' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const empresa = await prisma.empresa.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    await prisma.empresa.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir empresa:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}