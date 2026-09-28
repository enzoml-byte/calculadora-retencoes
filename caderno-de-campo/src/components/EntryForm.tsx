import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { EntryDraft, Especime } from '../types'
import { useWebSpeech } from '../hooks/useWebSpeech'
import { useVosk } from '../hooks/useVosk'
import { Icon } from './Icons'

const PRESET_CAMPOS = ['Trabalho', 'Hobby']

interface EntryFormProps {
  editing: Especime | null
  defaultCampo: string
  onClose: () => void
  onSubmit: (draft: EntryDraft) => void
}

function chipActiveClass(opt: string): string {
  const k = opt.toLowerCase()
  if (k === 'trabalho') return 'active-trabalho'
  if (k === 'hobby') return 'active-hobby'
  return ''
}

export function EntryForm({ editing, defaultCampo, onClose, onSubmit }: EntryFormProps) {
  const [titulo, setTitulo] = useState(editing?.titulo ?? '')
  const [campo, setCampo] = useState(editing?.campo ?? defaultCampo)
  const [customCampo, setCustomCampo] = useState(
    editing && !PRESET_CAMPOS.includes(editing.campo) ? editing.campo : '',
  )
  const [conteudo, setConteudo] = useState(editing?.conteudo ?? '')
  const [tags, setTags] = useState(editing ? editing.tags.join(', ') : '')
  const tituloRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    tituloRef.current?.focus()
  }, [])

  const appendConteudo = (text: string) => {
    setConteudo((current) => {
      const sep = current && !/\s$/.test(current) ? ' ' : ''
      return current + sep + text + ' '
    })
  }

  const web = useWebSpeech(appendConteudo)
  const vosk = useVosk(appendConteudo)

  const effectiveCampo = customCampo.trim() || campo

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const cleanTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const seen = new Set<string>()
    const uniqueTags = cleanTags.filter((t) => {
      const k = t.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    onSubmit({
      titulo: titulo.trim(),
      campo: effectiveCampo.trim() || 'Trabalho',
      tags: uniqueTags,
      conteudo: conteudo.trim(),
    })
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2 className="campo-display">{editing ? 'Editar registro' : 'Novo registro'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="field-row">
          {PRESET_CAMPOS.map((opt) => {
            const active = customCampo.trim() ? campo === opt && !customCampo.trim() : campo === opt
            return (
              <button
                type="button"
                key={opt}
                className={'field-chip mono' + (active ? ' ' + chipActiveClass(opt) : '')}
                onClick={() => {
                  setCampo(opt)
                  setCustomCampo('')
                }}
              >
                {opt}
              </button>
            )
          })}
          <input
            className="field-custom mono"
            value={customCampo}
            onChange={(e) => setCustomCampo(e.target.value)}
            placeholder="ou crie um campo próprio"
            aria-label="Campo personalizado"
          />
        </div>

        <input
          ref={tituloRef}
          required
          className="input titulo-input campo-display"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do registro"
        />

        <div className="textarea-wrap">
          <textarea
            required
            rows={6}
            className="input"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="O que você aprendeu ou quer guardar? Markdown é suportado."
          />
          <div className="mic-cluster">
            <button
              type="button"
              className={'mic-btn' + (web.recording ? ' recording' : '')}
              disabled={!web.supported}
              title={
                web.supported
                  ? web.recording
                    ? 'Parar ditado'
                    : 'Ditar por voz (online)'
                  : 'Ditado por voz não suportado neste navegador (use Chrome ou Edge)'
              }
              aria-label="Ditar por voz online"
              onClick={web.toggle}
            >
              <Icon name="mic" size={14} />
            </button>
            <button
              type="button"
              className={'mic-btn vosk' + (vosk.recording ? ' recording' : '')}
              disabled={!vosk.supported || vosk.busy}
              title={
                vosk.supported
                  ? vosk.recording
                    ? 'Parar transcrição offline'
                    : 'Transcrever por voz (offline, Vosk)'
                  : 'Transcrição offline não suportada neste navegador'
              }
              aria-label="Transcrever por voz offline"
              onClick={vosk.toggle}
            >
              <Icon name="mic" size={14} />
            </button>
          </div>
        </div>
        <p className="voice-hint">
          <Icon name="mic" size={10} /> online (Chrome/Edge, precisa de internet)
          <span aria-hidden="true">·</span>
          <span className="vosk-hint">
            <Icon name="mic" size={10} />
          </span>{' '}
          offline (Vosk, baixa ~31 MB só na 1ª vez)
        </p>

        <input
          className="input tags-input mono"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags separadas por vírgula (ex: python, xadrez)"
        />

        <div className="form-actions">
          <button type="button" className="btn-text" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-dark">
            {editing ? 'Salvar alterações' : 'Salvar registro'}
          </button>
        </div>
      </form>
    </div>
  )
}
