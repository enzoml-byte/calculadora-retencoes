import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { lookupCNPJ } from '@/lib/cnpj'

interface RouteParams {
  params: Promise<{ cnpj: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { cnpj } = await params
    const clean = cnpj.replace(/\D/g, '')

    if (clean.length !== 14) {
      return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
    }

    const data = await lookupCNPJ(clean)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erro ao consultar CNPJ:', error)
    return NextResponse.json({ error: error.message || 'Erro ao consultar CNPJ' }, { status: 500 })
  }
}