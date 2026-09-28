export interface Especime {
  id: string
  numero: number
  titulo: string
  campo: string
  tags: string[]
  conteudo: string
  data: string
  atualizadoEm?: string
}

export type SortMode = 'recent' | 'oldest' | 'az'

export interface Scored {
  entry: Especime
  score: number
}

export interface EntryDraft {
  titulo: string
  campo: string
  tags: string[]
  conteudo: string
}
