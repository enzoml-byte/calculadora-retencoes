import { auth } from '@/lib/auth'
import { prisma, ConcStatus } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const conciliacoes = await prisma.conciliacao.findMany({
      where: { userId: session.user.id },
      orderBy: { dataLancamento: 'desc' },
      take: 100,
      include: { 
        nota: { 
          select: { 
            id: true, 
            numeroNf: true, 
            serie: true,
            valorBruto: true, 
            retencoes: true,
            emitidaEm: true, 
            empresa: { select: { nomeFantasia: true, razaoSocial: true } } 
          } 
        } 
      },
    })

    // Calculate liquido from retencoes for each nota
    const conciliacoesWithLiquido = conciliacoes.map(c => ({
      ...c,
      nota: c.nota ? (
        {
          ...c.nota,
          liquido: c.nota.retencoes && typeof c.nota.retencoes === 'object' && 'liquido' in c.nota.retencoes
            ? Number(c.nota.retencoes.liquido)
            : Number(c.nota.valorBruto)
        }
      ) : null
    }))

    return NextResponse.json(conciliacoesWithLiquido)
  } catch (error) {
    console.error('Erro ao buscar conciliacoes:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const contaBancaria = formData.get('contaBancaria') as string

    if (!file) return NextResponse.json({ error: 'Arquivo nao enviado' }, { status: 400 })

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
      select: { id: true, numeroNf: true, serie: true, valorBruto: true, retencoes: true, emitidaEm: true },
    })

    const results = []
    for (const lanc of lancamentos) {
      let matchedNota = null
      let status: ConcStatus = 'PENDENTE'

      // Match by valor (liquido or bruto) and date +-2 days
      for (const nota of notas) {
        const liquido = nota.retencoes && typeof nota.retencoes === 'object' && 'liquido' in nota.retencoes
          ? Number(nota.retencoes.liquido)
          : Number(nota.valorBruto)
        
        const valorMatch = Math.abs(liquido - lanc.valor) <= 0.01 || 
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
    console.error('Erro na conciliacao:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}