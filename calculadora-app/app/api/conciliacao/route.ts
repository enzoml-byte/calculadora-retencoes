import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const conciliacoes = await prisma.conciliacao.findMany({
      where: { userId: session.user.id },
      orderBy: { dataLancamento: 'desc' },
      take: 100,
      include: { nota: { select: { id: true, numeroNf: true, valorBruto: true, liquido: true, empresa: { select: { nomeFantasia: true } } } } },
    })

    return NextResponse.json(conciliacoes)
  } catch (error) {
    console.error('Erro ao buscar conciliações:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const contaBancaria = formData.get('contaBancaria') as string

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())

    // Simple OFX/CSV parser - in production use proper parser
    const lancamentos: Array<{ data: Date; valor: number; descricao: string }> = []

    for (const line of lines) {
      // Try CSV format: data,valor,descricao
      const parts = line.split(/[;,]/).map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 3) {
        const data = new Date(parts[0])
        const valor = parseFloat(parts[1].replace(',', '.'))
        const descricao = parts.slice(2).join(' ')
        if (!isNaN(data.getTime()) && !isNaN(valor)) {
          lancamentos.push({ data, valor, descricao })
        }
      }
    }

    // Auto-match with notas
    const notas = await prisma.nota.findMany({
      where: { empresa: { userId: session.user.id } },
      select: { id: true, numeroNf: true, valorBruto: true, liquido: true, emitidaEm: true },
    })

    const results = []
    for (const lanc of lancamentos) {
      let matchedNota = null
      let status = 'PENDENTE'

      // Match by valor (liquido or bruto) and date ±2 days
      for (const nota of notas) {
        const valorMatch = Math.abs(nota.liquido - lanc.valor) <= 0.01 || 
                          Math.abs(Number(nota.valorBruto) - lanc.valor) <= 0.01
        const dateMatch = Math.abs(nota.emitidaEm.getTime() - lanc.data.getTime()) <= 2 * 24 * 60 * 60 * 1000

        if (valorMatch && dateMatch) {
          matchedNota = nota.id
          status = 'CONCILIADO'
          break
        }
      }

      const conc = await prisma.conciliacao.create({
        data: {
          notaId: matchedNota,
          userId: session.user.id,
          contaBancaria,
          dataLancamento: lanc.data,
          valor: lanc.valor,
          descricao: lanc.descricao,
          status,
        },
      })
      results.push(conc)
    }

    return NextResponse.json({ created: results.length, conciliacoes: results })
  } catch (error) {
    console.error('Erro na conciliação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}