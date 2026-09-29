import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notaCreateSchema } from '@/lib/validators'
import { calculateRetencao } from '@/lib/calculations'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const notas = await prisma.nota.findMany({
      where: { empresa: { userId: session.user.id } },
      orderBy: { emitidaEm: 'desc' },
      take: 50,
      include: { empresa: { select: { id: true, nomeFantasia: true, razaoSocial: true, cnpj: true } } },
    })

    return NextResponse.json(notas)
  } catch (error) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = notaCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const data = parsed.data
    const empresa = await prisma.empresa.findFirst({
      where: { id: data.empresaId, userId: session.user.id },
    })
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const regime = data.regime
    const isHospitalar = regime === 'PRESUMIDO_HOSPITALAR'
    const anexo = empresa.anexo ?? undefined
    const rbt12 = empresa.rbt12 ? Number(empresa.rbt12) : undefined

    const result = calculateRetencao({
      regime,
      isHospitalar,
      valorBruto: data.valorBruto,
      issRetido: data.issRetido,
      informaIbsCbs: data.informaIbsCbs,
      ibsPerc: data.ibsPerc,
      cbsPerc: data.cbsPerc,
      anexo,
      rbt12,
    })

    // Generate sequential number per empresa
    const lastNota = await prisma.nota.findFirst({
      where: { empresaId: data.empresaId },
      orderBy: { emitidaEm: 'desc' },
      select: { numeroNf: true },
    })
    const nextNumber = lastNota?.numeroNf ? String(parseInt(lastNota.numeroNf) + 1).padStart(6, '0') : '000001'

    const nota = await prisma.nota.create({
      data: {
        empresaId: data.empresaId,
        userId: session.user.id,
        numeroNf: nextNumber,
        serie: data.serie || '1',
        valorBruto: data.valorBruto,
        regime,
        retencoes: {
          ir: result.ir,
          pis: result.pis,
          cofins: result.cofins,
          csll: result.csll,
          totalFederal: result.totalFederal,
          iss: result.iss,
          totalGeral: result.totalGeral,
          liquido: result.liquido,
          ibs: result.ibs,
          cbs: result.cbs,
        },
        aliquotaEfetivaSimples: result.aliquotaEfetivaSimples,
        dasSimples: result.dasSimples,
      },
    })

    return NextResponse.json(nota, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar nota:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}