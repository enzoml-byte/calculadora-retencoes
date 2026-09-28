import { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Especime } from '../types'
import { highlightParts } from '../lib/text'
import { fmtDate } from '../lib/date'
import { Icon } from './Icons'

interface EntryCardProps {
  esp: Especime
  terms: string[]
  confirmingDelete: boolean
  index: number
  onEdit: () => void
  onAskDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onSelectTag: (tag: string) => void
}

function badgeClass(campo: string): string {
  const k = (campo || '').toLowerCase()
  if (k === 'trabalho') return ' badge-trabalho'
  if (k === 'hobby') return ' badge-hobby'
  return ''
}

export function EntryCard(props: EntryCardProps) {
  const {
    esp,
    terms,
    confirmingDelete,
    index,
    onEdit,
    onAskDelete,
    onConfirmDelete,
    onCancelDelete,
    onSelectTag,
  } = props
  const [expanded, setExpanded] = useState(false)
  const longBody = esp.conteudo.length > 320
  const titleParts = highlightParts(esp.titulo, terms)

  return (
    <article className="card" style={{ animationDelay: Math.min(index * 35, 350) + 'ms' }}>
      <div className="card-top">
        <div className="card-meta">
          <span className="num mono">nº {String(esp.numero || 0).padStart(3, '0')}</span>
          <span className={'field-badge mono' + badgeClass(esp.campo)}>{esp.campo}</span>
        </div>
        {confirmingDelete ? (
          <div className="del-confirm">
            <span>Excluir?</span>
            <button className="yes" onClick={onConfirmDelete}>
              Sim
            </button>
            <button className="no" onClick={onCancelDelete}>
              Não
            </button>
          </div>
        ) : (
          <div className="card-actions">
            <button className="icon-btn" onClick={onEdit} aria-label="Editar registro" title="Editar">
              <Icon name="edit" size={14} />
            </button>
            <button className="icon-btn" onClick={onAskDelete} aria-label="Excluir registro" title="Excluir">
              <Icon name="trash" size={14} />
            </button>
          </div>
        )}
      </div>

      <h2 className="card-title campo-display">
        {titleParts.map((p, i) =>
          p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>,
        )}
      </h2>

      <div className={'md card-body' + (longBody && !expanded ? ' clamped' : '')}>
        <Markdown remarkPlugins={[remarkGfm]}>{esp.conteudo}</Markdown>
      </div>
      {longBody && (
        <button className="read-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Mostrar menos' : 'Ler mais'}
        </button>
      )}

      {esp.tags.length > 0 && (
        <div className="card-tags">
          {esp.tags.map((t) => (
            <button key={t} className="card-tag mono" onClick={() => onSelectTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="card-date mono" title={esp.atualizadoEm ? `Criado: ${fmtDate(esp.data, 'datetime')}\nEditado: ${fmtDate(esp.atualizadoEm, 'datetime')}` : `Criado: ${fmtDate(esp.data, 'datetime')}`}>
        {fmtDate(esp.data, 'datetime')}
        {esp.atualizadoEm ? ' · editado em ' + fmtDate(esp.atualizadoEm, 'datetime') : ''}
      </div>
    </article>
  )
}
